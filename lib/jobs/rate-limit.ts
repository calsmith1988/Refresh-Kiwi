import { and, count, eq, gte, isNull, ne } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";
import { clientIpFromRequest as deriveClientIp } from "@/lib/security/client-ip";

const { jobs } = schema;

/**
 * Every refresh costs a real Cursor agent run, and /api/refresh is public —
 * so generations are capped per rolling 24 hours. This complements the
 * website allowance (1 free / 3 Pro, see checkWebsiteAllowance): anonymous
 * visitors have no saved websites yet, so this cap is what protects the
 * public endpoints from them.
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
          : "You've used today's free refreshes. Try again tomorrow, or go Pro for more.",
      };
    }

    return { ok: true };
  }

  // Anonymous visitors are limited by IP. Behind our proxy the client IP is
  // always present, so a missing IP in production means we can't attribute
  // (or cap) the request — refuse rather than hand out an uncapped free agent.
  // Locally there's no proxy, so allow it for development.
  if (!params.clientIp) {
    if (process.env.NODE_ENV === "production") {
      return {
        ok: false,
        message:
          "We couldn't verify your request. Create a free account to keep going.",
      };
    }

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

/**
 * Re-exported for call sites that create jobs. Uses the trusted-proxy-aware
 * derivation so a client can't spoof its IP to dodge quotas.
 */
export function clientIpFromRequest(request: Request): string | null {
  return deriveClientIp(request);
}
