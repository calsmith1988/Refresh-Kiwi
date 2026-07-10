import { and, eq, gt, lt, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb, schema } from "@/lib/db";
import { sendOnce } from "@/lib/email/events";
import { sendDomainConnectedEmail } from "@/lib/email/service";
import {
  isRenderDomainVerified,
  refreshRenderCustomDomain,
} from "@/lib/render/domains";
import { updateOwnedWebsiteDomainStatus } from "@/lib/websites/service";

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

  return db.transaction(async (tx) => {
    const lockRows = await tx.execute<{ locked: boolean }>(
      sql`SELECT pg_try_advisory_xact_lock(hashtext('cron:check-domains')) AS locked`,
    );

    if (!lockRows[0]?.locked) {
      return NextResponse.json({ skipped: true, reason: "already running" });
    }

    // customDomainLastCheckedAt is only written when the user connects or
    // manually checks — the cron deliberately does not touch it for
    // still-pending domains, so it anchors both windows below: skip domains
    // connected in the last 10 minutes, and give up on domains that have been
    // pending for over 7 days.
    const checkCutoff = new Date(Date.now() - 10 * 60 * 1000);
    const retryCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const candidates = await tx
      .select({
        websiteId: websites.id,
        userId: websites.userId,
        domain: websites.customDomain,
        email: users.email,
      })
      .from(websites)
      .innerJoin(users, eq(websites.userId, users.id))
      .where(
        and(
          eq(websites.customDomainStatus, "pending"),
          lt(websites.customDomainLastCheckedAt, checkCutoff),
          gt(websites.customDomainLastCheckedAt, retryCutoff),
          sql`${websites.customDomain} IS NOT NULL`,
        ),
      )
      .limit(25);

    let connected = 0;
    let checked = 0;
    let failed = 0;

    for (const candidate of candidates) {
      const domain = candidate.domain;
      const userId = candidate.userId;

      if (!domain || !userId) {
        continue;
      }

      try {
        checked += 1;
        const renderDomain = await refreshRenderCustomDomain(domain);

        // Still pending: no DB write, so customDomainLastCheckedAt keeps
        // marking when the user last acted and the 7-day cap holds.
        if (!isRenderDomainVerified(renderDomain)) {
          continue;
        }

        await updateOwnedWebsiteDomainStatus({
          websiteId: candidate.websiteId,
          userId,
          status: "connected",
          error: null,
          renderDomainId: renderDomain.id ?? null,
        });

        connected += 1;
        await sendOnce(
          {
            // Keyed per domain so reconnecting a different domain later still
            // gets its own confirmation email.
            type: `domain_connected:${domain}`,
            userId,
            websiteId: candidate.websiteId,
          },
          () =>
            sendDomainConnectedEmail({
              to: candidate.email,
              domain,
            }),
        );
      } catch {
        failed += 1;
      }
    }

    return NextResponse.json({
      checked,
      connected,
      failed,
      candidates: candidates.length,
    });
  });
}
