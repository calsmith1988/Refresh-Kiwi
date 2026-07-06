import { NextResponse, type NextRequest } from "next/server";

import { CUSTOM_DOMAIN_HOST_HEADER } from "@/lib/security/headers";

const APP_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "refresh.kiwi",
  "www.refresh.kiwi",
  "refresh-kiwi.onrender.com",
]);

function normalizeHost(request: NextRequest): string {
  const host =
    request.headers.get("host") ?? request.headers.get("x-forwarded-host") ?? "";

  return host.split(":")[0]?.toLowerCase() ?? "";
}

export function middleware(request: NextRequest) {
  const host = normalizeHost(request);
  const { pathname } = request.nextUrl;

  // Server-side guard: visiting the dashboard signed out bounces straight
  // home instead of flashing an empty dashboard first.
  if (
    pathname.startsWith("/dashboard") &&
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
