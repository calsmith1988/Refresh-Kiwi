import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { homepageScreenshotPath } from "@/lib/screenshots/paths";
import { captureAndSaveHomepageScreenshot } from "@/lib/screenshots/homepage";
import { getOwnedWebsite } from "@/lib/websites/service";

export const runtime = "nodejs";
export const maxDuration = 120;

interface RouteContext {
  params: Promise<{ websiteId: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in to refresh screenshots" },
      { status: 401 },
    );
  }

  const { websiteId } = await context.params;
  const website = await getOwnedWebsite({ websiteId, userId: user.id });

  if (!website) {
    return NextResponse.json({ error: "Website not found" }, { status: 404 });
  }

  try {
    await captureAndSaveHomepageScreenshot(website.slug, {
      websiteId: website.id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to refresh screenshot";

    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({
    screenshotUrl: homepageScreenshotPath(website.slug, Date.now()),
  });
}
