import { NextResponse } from "next/server";
import { after } from "next/server";
import { and, eq, inArray } from "drizzle-orm";

import {
  readWebsiteImageManifest,
  updateLocalizedImageRole,
} from "@/lib/assets/localize";
import { buildImagePlacementPrompt } from "@/lib/assets/placement";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { checkDailyEditQuota } from "@/lib/edits/quota";
import {
  getOwnedWebsite,
  toWebsiteResponse,
  userHasProPlan,
} from "@/lib/websites/service";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ websiteId: string; imageId: string }>;
}

const { editRequests, websites } = schema;

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to place images" }, { status: 401 });
  }

  const { websiteId, imageId } = await context.params;
  const website = await getOwnedWebsite({ websiteId, userId: user.id });

  if (!website) {
    return NextResponse.json({ error: "Website not found" }, { status: 404 });
  }

  let body: { placement?: string; role?: string; note?: string };

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const placement = body.placement?.trim() || "header_logo";
  const role = body.role === "logo" ? "logo" : "image";
  const note = body.note?.trim() || null;

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
      { error: "You've used your 3 free changes. Go Pro (£10/month) for unlimited changes." },
      { status: 402 },
    );
  }

  const dailyQuota = await checkDailyEditQuota(user.id);
  if (!dailyQuota.ok) {
    return NextResponse.json(
      { error: dailyQuota.message },
      { status: dailyQuota.status },
    );
  }

  const db = getDb();
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

  try {
    const manifest = await readWebsiteImageManifest(website.slug);
    const image = manifest?.images.find((entry) => entry.id === imageId);

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const updatedImage =
      image.role === role
        ? image
        : await updateLocalizedImageRole({
            slug: website.slug,
            imageId,
            role,
          });

    const [editRequest] = await db
      .insert(editRequests)
      .values({
        websiteId: website.id,
        userId: user.id,
        prompt: buildImagePlacementPrompt({
          assets: [updatedImage],
          placement,
          note:
            note ??
            (placement === "header_logo"
              ? "Use this as the header logo or brand mark. Keep the business name as real HTML text if the mark has no readable text."
              : null),
        }),
        status: "queued",
      })
      .returning();

    const [updatedWebsite] = await db
      .update(websites)
      .set({
        freeEditsUsed: hasPro ? website.freeEditsUsed : website.freeEditsUsed + 1,
        updatedAt: new Date(),
      })
      .where(eq(websites.id, website.id))
      .returning();

    after(async () => {
      try {
        const { processEditRequest } = await import("@/lib/edits/processor");
        await processEditRequest(editRequest.id);
      } catch (error) {
        console.error(
          `[refresh-kiwi] failed to start image placement edit ${editRequest.id}`,
          error,
        );
      }
    });

    return NextResponse.json({
      image: updatedImage,
      editRequest,
      queued: true,
      website: toWebsiteResponse(updatedWebsite),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to place image";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
