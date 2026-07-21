import { NextResponse } from "next/server";

import { readPreviewFile } from "@/lib/preview/serve";
import {
  canRewritePreviewContent,
  rewriteLocalPreviewOriginsText,
} from "@/lib/preview/rewrite";
import { isSvgContentType, svgSecurityHeaders } from "@/lib/assets/validate";
import { CUSTOM_DOMAIN_HOST_HEADER } from "@/lib/security/headers";
import {
  buildCustomDomainRobots,
  buildCustomDomainSitemap,
  injectSeoTags,
} from "@/lib/seo/customDomain";
import { getWebsiteAccessByCustomDomain } from "@/lib/websites/service";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ path?: string[] }>;
}

function rewriteLocalPreviewOrigins(
  body: Buffer,
  contentType: string,
): Blob | string {
  if (!canRewritePreviewContent(contentType)) {
    const arrayBuffer = body.buffer.slice(
      body.byteOffset,
      body.byteOffset + body.byteLength,
    ) as ArrayBuffer;

    return new Blob([arrayBuffer]);
  }

  return rewriteLocalPreviewOriginsText(body.toString("utf8"));
}

function isHtmlContentType(contentType: string): boolean {
  return contentType.split(";")[0].trim() === "text/html";
}

export async function GET(request: Request, context: RouteContext) {
  // Only the middleware-set header is trusted here. The ?host= query param
  // and the raw Host header are client-controlled, so honouring them would
  // let anyone serve a connected customer's site from the app's own origin.
  const host =
    request.headers.get(CUSTOM_DOMAIN_HOST_HEADER)?.trim().toLowerCase() ||
    null;

  if (!host) {
    return NextResponse.json(
      { error: "Website not found", reason: "missing_host" },
      { status: 404 },
    );
  }

  const websiteAccess = await getWebsiteAccessByCustomDomain(host);

  if (!websiteAccess || !websiteAccess.isAllowed) {
    return NextResponse.json(
      { error: "Website not found", reason: "domain_not_connected", host },
      { status: 404 },
    );
  }

  const { path } = await context.params;
  const file = await readPreviewFile(websiteAccess.slug, path ?? []);

  // Canonical host: the domain as connected in the dashboard, so www and
  // bare-domain requests both point search engines at one version.
  const canonicalHost = websiteAccess.customDomain ?? host;

  // Generated sitemap/robots from site.json — only when the site itself
  // doesn't ship those files, so hand-written versions always win.
  if (!file && path?.length === 1) {
    if (path[0] === "sitemap.xml") {
      return new NextResponse(
        await buildCustomDomainSitemap(websiteAccess.slug, canonicalHost),
        {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        },
      );
    }

    if (path[0] === "robots.txt") {
      return new NextResponse(buildCustomDomainRobots(canonicalHost), {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }
  }

  if (!file) {
    return NextResponse.json(
      { error: "Page not found", reason: "file_not_found", slug: websiteAccess.slug },
      { status: 404 },
    );
  }

  let body = rewriteLocalPreviewOrigins(file.body, file.contentType);

  if (typeof body === "string" && isHtmlContentType(file.contentType)) {
    body = injectSeoTags({
      html: body,
      host: canonicalHost,
      pathSegments: path ?? [],
      settings: {
        searchConsoleToken: websiteAccess.seoSearchConsoleToken,
        analyticsId: websiteAccess.seoAnalyticsId,
      },
    });
  }

  return new NextResponse(body, {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "public, max-age=60",
      ...(isSvgContentType(file.contentType) ? svgSecurityHeaders() : {}),
    },
  });
}

export const HEAD = GET;
