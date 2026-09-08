import { Resolver } from "node:dns/promises";

import { apexDomainFromWww, ensureWwwDomain } from "@/lib/domains/records";
import {
  CLOUDFLARE_DNS_PURGE_URL,
  GOOGLE_DNS_PURGE_URL,
} from "@/lib/domains/status";
import { getRenderApexIp, getRenderDnsTarget } from "@/lib/render/domains";

export type DnsIssueCode =
  | "www_leftover_a"
  | "www_leftover_aaaa"
  | "apex_aaaa"
  | "caa_blocks"
  | "resolver_stale";

export type DnsIssue = {
  code: DnsIssueCode;
  message: string;
};

export type DomainDiagnosis = {
  issues: DnsIssue[];
  ownerMessage: string | null;
  playbookLines: string[];
};

const DOH_TIMEOUT_MS = 2_500;
const AUTH_TIMEOUT_MS = 2_500;
const RENDER_IPV4_PREFIX = "216.24.57.";
const CAA_ALLOWED = ["letsencrypt.org", "pki.goog"];

const CLOUDFLARE_DOH = "https://cloudflare-dns.com/dns-query";
const GOOGLE_DOH = "https://dns.google/resolve";

type DohAnswer = {
  name?: string;
  type?: number;
  data?: string;
};

function stripDot(value: string): string {
  return value.replace(/\.+$/, "").toLowerCase();
}

function isRenderIpv4(ip: string): boolean {
  return ip.startsWith(RENDER_IPV4_PREFIX) || ip === getRenderApexIp();
}

function pointsAtRenderCname(target: string): boolean {
  const host = stripDot(target);
  const renderTarget = stripDot(getRenderDnsTarget());

  return host === renderTarget || host.endsWith(".onrender.com");
}

async function dohQuery(
  endpoint: string,
  name: string,
  type: string,
): Promise<DohAnswer[]> {
  const url = `${endpoint}?name=${encodeURIComponent(name)}&type=${type}`;
  const response = await fetch(url, {
    headers: { accept: "application/dns-json" },
    signal: AbortSignal.timeout(DOH_TIMEOUT_MS),
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const body = (await response.json()) as { Answer?: DohAnswer[] };
  return body.Answer ?? [];
}

function recordsOnName(
  answers: DohAnswer[],
  hostname: string,
  type: number,
): string[] {
  const expected = stripDot(hostname);

  return answers
    .filter(
      (answer) =>
        answer.type === type &&
        typeof answer.name === "string" &&
        stripDot(answer.name) === expected &&
        typeof answer.data === "string",
    )
    .map((answer) => answer.data as string);
}

function leftoverA(answers: DohAnswer[], www: string): string[] {
  return recordsOnName(answers, www, 1).filter((ip) => !isRenderIpv4(ip));
}

function leftoverAaaa(answers: DohAnswer[], host: string): string[] {
  return recordsOnName(answers, host, 28);
}

async function publicLookups(www: string, apex: string) {
  const queries = [
    dohQuery(CLOUDFLARE_DOH, www, "A"),
    dohQuery(GOOGLE_DOH, www, "A"),
    dohQuery(CLOUDFLARE_DOH, www, "AAAA"),
    dohQuery(CLOUDFLARE_DOH, apex, "AAAA"),
    dohQuery(CLOUDFLARE_DOH, apex, "CAA"),
    dohQuery(CLOUDFLARE_DOH, www, "CNAME"),
  ];
  const results = await Promise.allSettled(queries);

  const value = (index: number): DohAnswer[] => {
    const result = results[index];
    return result?.status === "fulfilled" ? result.value : [];
  };

  return {
    cloudflareWwwA: value(0),
    googleWwwA: value(1),
    wwwAaaa: value(2),
    apexAaaa: value(3),
    caa: value(4),
    wwwCname: value(5),
  };
}

async function authoritativeWww(www: string, apex: string): Promise<{
  cname: string[];
  leftoverA: string[];
}> {
  try {
    const resolver = new Resolver();
    const nameservers = await Promise.race([
      resolver.resolveNs(apex),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("NS timeout")), AUTH_TIMEOUT_MS).unref?.();
      }),
    ]);
    const nsHost = nameservers[0];

    if (!nsHost) {
      return { cname: [], leftoverA: [] };
    }

    const nsIps = await resolver.resolve4(nsHost);
    const auth = new Resolver();
    auth.setServers(nsIps.slice(0, 2));

    const [cnameResult, aResult] = await Promise.allSettled([
      auth.resolveCname(www),
      auth.resolve4(www),
    ]);

    const cname =
      cnameResult.status === "fulfilled" ? cnameResult.value.map(stripDot) : [];
    const addresses = aResult.status === "fulfilled" ? aResult.value : [];

    // resolve4 follows a CNAME, so Render IPs here are expected once the
    // registrar is correct. A leftover A is only a leftover if there is no
    // Render CNAME and the A is not ours.
    const leftover =
      cname.some(pointsAtRenderCname)
        ? []
        : addresses.filter((ip) => !isRenderIpv4(ip));

    return { cname, leftoverA: leftover };
  } catch {
    return { cname: [], leftoverA: [] };
  }
}

