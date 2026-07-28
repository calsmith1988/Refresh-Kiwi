import { NextResponse } from "next/server";

import { assertRateLimit, rateLimitKey } from "@/lib/auth/rateLimit";
import { rateLimitResponse } from "@/lib/auth/rateLimitResponse";
import { getCurrentUser } from "@/lib/auth/session";
import { sanitizeAttribution } from "@/lib/jobs/attribution";
import {
  checkRefreshLimit,
  clientIpFromRequest,
} from "@/lib/jobs/rate-limit";
import { checkSourceUrlReachable } from "@/lib/jobs/reachability";
import { createRefreshJob } from "@/lib/jobs/service";
import { createJobAccessToken } from "@/lib/jobs/token";
import { metaUserDataFromRequest, sendMetaEvent } from "@/lib/meta/events";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import { enqueueBackgroundTask } from "@/lib/worker/queue";
import { checkWebsiteAllowance, userHasProPlan } from "@/lib/websites/service";

export const runtime = "nodejs";

type RefreshRequestBody = {
  url?: string;
  metaEventId?: string;
  turnstileToken?: string;
  attribution?: unknown;
};

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);

    // "plumbing" parses as a valid URL but isn't a real website address —
    // require at least domain.tld so typos fail instantly instead of after a
    // two-minute generation attempt.
    if (!parsed.hostname.includes(".")) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let body: RefreshRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sourceUrl = normalizeUrl(body.url ?? "");

  if (!sourceUrl) {
    return NextResponse.json(
      { error: "Enter your website address — something like yourbusiness.co.uk" },
      { status: 400 },
    );
  }

  try {
    const currentUser = await getCurrentUser();
    const clientIp = clientIpFromRequest(request);

    // Anonymous generations spawn a paid agent — require human verification.
    if (!currentUser) {
      const verification = await verifyTurnstileToken(
        body.turnstileToken ?? null,
        clientIp,
      );

      if (!verification.ok) {
        return NextResponse.json({ error: verification.message }, { status: 400 });
      }
    }

    await assertRateLimit(rateLimitKey(request, "refresh-create"), {
      limit: currentUser ? 10 : 3,
      windowMs: 10 * 60 * 1000,
      message: "Too many refresh attempts. Please wait a moment and try again.",
    });

    const isPro = currentUser ? await userHasProPlan(currentUser.id) : false;

    // Signed-in generations save straight to the account, so enforce the
    // website allowance (1 free / 3 Pro) before spending an agent run.
    if (currentUser) {
      const allowance = await checkWebsiteAllowance({
        userId: currentUser.id,
        isPro,
      });

      if (!allowance.ok) {
        return NextResponse.json({ error: allowance.message }, { status: 403 });
      }
    }

    const limit = await checkRefreshLimit({
      userId: currentUser?.id ?? null,
      isPro,
      clientIp,
    });

    if (!limit.ok) {
      return NextResponse.json({ error: limit.message }, { status: 429 });
    }

    // Last gate before spending money: typo'd domains and suspended sites
    // must fail here with a fixable message, not after a two-minute agent
    // run. Deliberately after Turnstile/rate limits so the probe can't be
    // farmed by anonymous traffic.
    const reachability = await checkSourceUrlReachable(sourceUrl);

    if (!reachability.ok) {
      return NextResponse.json({ error: reachability.message }, { status: 400 });
    }

    const job = await createRefreshJob(
      sourceUrl,
      currentUser?.id ?? null,
      clientIp,
      sanitizeAttribution(body.attribution),
    );
    await sendMetaEvent({
      eventName: "Lead",
      eventId: body.metaEventId || `lead.${job.id}`,
      eventSourceUrl: request.headers.get("referer"),
      userData: metaUserDataFromRequest(request, { email: currentUser?.email }),
      customData: {
        content_name: "Website refresh request",
        source_url: sourceUrl,
      },
    });

    await enqueueBackgroundTask({
      type: "refresh-homepage",
      payload: { jobId: job.id },
    });

    return NextResponse.json(
      { ...job, accessToken: createJobAccessToken(job.id) },
      { status: 202 },
    );
  } catch (error) {
    const limited = rateLimitResponse(error);
    if (limited) {
      return limited;
    }

    const message =
      error instanceof Error ? error.message : "Failed to create refresh job";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
