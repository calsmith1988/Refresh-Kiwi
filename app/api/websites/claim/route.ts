import { NextResponse } from "next/server";
import { after } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { claimWebsite, toWebsiteResponse } from "@/lib/websites/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to save this website" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { jobId?: string };

    if (!body.jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    const website = await claimWebsite({ jobId: body.jobId, userId: user.id });

    // Once a website is claimed, bring its hotlinked images in-house in the
    // background: download, rewrite references, and write the image manifest.
    after(async () => {
      const { localizeWebsiteImages } = await import("@/lib/assets/localize");
      await localizeWebsiteImages(website.slug);
    });

    return NextResponse.json({ website: toWebsiteResponse(website) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save website";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
