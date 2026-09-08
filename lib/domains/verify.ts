import { diagnoseCustomDomain, type DomainDiagnosis } from "@/lib/domains/diagnose";
import { isDomainHttpsReady } from "@/lib/domains/https";
import { relatedCustomHosts } from "@/lib/domains/records";
import {
  DOMAIN_CERT_PROVISIONING_MESSAGE,
  DOMAIN_DNS_PENDING_MESSAGE,
  type InProgressDomainStatus,
} from "@/lib/domains/status";
import {
  isRenderDomainVerified,
  refreshRenderCustomDomain,
  type RenderCustomDomain,
} from "@/lib/render/domains";

export type DomainReadiness = {
  renderDomain: RenderCustomDomain;
  status: InProgressDomainStatus | "connected";
  error: string | null;
  diagnosis: DomainDiagnosis;
};

/**
 * Render "verified" only means they can see the DNS records. The certificate
 * can still be missing, so we also probe HTTPS before calling the domain
 * connected. Diagnosis explains leftover A/AAAA, CAA, and stale public DNS.
 */
export async function assessCustomDomain(
  domain: string,
): Promise<DomainReadiness> {
  const [renderDomain, diagnosis] = await Promise.all([
    refreshRenderCustomDomain(domain),
    diagnoseCustomDomain(domain),
  ]);

  // Render only verifies (and issues a certificate for) the exact hostname
  // asked. We store www, so nudge the apex too or it sits unverified forever.
  for (const host of relatedCustomHosts(domain)) {
    if (host === domain) {
      continue;
    }

    try {
      await refreshRenderCustomDomain(host);
    } catch {
      // Apex is best-effort; www decides the status.
    }
  }

  if (!isRenderDomainVerified(renderDomain)) {
    return {
      renderDomain,
      status: "pending",
      error: diagnosis.ownerMessage ?? DOMAIN_DNS_PENDING_MESSAGE,
      diagnosis,
    };
  }

  if (!(await isDomainHttpsReady(domain))) {
    return {
      renderDomain,
      status: "provisioning",
      error: diagnosis.ownerMessage ?? DOMAIN_CERT_PROVISIONING_MESSAGE,
      diagnosis,
    };
  }

  return {
    renderDomain,
    status: "connected",
    error: null,
    diagnosis,
  };
}
