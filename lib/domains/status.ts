export const CUSTOM_DOMAIN_STATUSES = [
  "none",
  "pending",
  "provisioning",
  "connected",
  "failed",
] as const;

export type CustomDomainStatus = (typeof CUSTOM_DOMAIN_STATUSES)[number];

/** DNS not seen yet, or DNS seen but the TLS certificate is still issuing. */
export const DOMAIN_STATUSES_IN_PROGRESS = ["pending", "provisioning"] as const;

export type InProgressDomainStatus = (typeof DOMAIN_STATUSES_IN_PROGRESS)[number];

export const DOMAIN_DNS_PENDING_MESSAGE =
  "We cannot see the DNS change yet. It can take a little while to update.";

export const DOMAIN_CERT_PROVISIONING_MESSAGE =
  "We can see your DNS records. The security certificate usually finishes in a few minutes — we'll email you when the domain opens.";

export function isInProgressDomainStatus(
  status: string,
): status is InProgressDomainStatus {
  return status === "pending" || status === "provisioning";
}

export function customDomainStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Waiting for DNS";
    case "provisioning":
      return "Issuing certificate";
    case "connected":
      return "Connected";
    case "failed":
      return "Failed";
    case "none":
      return "Not connected";
    default:
      return status;
  }
}
