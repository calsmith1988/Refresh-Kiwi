import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { enqueueHomepageScreenshotRefresh } from "@/lib/screenshots/queue";
import { getOwnedWebsite } from "@/lib/websites/service";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ websiteId: string }>;
}

// Screenshot capture launches a full Chromium; on the 512MB web instance that
// alone can trip the memory limit, so the capture always runs on the worker.
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

  await enqueueHomepageScreenshotRefresh({
    slug: website.slug,
    websiteId: website.id,
  });

  return NextResponse.json({ queued: true }, { status: 202 });
}
