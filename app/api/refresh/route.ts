import { after, NextResponse } from "next/server";

import { assertRateLimit, rateLimitKey } from "@/lib/auth/rateLimit";
import { rateLimitResponse } from "@/lib/auth/rateLimitResponse";
import { getCurrentUser } from "@/lib/auth/session";
import {
  checkRefreshLimit,
  clientIpFromRequest,
} from "@/lib/jobs/rate-limit";
import { createRefreshJob, failJob } from "@/lib/jobs/service";
import { userHasProPlan } from "@/lib/websites/service";

export const runtime = "nodejs";

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
  let body: { url?: string };

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
    await assertRateLimit(rateLimitKey(request, "refresh-create"), {
      limit: currentUser ? 10 : 3,
      windowMs: 10 * 60 * 1000,
      message: "Too many refresh attempts. Please wait a moment and try again.",
    });

    const limit = await checkRefreshLimit({
      userId: currentUser?.id ?? null,
      isPro: currentUser ? await userHasProPlan(currentUser.id) : false,
      clientIp,
    });

    if (!limit.ok) {
      return NextResponse.json({ error: limit.message }, { status: 429 });
    }

    const job = await createRefreshJob(sourceUrl, currentUser?.id ?? null, clientIp);

    after(async () => {
      try {
        const { processRefreshJob } = await import("@/lib/jobs/processor");
        await processRefreshJob(job.id);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Background refresh worker failed to start";
        console.error(`Refresh job ${job.id} failed`, error);
        await failJob(job.id, message);
      }
    });

    return NextResponse.json(job, { status: 202 });
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
