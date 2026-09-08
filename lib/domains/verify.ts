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
};

/**
 * Render "verified" only means they can see the DNS records. The certificate
 * can still be missing, so we also probe HTTPS before calling the domain
 * connected.
 */
export async function assessCustomDomain(
  domain: string,
): Promise<DomainReadiness> {
  const renderDomain = await refreshRenderCustomDomain(domain);

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
      error: DOMAIN_DNS_PENDING_MESSAGE,
    };
  }

  if (!(await isDomainHttpsReady(domain))) {
    return {
      renderDomain,
      status: "provisioning",
      error: DOMAIN_CERT_PROVISIONING_MESSAGE,
    };
  }

  return {
    renderDomain,
    status: "connected",
    error: null,
  };
}
