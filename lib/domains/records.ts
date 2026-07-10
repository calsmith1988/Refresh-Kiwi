import { getRenderApexIp, getRenderDnsTarget } from "@/lib/render/domains";
import { normalizeCustomDomain } from "@/lib/websites/service";

export type DomainDnsRecord = {
  type: "A" | "CNAME";
  name: "@" | "www";
  value: string;
  purpose: string;
};

// Common two-label public suffixes (co.uk, com.au, ...) so apex domains like
// joesplumbing.co.uk are recognised as apex rather than as subdomains.
const TWO_LABEL_PUBLIC_SUFFIXES = new Set([
  "co.uk",
  "org.uk",
  "me.uk",
  "net.uk",
  "ltd.uk",
  "plc.uk",
  "ac.uk",
  "gov.uk",
  "sch.uk",
  "com.au",
  "net.au",
  "org.au",
  "id.au",
  "co.nz",
  "net.nz",
  "org.nz",
  "kiwi.nz",
  "geek.nz",
  "co.za",
  "com.br",
]);

function isApexDomain(domain: string): boolean {
  const labels = domain.split(".");

  if (labels.length === 2) {
    return true;
  }

  return (
    labels.length === 3 &&
    TWO_LABEL_PUBLIC_SUFFIXES.has(labels.slice(1).join("."))
  );
}

export function ensureWwwDomain(input: string): string {
  const domain = normalizeCustomDomain(input);

  if (domain.startsWith("www.")) {
    return domain;
  }

  if (isApexDomain(domain)) {
    return `www.${domain}`;
  }

  throw new Error(
    "For now, use your main website domain, like yourbusiness.com or www.yourbusiness.com.",
  );
}

export function apexDomainFromWww(domain: string): string {
  const normalized = ensureWwwDomain(domain);

  return normalized.replace(/^www\./, "");
}

export function buildDomainDnsRecords(): DomainDnsRecord[] {
  return [
    {
      type: "CNAME",
      name: "www",
      value: getRenderDnsTarget(),
      purpose: "Makes www.yourdomain.com open your Refresh Kiwi website.",
    },
    {
      type: "A",
      name: "@",
      value: getRenderApexIp(),
      purpose: "Makes yourdomain.com work without typing www.",
    },
  ];
}
