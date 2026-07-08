import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import {
  readWebsiteImageManifest,
  replaceLocalizedImage,
} from "@/lib/assets/localize";
import { optimizeImage } from "@/lib/assets/optimize";
import { isRemixableImageType, remixImage } from "@/lib/assets/remix";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { readPreviewFile } from "@/lib/preview/serve";
import {
  getOwnedWebsite,
  toWebsiteResponse,
  userHasProPlan,
} from "@/lib/websites/service";

const { websites } = schema;

export const runtime = "nodejs";
// AI image generation can take a while; don't let the platform cut it short.
export const maxDuration = 180;

interface RouteContext {
  params: Promise<{ websiteId: string; imageId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to remix images" }, { status: 401 });
  }

  const { websiteId, imageId } = await context.params;
  const website = await getOwnedWebsite({ websiteId, userId: user.id });

  if (!website) {
    return NextResponse.json({ error: "Website not found" }, { status: 404 });
  }

  // Remixes cost real AI usage, so they count as a change for free accounts
  // — Pro subscribers get unlimited remixes, same as edits.
  const hasPro = await userHasProPlan(user.id);
  const isExpiredPreview =
    website.status === "expired" ||
    (!hasPro &&
      website.status !== "live" &&
      website.expiresAt.getTime() <= Date.now());

  if (website.status === "archived") {
    return NextResponse.json(
      { error: "Archived websites cannot be changed." },
      { status: 400 },
    );
  }

  if (isExpiredPreview) {
    return NextResponse.json(
      { error: "This free preview has ended. Go Pro to bring it back and keep making changes." },
      { status: 402 },
    );
  }

  const freeEditsRemaining = Math.max(
    0,
    website.freeEditsLimit - website.freeEditsUsed,
  );

  if (!hasPro && freeEditsRemaining <= 0) {
    return NextResponse.json(
      { error: "You've used your 3 free changes. Go Pro for unlimited changes and AI remixes." },
      { status: 402 },
    );
  }

  let note: string | null = null;

  try {
    const body = (await request.json()) as { note?: string };
    note = body.note?.trim() || null;
  } catch {
    // No body is fine — remix without a note.
  }

  if (note && note.length > 500) {
    return NextResponse.json(
      { error: "Keep the note under 500 characters" },
      { status: 400 },
    );
  }

  const manifest = await readWebsiteImageManifest(website.slug);
  const image = manifest?.images.find((entry) => entry.id === imageId);

  if (!image) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  if (!isRemixableImageType(image.contentType)) {
    return NextResponse.json(
      { error: "This image type can't be remixed — only PNG, JPG, and WebP work." },
      { status: 400 },
    );
  }

  try {
    const asset = await readPreviewFile(website.slug, image.file.split("/"));

    if (!asset) {
      return NextResponse.json({ error: "Image file not found" }, { status: 404 });
    }

    const remixed = await remixImage({
      buffer: asset.body,
      contentType: image.contentType,
      note,
    });

    const optimized = await optimizeImage(remixed.buffer, remixed.contentType);

    const updated = await replaceLocalizedImage({
      slug: website.slug,
      imageId,
      buffer: optimized.buffer,
      contentType: optimized.contentType,
      source: "remix",
    });

    // Only burn a free change once the remix has actually succeeded — a
    // failed AI call shouldn't cost the user anything.
    const [updatedWebsite] = await getDb()
      .update(websites)
      .set({
        freeEditsUsed: hasPro ? website.freeEditsUsed : website.freeEditsUsed + 1,
        updatedAt: new Date(),
      })
      .where(eq(websites.id, website.id))
      .returning();

    return NextResponse.json({
      image: updated,
      website: toWebsiteResponse(updatedWebsite),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to remix image";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
