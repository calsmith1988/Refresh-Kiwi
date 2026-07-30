/**
 * Hosted customer sites live on a dedicated domain (e.g. refreshkiwi.site),
 * separate from the marketing/app host (refresh.kiwi). That isolates Safe
 * Browsing / cookie risk and lets Pro sites graduate off /preview/.
 */

const DEFAULT_SITES_DOMAIN = "refreshkiwi.site";

/** Subdomains that must never map to a customer website slug. */
const RESERVED_SITES_SUBDOMAINS = new Set([
  "www",
  "api",
  "admin",
  "app",
  "account",
  "dashboard",
  "preview",
  "custom-domain",
  "mail",
  "email",
  "smtp",
  "ftp",
  "cdn",
  "static",
  "assets",
  "status",
  "support",
  "help",
  "docs",
  "blog",
  "m",
  "dev",
  "staging",
  "test",
  "localhost",
]);

export function getSitesDomain(): string {
  const configured = (
    process.env.NEXT_PUBLIC_SITES_DOMAIN?.trim() ||
    process.env.SITES_DOMAIN?.trim() ||
    DEFAULT_SITES_DOMAIN
  )
    .toLowerCase()
    .replace(/^\.+|\.+$/g, "");

  return configured || DEFAULT_SITES_DOMAIN;
}

export function getAppMarketingUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://refresh.kiwi"
  ).replace(/\/$/, "");
}

export function isReservedSitesSubdomain(subdomain: string): boolean {
  return RESERVED_SITES_SUBDOMAINS.has(subdomain.toLowerCase());
}

export function isSitesApexHost(host: string): boolean {
  const sitesDomain = getSitesDomain();
  const normalized = host.split(":")[0]?.toLowerCase() ?? "";

  return normalized === sitesDomain || normalized === `www.${sitesDomain}`;
}

/**
 * Returns the customer slug when host is `{slug}.{sitesDomain}`, otherwise null.
 * Apex / www / reserved labels return null.
 */
export function sitesSlugFromHost(host: string): string | null {
  const sitesDomain = getSitesDomain();
  const normalized = host.split(":")[0]?.toLowerCase() ?? "";

  if (!normalized.endsWith(`.${sitesDomain}`)) {
    return null;
  }

  const subdomain = normalized.slice(0, -(sitesDomain.length + 1));

  if (
    !subdomain ||
    subdomain.includes(".") ||
    isReservedSitesSubdomain(subdomain)
  ) {
    return null;
  }

  return subdomain;
}

/** Absolute homepage URL for a graduated site. */
export function sitesHomepageUrl(slug: string): string {
  return `https://${slug}.${getSitesDomain()}/`;
}
