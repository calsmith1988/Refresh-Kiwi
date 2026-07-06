import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";

import {
  appendLocalizedImages,
  isSupportedImageType,
  MAX_IMAGES_PER_UPLOAD,
  MAX_UPLOAD_BYTES,
  readWebsiteImageManifest,
} from "@/lib/assets/localize";
import { optimizeImage } from "@/lib/assets/optimize";
import { validateImageBuffer } from "@/lib/assets/validate";
import { buildImagePlacementPrompt } from "@/lib/assets/placement";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { checkDailyEditQuota } from "@/lib/edits/quota";
import { enqueueBackgroundTask } from "@/lib/worker/queue";
import {
  getOwnedWebsite,
  toWebsiteResponse,
  userHasProPlan,
} from "@/lib/websites/service";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ websiteId: string }>;
}

const { editRequests, websites } = schema;

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to view images" }, { status: 401 });
  }

  const { websiteId } = await context.params;
  const website = await getOwnedWebsite({ websiteId, userId: user.id });

  if (!website) {
    return NextResponse.json({ error: "Website not found" }, { status: 404 });
  }

  const manifest = await readWebsiteImageManifest(website.slug);

  return NextResponse.json({
    localized: manifest !== null,
    images: manifest?.images ?? [],
  });
}

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to upload images" }, { status: 401 });
  }

  const { websiteId } = await context.params;
  const website = await getOwnedWebsite({ websiteId, userId: user.id });

  if (!website) {
    return NextResponse.json({ error: "Website not found" }, { status: 404 });
  }

  let form: FormData;

  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Upload at least one image" }, { status: 400 });
  }

  const files = [...form.getAll("files"), ...form.getAll("images")].filter(
    (entry): entry is File => entry instanceof File && entry.size > 0,
  );

  if (files.length === 0) {
    return NextResponse.json({ error: "Upload at least one image" }, { status: 400 });
  }

  if (files.length > MAX_IMAGES_PER_UPLOAD) {
    return NextResponse.json(
      { error: `Upload up to ${MAX_IMAGES_PER_UPLOAD} images at a time` },
      { status: 400 },
    );
  }

  const role = form.get("role") === "logo" ? "logo" : "image";
  const placement = String(form.get("placement") ?? "library");
  const shouldPlace = placement !== "library";
  const note = String(form.get("note") ?? "").trim() || null;

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

  if (shouldPlace && isExpiredPreview) {
    return NextResponse.json(
      { error: "This free preview has ended. Go Pro (£10/month) to bring it back and keep making changes." },
      { status: 402 },
    );
  }

  const db = getDb();
  let activeEdit: { id: string } | undefined;

  if (shouldPlace) {
    [activeEdit] = await db
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
  }

  try {
    const assets: Array<{
      buffer: Buffer;
      contentType: string;
      role: "logo" | "image";
    }> = [];

    for (const file of files) {
      if (!isSupportedImageType(file.type)) {
        return NextResponse.json(
          { error: "Use PNG, JPG, WebP, GIF, AVIF, or SVG images" },
          { status: 400 },
        );
      }

      if (file.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json(
          { error: "Each image must be under 15MB" },
          { status: 400 },
        );
      }

      const original = Buffer.from(await file.arrayBuffer());

      // Trust the bytes, not the declared MIME type.
      if (!validateImageBuffer(original)) {
        return NextResponse.json(
          { error: "One of those files isn't a valid image" },
          { status: 400 },
        );
      }

      const optimized = await optimizeImage(original, file.type);

      assets.push({
        buffer: optimized.buffer,
        contentType: optimized.contentType,
        role,
      });
    }

    const uploadedImages = await appendLocalizedImages({
      slug: website.slug,
      assets,
    });

    let editRequest: typeof editRequests.$inferSelect | null = null;
    let updatedWebsite: typeof websites.$inferSelect | null = null;

    if (shouldPlace) {
      const [createdEdit] = await db
        .insert(editRequests)
        .values({
          websiteId: website.id,
          userId: user.id,
          prompt: buildImagePlacementPrompt({
            assets: uploadedImages,
            placement,
            note,
          }),
          status: "queued",
        })
        .returning();

      editRequest = createdEdit;

      [updatedWebsite] = await db
        .update(websites)
        .set({
          freeEditsUsed: hasPro
            ? website.freeEditsUsed
            : website.freeEditsUsed + 1,
          updatedAt: new Date(),
        })
        .where(eq(websites.id, website.id))
        .returning();

      await enqueueBackgroundTask({
        type: "edit-request",
        payload: { editRequestId: createdEdit.id },
      });
    }

    return NextResponse.json({
      images: uploadedImages,
      editRequest,
      queued: Boolean(editRequest),
      website: updatedWebsite ? toWebsiteResponse(updatedWebsite) : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload images";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
