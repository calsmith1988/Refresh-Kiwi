import { NextResponse, type NextRequest } from "next/server";

import {
  getAppMarketingUrl,
  isSitesApexHost,
  sitesSlugFromHost,
} from "@/lib/sites/domain";
import { INDEXNOW_KEY_PATH } from "@/lib/seo/indexnow";
import { CUSTOM_DOMAIN_HOST_HEADER } from "@/lib/security/headers";

const APP_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "refresh.kiwi",
  "www.refresh.kiwi",
  "refresh-kiwi.onrender.com",
]);

const MARKETING_METADATA_PATHS = new Set([
  "/sitemap.xml",
  "/robots.txt",
  "/llms.txt",
  INDEXNOW_KEY_PATH,
]);

function normalizeHostname(raw: string): string {
  return raw.split(":")[0]?.toLowerCase().replace(/\.+$/, "") ?? "";
}

function collectHostCandidates(request: NextRequest): string[] {
  const candidates = new Set<string>();

  const hostHeader = request.headers.get("host");

  if (hostHeader) {
    candidates.add(normalizeHostname(hostHeader));
  }

  const forwardedHost = request.headers.get("x-forwarded-host");

  if (forwardedHost) {
    for (const part of forwardedHost.split(",")) {
      const normalized = normalizeHostname(part.trim());

      if (normalized) {
        candidates.add(normalized);
      }
    }
  }

  const urlHost = normalizeHostname(request.nextUrl.hostname);

  if (urlHost) {
    candidates.add(urlHost);
  }

  return [...candidates];
}

function normalizeHost(request: NextRequest): string {
  return collectHostCandidates(request)[0] ?? "";
}

function isMarketingHostName(host: string): boolean {
  if (!host || APP_HOSTS.has(host)) {
    return !host || APP_HOSTS.has(host);
  }

  try {
    const marketingHost = new URL(getAppMarketingUrl()).hostname
      .toLowerCase()
      .replace(/\.+$/, "");

    return host === marketingHost || host === `www.${marketingHost}`;
  } catch {
    return false;
  }
}

function isMarketingRequest(request: NextRequest): boolean {
  return collectHostCandidates(request).some(isMarketingHostName);
}

export function middleware(request: NextRequest) {
  const host = normalizeHost(request);
  const { pathname } = request.nextUrl;

  // Server-side guard: visiting the dashboard or admin signed out bounces
  // straight home instead of flashing an empty page first. (Admin access is
  // additionally enforced server-side by the ADMIN_EMAILS allowlist.)
  if (
    (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) &&
    !request.cookies.has("refresh_kiwi_session")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";

    return NextResponse.redirect(url);
  }

  // Never forward a client-supplied copy of the internal host header.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(CUSTOM_DOMAIN_HOST_HEADER);

  // Marketing metadata routes must always reach the app handlers (sitemap,
  // robots, llms.txt, IndexNow key file), never the custom-domain rewrite (which
  // can error when
  // the Host header and public URL disagree behind a proxy).
  if (MARKETING_METADATA_PATHS.has(pathname) && isMarketingRequest(request)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Sites domain apex is not a customer site — send people to the app.
  if (host && isSitesApexHost(host)) {
    return NextResponse.redirect(`${getAppMarketingUrl()}/`, 308);
  }

  // `{slug}.refreshkiwi.site` — same serving path as connected custom domains.
  if (host && sitesSlugFromHost(host)) {
    if (
      pathname.startsWith("/api") ||
      pathname.startsWith("/custom-domain") ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/preview")
    ) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    requestHeaders.set(CUSTOM_DOMAIN_HOST_HEADER, host);

    const url = request.nextUrl.clone();
    url.pathname = `/custom-domain/${pathname.replace(/^\/+/, "")}`;
    url.searchParams.delete("host");

    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  if (
    !host ||
    APP_HOSTS.has(host) ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/custom-domain") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/preview")
  ) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  requestHeaders.set(CUSTOM_DOMAIN_HOST_HEADER, host);

  const url = request.nextUrl.clone();
  url.pathname = `/custom-domain/${pathname.replace(/^\/+/, "")}`;
  url.searchParams.delete("host");

  return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
