import { and, count, eq, gte, ne } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";

const { editRequests } = schema;

/**
 * Edit requests each spawn a paid Cursor agent. Free users are already bounded
 * by the 3-free-edits counter, but Pro was previously unbounded — a single
 * account could queue unlimited paid runs. We add a rolling 24h cap per user
 * and a hard prompt-length limit (matching the 4,000-char cap on /fresh).
 */
export const MAX_EDIT_PROMPT_LENGTH = 4_000;
export const MIN_EDIT_PROMPT_LENGTH = 5;

const WINDOW_MS = 24 * 60 * 60 * 1000;

function proDailyEditLimit(): number {
  const parsed = Number.parseInt(
    process.env.PRO_DAILY_EDIT_LIMIT?.trim() ?? "",
    10,
  );

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 50;
}

export type EditQuotaResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

/**
 * Enforces the rolling daily agent cap for a user. Failed edits don't count
 * (those are on us). Applied to all edit-request creators: text edits, image
 * uploads with placement, and image placement.
 */
export async function checkDailyEditQuota(
  userId: string,
): Promise<EditQuotaResult> {
  const since = new Date(Date.now() - WINDOW_MS);
  const limit = proDailyEditLimit();

  const [row] = await getDb()
    .select({ value: count() })
    .from(editRequests)
    .where(
      and(
        eq(editRequests.userId, userId),
        gte(editRequests.createdAt, since),
        ne(editRequests.status, "failed"),
      ),
    );

  if ((row?.value ?? 0) >= limit) {
    return {
      ok: false,
      status: 429,
      message:
        "You've reached today's change limit. It resets within 24 hours — if you regularly need more, get in touch.",
    };
  }

  return { ok: true };
}
