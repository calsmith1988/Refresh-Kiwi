import { and, eq, gt, inArray, lt, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb, schema } from "@/lib/db";
import { DOMAIN_STATUSES_IN_PROGRESS } from "@/lib/domains/status";
import { maybeNotifyStuckCertificate } from "@/lib/domains/stuck-notify";
import { assessCustomDomain } from "@/lib/domains/verify";
import { sendOnce } from "@/lib/email/events";
import { sendDomainConnectedEmail } from "@/lib/email/service";
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

    // customDomainLastCheckedAt is only written when the user connects,
    // manually checks, or the status actually changes — the cron does not
    // touch it for unchanged pending/provisioning rows, so it anchors both
    // windows below: skip domains acted on in the last 10 minutes, and give
    // up on domains that have been waiting for over 7 days.
    const checkCutoff = new Date(Date.now() - 10 * 60 * 1000);
    const retryCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const candidates = await tx
      .select({
        websiteId: websites.id,
        userId: websites.userId,
        domain: websites.customDomain,
        status: websites.customDomainStatus,
        lastCheckedAt: websites.customDomainLastCheckedAt,
        email: users.email,
      })
      .from(websites)
      .innerJoin(users, eq(websites.userId, users.id))
      .where(
        and(
          sql`${websites.customDomain} IS NOT NULL`,
          lt(websites.customDomainLastCheckedAt, checkCutoff),
          or(
            and(
              inArray(websites.customDomainStatus, [...DOMAIN_STATUSES_IN_PROGRESS]),
              gt(websites.customDomainLastCheckedAt, retryCutoff),
            ),
            // Recently marked connected can still be a dead HTTPS link —
            // re-check so admin does not stay on "connected" while TLS fails.
            eq(websites.customDomainStatus, "connected"),
          ),
        ),
      )
      .limit(25);

    let connected = 0;
    let provisioning = 0;
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
        const assessment = await assessCustomDomain(domain);

        await maybeNotifyStuckCertificate({
          websiteId: candidate.websiteId,
          userId,
          domain,
          status: assessment.status,
          previousStatus: candidate.status,
          lastCheckedAt: candidate.lastCheckedAt,
          diagnosis: assessment.diagnosis,
        });

        // Unchanged: no DB write, so customDomainLastCheckedAt keeps marking
        // when the user last acted and the 7-day cap holds.
        if (assessment.status === candidate.status) {
          continue;
        }

        await updateOwnedWebsiteDomainStatus({
          websiteId: candidate.websiteId,
          userId,
          status: assessment.status,
          error: assessment.error,
          renderDomainId: assessment.renderDomain.id ?? null,
        });

        if (assessment.status === "provisioning") {
          provisioning += 1;
          continue;
        }

        if (assessment.status !== "connected") {
          continue;
        }

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
      provisioning,
      failed,
      candidates: candidates.length,
    });
  });
}
