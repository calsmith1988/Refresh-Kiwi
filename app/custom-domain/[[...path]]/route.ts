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
import { sitesSlugFromHost } from "@/lib/sites/domain";
import {
  getWebsiteAccessByCustomDomain,
  getWebsiteAccessBySitesSlug,
} from "@/lib/websites/service";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ path?: string[] }>;
}

type ServedWebsite = {
  slug: string;
  customDomain: string | null;
  customDomainStatus?: string | null;
  seoSearchConsoleToken: string | null;
  seoAnalyticsId: string | null;
  redirectToCustomDomain: string | null;
};

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

function notFound(reason: string, extra: Record<string, string> = {}) {
  return NextResponse.json(
    { error: "Website not found", reason, ...extra },
    { status: 404 },
  );
}

async function resolveWebsite(host: string): Promise<ServedWebsite | null> {
  const sitesSlug = sitesSlugFromHost(host);

  if (sitesSlug) {
    const access = await getWebsiteAccessBySitesSlug(sitesSlug);

    if (!access?.isSitesEligible) {
      return null;
    }

    const redirectToCustomDomain =
      access.customDomainStatus === "connected" && access.customDomain
        ? access.customDomain
        : null;

    return {
      slug: access.slug,
      customDomain: access.customDomain,
      customDomainStatus: access.customDomainStatus,
      seoSearchConsoleToken: access.seoSearchConsoleToken,
      seoAnalyticsId: access.seoAnalyticsId,
      redirectToCustomDomain,
    };
  }

  const access = await getWebsiteAccessByCustomDomain(host);

  if (!access?.isAllowed) {
    return null;
  }

  return {
    slug: access.slug,
    customDomain: access.customDomain,
    customDomainStatus: access.customDomainStatus,
    seoSearchConsoleToken: access.seoSearchConsoleToken,
    seoAnalyticsId: access.seoAnalyticsId,
    redirectToCustomDomain: null,
  };
}

export async function GET(request: Request, context: RouteContext) {
  // Only the middleware-set header is trusted here. The ?host= query param
  // and the raw Host header are client-controlled, so honouring them would
  // let anyone serve a connected customer's site from the app's own origin.
  const host =
    request.headers.get(CUSTOM_DOMAIN_HOST_HEADER)?.trim().toLowerCase() ||
    null;

  if (!host) {
    return notFound("missing_host");
  }

  const website = await resolveWebsite(host);

  if (!website) {
    return notFound(
      sitesSlugFromHost(host) ? "sites_not_eligible" : "domain_not_connected",
      { host },
    );
  }

  const { path } = await context.params;

  // Once a real custom domain is connected, the sites subdomain is a
  // permanent redirect so Google only indexes one host.
  if (website.redirectToCustomDomain) {
    const targetPath =
      path && path.length > 0 ? `/${path.join("/")}` : "/";
    return NextResponse.redirect(
      `https://${website.redirectToCustomDomain}${targetPath}`,
      301,
    );
  }

  const file = await readPreviewFile(website.slug, path ?? []);

  // Canonical host: prefer a connected custom domain; otherwise the host the
  // visitor used (sites subdomain or the connected domain itself).
  const canonicalHost =
    website.customDomainStatus === "connected" && website.customDomain
      ? website.customDomain
      : host;

  // Generated sitemap/robots from site.json — only when the site itself
  // doesn't ship those files, so hand-written versions always win.
  if (!file && path?.length === 1) {
    if (path[0] === "sitemap.xml") {
      return new NextResponse(
        await buildCustomDomainSitemap(website.slug, canonicalHost),
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
    return notFound("file_not_found", { slug: website.slug });
  }

  let body = rewriteLocalPreviewOrigins(file.body, file.contentType);

  if (typeof body === "string" && isHtmlContentType(file.contentType)) {
    body = injectSeoTags({
      html: body,
      host: canonicalHost,
      pathSegments: path ?? [],
      settings: {
        searchConsoleToken: website.seoSearchConsoleToken,
        analyticsId: website.seoAnalyticsId,
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
