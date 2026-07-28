import { NextResponse } from "next/server";

import { assertRateLimit, rateLimitKey } from "@/lib/auth/rateLimit";
import { rateLimitResponse } from "@/lib/auth/rateLimitResponse";
import { isAuthorizedForJob } from "@/lib/jobs/access";
import { issueRewardForJob } from "@/lib/rewards/service";

export const runtime = "nodejs";

/**
 * Records a won round and returns the claim token for the free month. The token
 * is the winner's only proof until they have an account, so the client keeps it
 * until the site is claimed.
 *
 * Deliberately tolerant of the build having finished mid-round: a round that
 * outlives the build still counts.
 */
export async function POST(request: Request) {
  try {
    await assertRateLimit(rateLimitKey(request, "reward-win"), {
      limit: 20,
      windowMs: 60_000,
    });

    const body = (await request.json().catch(() => ({}))) as {
      jobId?: string;
    };

    if (!body.jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    if (!(await isAuthorizedForJob(request, body.jobId))) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const reward = await issueRewardForJob(body.jobId);

    return NextResponse.json({ reward });
  } catch (error) {
    const limited = rateLimitResponse(error);

    if (limited) {
      return limited;
    }

    const message =
      error instanceof Error ? error.message : "Could not award your free month";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
