import { eq } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";
import type { DomainDiagnosis } from "@/lib/domains/diagnose";
import { DOMAIN_CERT_STUCK_MS } from "@/lib/domains/status";
import { sendOnce } from "@/lib/email/events";
import { sendDomainCertificateStuckEmail } from "@/lib/email/service";

const { users, websites } = schema;

export function isCertificateStuckSince(lastCheckedAt: Date | null): boolean {
  if (!lastCheckedAt) {
    return false;
  }

  return Date.now() - lastCheckedAt.getTime() >= DOMAIN_CERT_STUCK_MS;
}

/**
 * Emails info@refresh.kiwi once a domain has sat on "issuing certificate"
 * for 45 minutes. The customer is not emailed — ops flushes public DNS.
 */
export async function maybeNotifyStuckCertificate(params: {
  websiteId: string;
  userId: string;
  domain: string;
  status: string;
  previousStatus?: string | null;
  lastCheckedAt: Date | string | null;
  diagnosis: DomainDiagnosis;
}) {
  if (params.status !== "provisioning") {
    return;
  }

  // Only after it has already been sitting on provisioning — not the
  // first time we notice DNS and move pending → issuing.
  if (params.previousStatus && params.previousStatus !== "provisioning") {
    return;
  }

  const lastCheckedAt =
    params.lastCheckedAt instanceof Date
      ? params.lastCheckedAt
      : params.lastCheckedAt
        ? new Date(params.lastCheckedAt)
        : null;

  if (!isCertificateStuckSince(lastCheckedAt)) {
    return;
  }

  const db = getDb();
  const [website] = await db
    .select({
      slug: websites.slug,
      brandName: websites.brandName,
      email: users.email,
    })
    .from(websites)
    .leftJoin(users, eq(websites.userId, users.id))
    .where(eq(websites.id, params.websiteId))
    .limit(1);

  const stuckMinutes = lastCheckedAt
    ? Math.round((Date.now() - lastCheckedAt.getTime()) / 60_000)
    : 0;

  await sendOnce(
    {
      type: `domain_cert_stuck:${params.domain}`,
      userId: params.userId,
      websiteId: params.websiteId,
    },
    () =>
      sendDomainCertificateStuckEmail({
        domain: params.domain,
        ownerEmail: website?.email ?? null,
        slug: website?.slug ?? params.websiteId,
        brandName: website?.brandName ?? null,
        stuckMinutes,
        playbookLines: params.diagnosis.playbookLines,
      }),
  );
}