function caaBlocksIssuance(answers: DohAnswer[], apex: string): boolean {
  const records = recordsOnName(answers, apex, 257);

  if (records.length === 0) {
    return false;
  }

  const issues = records.filter((record) => /\bissue\b/i.test(record));

  if (issues.length === 0) {
    return false;
  }

  return !issues.some((record) =>
    CAA_ALLOWED.some((authority) => record.toLowerCase().includes(authority)),
  );
}

function ownerMessageFor(issues: DnsIssue[]): string | null {
  const order: DnsIssueCode[] = [
    "www_leftover_a",
    "www_leftover_aaaa",
    "caa_blocks",
    "apex_aaaa",
    "resolver_stale",
  ];

  for (const code of order) {
    const issue = issues.find((item) => item.code === code);

    if (issue) {
      return issue.message;
    }
  }

  return null;
}

export async function diagnoseCustomDomain(
  domain: string,
): Promise<DomainDiagnosis> {
  let www: string;
  let apex: string;

  try {
    www = ensureWwwDomain(domain);
    apex = apexDomainFromWww(www);
  } catch {
    return { issues: [], ownerMessage: null, playbookLines: [] };
  }

  const [publicDns, auth] = await Promise.all([
    publicLookups(www, apex),
    authoritativeWww(www, apex),
  ]);

  const issues: DnsIssue[] = [];
  const publicLeftoverA = [
    ...leftoverA(publicDns.cloudflareWwwA, www),
    ...leftoverA(publicDns.googleWwwA, www),
  ];
  const uniquePublicA = [...new Set(publicLeftoverA)];
  const wwwAaaa = leftoverAaaa(publicDns.wwwAaaa, www);
  const apexAaaa = leftoverAaaa(publicDns.apexAaaa, apex);
  const authHasRenderCname = auth.cname.some(pointsAtRenderCname);
  const publicHasRenderCname = recordsOnName(
    publicDns.wwwCname,
    www,
    5,
  ).some(pointsAtRenderCname);

  if (auth.leftoverA.length > 0) {
    issues.push({
      code: "www_leftover_a",
      message: `www still has an old A record (${auth.leftoverA[0]}). Delete every A and AAAA on www — it must be CNAME only, pointing at ${getRenderDnsTarget()}.`,
    });
  } else if (uniquePublicA.length > 0 && !authHasRenderCname) {
    issues.push({
      code: "www_leftover_a",
      message: `www still has an old A record (${uniquePublicA[0]}). Delete every A and AAAA on www — it must be CNAME only, pointing at ${getRenderDnsTarget()}.`,
    });
  }

  if (wwwAaaa.length > 0) {
    issues.push({
      code: "www_leftover_aaaa",
      message:
        "www has an AAAA (IPv6) record. Remove it — Render uses IPv4 only, and leftover AAAA records block the certificate.",
    });
  }

  if (caaBlocksIssuance(publicDns.caa, apex)) {
    issues.push({
      code: "caa_blocks",
      message:
        "CAA records on this domain do not allow Let's Encrypt or Google Trust Services, so the certificate cannot be issued.",
    });
  }

  if (apexAaaa.length > 0) {
    issues.push({
      code: "apex_aaaa",
      message:
        "The root domain has an AAAA (IPv6) record. Remove it — Render uses IPv4 only.",
    });
  }

  if (
    uniquePublicA.length > 0 &&
    (authHasRenderCname || publicHasRenderCname) &&
    auth.leftoverA.length === 0
  ) {
    issues.push({
      code: "resolver_stale",
      message:
        "Your registrar looks right, but Cloudflare or Google still have the old address. The certificate can sit pending until that cache expires (often 1–4 hours).",
    });
  }

  const playbookLines = [
    `Domain: ${www}`,
    `Apex: ${apex}`,
    issues.length > 0
      ? `Issues: ${issues.map((issue) => issue.code).join(", ")}`
      : "Issues: none detected from public DNS (certificate may still be pending at Render).",
    ...issues.map((issue) => `- ${issue.message}`),
    "",
    "Playbook:",
    `1. Purge Cloudflare DNS cache: ${CLOUDFLARE_DNS_PURGE_URL}`,
    `   Flush A, AAAA, and CNAME for ${www}, plus A for ${apex}.`,
    `2. Purge Google DNS cache: ${GOOGLE_DNS_PURGE_URL}`,
    `3. Admin → Domains → Recheck.`,
    "4. If a leftover A/AAAA is listed above, ask the owner to delete those records. www must be CNAME only.",
    "5. Still stuck after that: Remove domain then Connect again in Refresh Kiwi (recreates the hostname on Render).",
  ];

  return {
    issues,
    ownerMessage: ownerMessageFor(issues),
    playbookLines,
  };
}
