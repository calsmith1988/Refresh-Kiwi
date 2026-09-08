import { isDomainHttpsReady } from "@/lib/domains/https";
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
