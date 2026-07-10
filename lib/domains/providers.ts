import { resolveNs } from "node:dns/promises";

import { apexDomainFromWww } from "@/lib/domains/records";

export type DomainProviderInfo = {
  id: string;
  name: string;
  loginUrl: string;
  steps: string[];
};

const GENERIC_PROVIDER: DomainProviderInfo = {
  id: "generic",
  name: "your domain provider",
  loginUrl: "",
  steps: [
    "Log in where you bought the domain.",
    "Open DNS settings, DNS records, or Manage DNS.",
    "Add the two records exactly as shown below.",
    "Save your changes, then Refresh Kiwi will check the connection automatically.",
  ],
};

const PROVIDERS: Array<DomainProviderInfo & { nameserverMatches: string[] }> = [
  {
    id: "godaddy",
    name: "GoDaddy",
    loginUrl: "https://dcc.godaddy.com/domains",
    nameserverMatches: ["domaincontrol.com"],
    steps: [
      "Log in to GoDaddy and open My Products.",
      "Find your domain and choose DNS or Manage DNS.",
      "Add the two records exactly as shown below.",
      "Save your changes. GoDaddy usually updates within a few minutes.",
    ],
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    loginUrl: "https://dash.cloudflare.com/",
    nameserverMatches: ["cloudflare.com"],
    steps: [
      "Log in to Cloudflare and choose your domain.",
      "Open DNS from the left-hand menu.",
      "Add the two records exactly as shown below.",
      "Make the CNAME record DNS only if Cloudflare asks about proxying.",
    ],
  },
  {
    id: "namecheap",
    name: "Namecheap",
    loginUrl: "https://ap.www.namecheap.com/domains/list/",
    nameserverMatches: ["registrar-servers.com", "namecheaphosting.com"],
    steps: [
      "Log in to Namecheap and open Domain List.",
      "Choose Manage next to your domain, then open Advanced DNS.",
      "Add the two records exactly as shown below.",
      "Save each record using the tick icon.",
    ],
  },
  {
    id: "123-reg",
    name: "123 Reg",
    loginUrl: "https://www.123-reg.co.uk/secure/",
    nameserverMatches: ["123-reg.co.uk"],
    steps: [
      "Log in to 123 Reg and open Domain Control Panel.",
      "Choose your domain, then open Manage DNS.",
      "Add the two records exactly as shown below.",
      "Save your changes and wait for the DNS update.",
    ],
  },
  {
    id: "ionos",
    name: "IONOS",
    loginUrl: "https://login.ionos.co.uk/",
    nameserverMatches: ["ui-dns.de", "ui-dns.biz", "ui-dns.com", "ui-dns.org"],
    steps: [
      "Log in to IONOS and open Domains & SSL.",
      "Choose your domain, then open DNS.",
      "Add the two records exactly as shown below.",
      "Save your changes. IONOS can take a little while to update.",
    ],
  },
  {
    id: "hostinger",
    name: "Hostinger",
    loginUrl: "https://hpanel.hostinger.com/",
    nameserverMatches: ["dns-parking.com", "hostinger.com"],
    steps: [
      "Log in to Hostinger and open Domains.",
      "Choose your domain, then open DNS / Nameservers.",
      "Add the two records exactly as shown below.",
      "Save your changes and Refresh Kiwi will keep checking.",
    ],
  },
  {
    id: "wix",
    name: "Wix",
    loginUrl: "https://manage.wix.com/account/domains",
    nameserverMatches: ["wixdns.net"],
    steps: [
      "Log in to Wix and open Domains.",
      "Choose your domain, then open Advanced or DNS records.",
      "Add the two records exactly as shown below.",
      "Save your changes and wait for Wix to update DNS.",
    ],
  },
  {
    id: "squarespace",
    name: "Squarespace",
    loginUrl: "https://account.squarespace.com/domains",
    nameserverMatches: ["squarespacedns.com"],
    steps: [
      "Log in to Squarespace and open Domains.",
      "Choose your domain, then open DNS settings.",
      "Add the two records exactly as shown below.",
      "Save your changes and Refresh Kiwi will keep checking.",
    ],
  },
];

export function genericDomainProvider(): DomainProviderInfo {
  return GENERIC_PROVIDER;
}

// The dashboard polls /api/websites frequently, so cache NS lookups and cap
// how long a lookup may block a response.
const DETECTION_CACHE_TTL_MS = 60 * 60 * 1000;
const DETECTION_FAILURE_TTL_MS = 5 * 60 * 1000;
const DETECTION_TIMEOUT_MS = 2000;

const detectionCache = new Map<
  string,
  { expiresAt: number; provider: DomainProviderInfo }
>();

async function lookupProvider(domain: string): Promise<DomainProviderInfo> {
  const apexDomain = apexDomainFromWww(domain);
  const nameservers = (await resolveNs(apexDomain)).map((nameserver) =>
    nameserver.toLowerCase(),
  );
  const provider = PROVIDERS.find((candidate) =>
    candidate.nameserverMatches.some((match) =>
      nameservers.some((nameserver) => nameserver.includes(match)),
    ),
  );

  if (!provider) {
    return GENERIC_PROVIDER;
  }

  return {
    id: provider.id,
    name: provider.name,
    loginUrl: provider.loginUrl,
    steps: provider.steps,
  };
}

export async function detectDomainProvider(
  domain: string,
): Promise<DomainProviderInfo> {
  const cached = detectionCache.get(domain);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.provider;
  }

  try {
    const provider = await Promise.race([
      lookupProvider(domain),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("NS lookup timed out")), DETECTION_TIMEOUT_MS).unref?.();
      }),
    ]);

    detectionCache.set(domain, {
      expiresAt: Date.now() + DETECTION_CACHE_TTL_MS,
      provider,
    });

    return provider;
  } catch {
    detectionCache.set(domain, {
      expiresAt: Date.now() + DETECTION_FAILURE_TTL_MS,
      provider: GENERIC_PROVIDER,
    });

    return GENERIC_PROVIDER;
  }
}
