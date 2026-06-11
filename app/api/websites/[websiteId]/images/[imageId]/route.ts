import { NextResponse } from "next/server";

import {
  isSupportedImageType,
  MAX_UPLOAD_BYTES,
  replaceLocalizedImage,
} from "@/lib/assets/localize";
import { getCurrentUser } from "@/lib/auth/session";
import { getOwnedWebsite } from "@/lib/websites/service";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ websiteId: string; imageId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to replace images" }, { status: 401 });
  }

  const { websiteId, imageId } = await context.params;
  const website = await getOwnedWebsite({ websiteId, userId: user.id });

  if (!website) {
    return NextResponse.json({ error: "Website not found" }, { status: 404 });
  }

  let file: File | null = null;

  try {
    const form = await request.formData();
    const entry = form.get("file");
    file = entry instanceof File ? entry : null;
  } catch {
    return NextResponse.json({ error: "Upload a file to replace this image" }, { status: 400 });
  }

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "Upload a file to replace this image" }, { status: 400 });
  }

  if (!isSupportedImageType(file.type)) {
    return NextResponse.json(
      { error: "Use a PNG, JPG, WebP, GIF, AVIF, or SVG image" },
      { status: 400 },
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "That image is too large — keep it under 15MB" },
      { status: 400 },
    );
  }

  try {
    const image = await replaceLocalizedImage({
      slug: website.slug,
      imageId,
      buffer: Buffer.from(await file.arrayBuffer()),
      contentType: file.type,
      source: "upload",
    });

    return NextResponse.json({ image });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to replace image";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
