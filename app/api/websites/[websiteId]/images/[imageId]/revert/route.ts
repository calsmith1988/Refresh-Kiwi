import { NextResponse } from "next/server";

import { revertLocalizedImage } from "@/lib/assets/localize";
import { getCurrentUser } from "@/lib/auth/session";
import { enqueueHomepageScreenshotRefresh } from "@/lib/screenshots/queue";
import { getOwnedWebsite } from "@/lib/websites/service";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ websiteId: string; imageId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to restore images" }, { status: 401 });
  }

  const { websiteId, imageId } = await context.params;
  const website = await getOwnedWebsite({ websiteId, userId: user.id });

  if (!website) {
    return NextResponse.json({ error: "Website not found" }, { status: 404 });
  }

  let file: string | null = null;

  try {
    const body = (await request.json()) as { file?: string };
    file = body.file ?? null;
  } catch {
    // Handled below.
  }

  if (!file) {
    return NextResponse.json(
      { error: "Choose a version to restore" },
      { status: 400 },
    );
  }

  try {
    const image = await revertLocalizedImage({
      slug: website.slug,
      imageId,
      file,
    });

    await enqueueHomepageScreenshotRefresh({
      slug: website.slug,
      websiteId: website.id,
    });

    return NextResponse.json({ image });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to restore image";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
