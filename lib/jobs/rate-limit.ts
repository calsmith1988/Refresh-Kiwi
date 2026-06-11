import { and, count, eq, gte, isNull, ne } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";

const { jobs } = schema;

/**
 * Every refresh costs a real Cursor agent run, and /api/refresh is public —
 * so generations are capped per rolling 24 hours. The website-save limit
 * (1 free / 3 Pro) only applies at claim time and doesn't protect this.
 *
 * Failed jobs don't count against anyone — those are on us.
 */
const WINDOW_MS = 24 * 60 * 60 * 1000;
const ANONYMOUS_LIMIT_PER_IP = 3;
const FREE_USER_LIMIT = 5;
const PRO_USER_LIMIT = 25;

export type RefreshLimitResult =
  | { ok: true }
  | { ok: false; message: string };

async function countRecentJobs(
  where: ReturnType<typeof and>,
): Promise<number> {
  const [row] = await getDb().select({ value: count() }).from(jobs).where(where);

  return row?.value ?? 0;
}

export async function checkRefreshLimit(params: {
  userId: string | null;
  isPro: boolean;
  clientIp: string | null;
}): Promise<RefreshLimitResult> {
  const since = new Date(Date.now() - WINDOW_MS);

  if (params.userId) {
    const limit = params.isPro ? PRO_USER_LIMIT : FREE_USER_LIMIT;
    const used = await countRecentJobs(
      and(
        eq(jobs.userId, params.userId),
        gte(jobs.createdAt, since),
        ne(jobs.status, "failed"),
      ),
    );

    if (used >= limit) {
      return {
        ok: false,
        message: params.isPro
          ? "You've reached today's refresh limit. It resets within 24 hours — if you regularly need more, get in touch."
          : "You've used today's free refreshes. Try again tomorrow, or go Pro (£10/month) for more.",
      };
    }

    return { ok: true };
  }

  // Anonymous visitors are limited by IP. No IP header (e.g. local dev)
  // means we can't meaningfully limit, so allow it.
  if (!params.clientIp) {
    return { ok: true };
  }

  const used = await countRecentJobs(
    and(
      eq(jobs.clientIp, params.clientIp),
      isNull(jobs.userId),
      gte(jobs.createdAt, since),
      ne(jobs.status, "failed"),
    ),
  );

  if (used >= ANONYMOUS_LIMIT_PER_IP) {
    return {
      ok: false,
      message:
        "You've used today's free refreshes. Create a free account for a few more, or come back tomorrow.",
    };
  }

  return { ok: true };
}

/** First hop of x-forwarded-for is the real client when behind a proxy. */
export function clientIpFromRequest(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();

    if (first) {
      return first;
    }
  }

  return request.headers.get("x-real-ip")?.trim() || null;
}
