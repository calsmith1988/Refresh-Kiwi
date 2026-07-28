import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { attachRewardToUser } from "@/lib/rewards/service";
import { enqueueBackgroundTask } from "@/lib/worker/queue";
import { claimWebsite, toWebsiteResponse } from "@/lib/websites/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to save this website" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      jobId?: string;
      rewardToken?: string;
    };

    if (!body.jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    const website = await claimWebsite({ jobId: body.jobId, userId: user.id });

    // Binding point for a free month won during the build. attachRewardToUser
    // enforces eligibility and returns null rather than throwing, so an
    // ineligible or expired bonus can never fail the claim itself.
    const reward = body.rewardToken
      ? await attachRewardToUser({
          token: body.rewardToken,
          userId: user.id,
          jobId: body.jobId,
        })
      : null;

    await enqueueBackgroundTask({
      type: "localize-images",
      payload: { slug: website.slug },
    });

    return NextResponse.json({
      website: toWebsiteResponse(website),
      rewardAttached: Boolean(reward),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save website";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
