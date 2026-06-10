import { NextResponse, type NextRequest } from "next/server";

const APP_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "refresh.kiwi",
  "www.refresh.kiwi",
  "refresh-kiwi.onrender.com",
]);

function normalizeHost(request: NextRequest): string {
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";

  return host.split(":")[0]?.toLowerCase() ?? "";
}

export function middleware(request: NextRequest) {
  const host = normalizeHost(request);
  const { pathname } = request.nextUrl;

  if (
    !host ||
    APP_HOSTS.has(host) ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/custom-domain") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/preview")
  ) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/custom-domain/${pathname.replace(/^\/+/, "")}`;
  url.searchParams.set("host", host);

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
