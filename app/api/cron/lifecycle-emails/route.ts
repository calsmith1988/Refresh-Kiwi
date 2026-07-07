import { and, eq, lt, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb, schema } from "@/lib/db";
import { sendOnce, userAllowsMarketing } from "@/lib/email/events";
import { sendFreeFollowUpEmail } from "@/lib/email/service";
import { createUnsubscribeToken } from "@/lib/email/unsubscribe";

export const runtime = "nodejs";

const { users, websites } = schema;

function getCronSecret(): string | null {
  return process.env.CRON_SECRET?.trim() || null;
}

function isAuthorized(request: Request): boolean {
  const secret = getCronSecret();

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  // Advisory lock scoped to this transaction: if a previous invocation is
  // still running (slow email provider, overlapping schedules), skip instead
  // of processing the same candidates concurrently. The lock releases
  // automatically when the transaction ends, even on crash.
  return db.transaction(async (tx) => {
    const lockRows = await tx.execute<{ locked: boolean }>(
      sql`SELECT pg_try_advisory_xact_lock(hashtext('cron:lifecycle-emails')) AS locked`,
    );

    if (!lockRows[0]?.locked) {
      return NextResponse.json({ skipped: true, reason: "already running" });
    }

    const followUpCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const candidates = await tx
      .select({
        websiteId: websites.id,
        userId: users.id,
        email: users.email,
      })
      .from(websites)
      .innerJoin(users, eq(websites.userId, users.id))
      .where(
        and(
          eq(users.plan, "free"),
          eq(websites.status, "preview"),
          lt(websites.createdAt, followUpCutoff),
        ),
      )
      .limit(50);

    let sent = 0;

    for (const candidate of candidates) {
      if (!(await userAllowsMarketing(candidate.userId))) {
        continue;
      }

      const didSend = await sendOnce(
        {
          type: "free_follow_up",
          userId: candidate.userId,
          websiteId: candidate.websiteId,
        },
        () =>
          sendFreeFollowUpEmail({
            to: candidate.email,
            unsubscribeToken: createUnsubscribeToken(candidate.userId),
          }),
      );

      if (didSend) {
        sent += 1;
      }
    }

    return NextResponse.json({ checked: candidates.length, sent });
  });
}
