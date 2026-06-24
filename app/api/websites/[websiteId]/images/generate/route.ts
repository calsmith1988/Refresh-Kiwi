import { NextResponse } from "next/server";
import { after } from "next/server";
import { and, eq, inArray } from "drizzle-orm";

import { generateWebsiteImage } from "@/lib/assets/generate";
import { appendLocalizedImages } from "@/lib/assets/localize";
import { optimizeImage } from "@/lib/assets/optimize";
import { buildImagePlacementPrompt } from "@/lib/assets/placement";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import {
  getOwnedWebsite,
  toWebsiteResponse,
  userHasProPlan,
} from "@/lib/websites/service";

export const runtime = "nodejs";
export const maxDuration = 180;

interface RouteContext {
  params: Promise<{ websiteId: string }>;
}

const { editRequests, websites } = schema;

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in to generate images" },
      { status: 401 },
    );
  }

  const { websiteId } = await context.params;
  const website = await getOwnedWebsite({ websiteId, userId: user.id });

  if (!website) {
    return NextResponse.json({ error: "Website not found" }, { status: 404 });
  }

  let body: {
    prompt?: string;
    role?: string;
    placement?: string;
    note?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Tell us what image to generate" },
      { status: 400 },
    );
  }

  const prompt = body.prompt?.trim() ?? "";
  const role = body.role === "logo" ? "logo" : "image";
  const placement = body.placement?.trim() || "auto";
  const shouldPlace = placement !== "library";
  const note = body.note?.trim() || null;

  if (prompt.length < 10) {
    return NextResponse.json(
      { error: "Describe the image you want in a little more detail" },
      { status: 400 },
    );
  }

  if (prompt.length > 1_000) {
    return NextResponse.json(
      { error: "Keep the image prompt under 1,000 characters" },
      { status: 400 },
    );
  }

  if (note && note.length > 500) {
    return NextResponse.json(
      { error: "Keep the placement note under 500 characters" },
      { status: 400 },
    );
  }

  const hasPro = await userHasProPlan(user.id);
  const isExpiredPreview =
    website.status === "expired" ||
    (!hasPro && website.status !== "live" && website.expiresAt.getTime() <= Date.now());

  if (website.status === "archived") {
    return NextResponse.json(
      { error: "Archived websites cannot be changed." },
      { status: 400 },
    );
  }

  if (isExpiredPreview) {
    return NextResponse.json(
      { error: "This free preview has ended. Go Pro (£10/month) to bring it back and keep making changes." },
      { status: 402 },
    );
  }

  const freeEditsRemaining = Math.max(
    0,
    website.freeEditsLimit - website.freeEditsUsed,
  );

  if (!hasPro && freeEditsRemaining <= 0) {
    return NextResponse.json(
      { error: "You've used your 3 free changes. Go Pro (£10/month) for unlimited AI images and changes." },
      { status: 402 },
    );
  }

  const db = getDb();

  if (shouldPlace) {
    const [activeEdit] = await db
      .select({ id: editRequests.id })
      .from(editRequests)
      .where(
        and(
          eq(editRequests.websiteId, website.id),
          inArray(editRequests.status, ["queued", "running"]),
        ),
      )
      .limit(1);

    if (activeEdit) {
      return NextResponse.json(
        { error: "We're still making your last change — it'll be done in a minute or two, then you can add the next one." },
        { status: 409 },
      );
    }
  }

  try {
    const generated = await generateWebsiteImage({
      prompt,
      role,
      brandName: website.brandName,
    });
    const optimized = await optimizeImage(generated.buffer, generated.contentType);
    const [image] = await appendLocalizedImages({
      slug: website.slug,
      assets: [
        {
          buffer: optimized.buffer,
          contentType: optimized.contentType,
          role,
          source: "generated",
        },
      ],
    });

    if (!image) {
      throw new Error("The generated image could not be saved");
    }

    let editRequest: typeof editRequests.$inferSelect | null = null;

    if (shouldPlace) {
      const [createdEdit] = await db
        .insert(editRequests)
        .values({
          websiteId: website.id,
          userId: user.id,
          prompt: buildImagePlacementPrompt({
            assets: [image],
            placement,
            note:
              note ??
              `Generated from this user prompt: ${prompt}. Use it where it best improves the site.`,
          }),
          status: "queued",
        })
        .returning();

      editRequest = createdEdit;

      after(async () => {
        try {
          const { processEditRequest } = await import("@/lib/edits/processor");
          await processEditRequest(createdEdit.id);
        } catch (error) {
          console.error(
            `[refresh-kiwi] failed to start generated image placement edit ${createdEdit.id}`,
            error,
          );
        }
      });
    }

    const [updatedWebsite] = await db
      .update(websites)
      .set({
        freeEditsUsed: hasPro ? website.freeEditsUsed : website.freeEditsUsed + 1,
        updatedAt: new Date(),
      })
      .where(eq(websites.id, website.id))
      .returning();

    return NextResponse.json({
      image,
      images: image ? [image] : [],
      editRequest,
      queued: Boolean(editRequest),
      website: toWebsiteResponse(updatedWebsite),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate image";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
