import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { homepageScreenshotPath } from "@/lib/screenshots/paths";
import { tryCaptureHomepageScreenshot } from "@/lib/screenshots/homepage";
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

  await tryCaptureHomepageScreenshot(website.slug);

  return NextResponse.json({
    screenshotUrl: homepageScreenshotPath(website.slug),
  });
}
