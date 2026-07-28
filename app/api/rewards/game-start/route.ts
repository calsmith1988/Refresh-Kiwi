import { NextResponse } from "next/server";

import { assertRateLimit, rateLimitKey } from "@/lib/auth/rateLimit";
import { rateLimitResponse } from "@/lib/auth/rateLimitResponse";
import { isAuthorizedForJob } from "@/lib/jobs/access";
import { startRewardGame } from "@/lib/rewards/service";

export const runtime = "nodejs";

/**
 * Starts the server-side play clock for a build's Kiwi Catch round. The win
 * endpoint checks against this, so a round has to be started here first.
 */
export async function POST(request: Request) {
  try {
    await assertRateLimit(rateLimitKey(request, "reward-game-start"), {
      limit: 30,
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

    await startRewardGame(body.jobId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const limited = rateLimitResponse(error);

    if (limited) {
      return limited;
    }

    const message =
      error instanceof Error ? error.message : "Could not start the game";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
