import { NextResponse } from "next/server";

import { readPreviewFile } from "@/lib/preview/serve";
import {
  canRewritePreviewContent,
  rewriteLocalPreviewOriginsText,
  rewritePreviewPathsToRootText,
} from "@/lib/preview/rewrite";
import { isSvgContentType, svgSecurityHeaders } from "@/lib/assets/validate";
import { CUSTOM_DOMAIN_HOST_HEADER } from "@/lib/security/headers";
import {
  buildCustomDomainRobots,
  buildCustomDomainSitemap,
  injectSeoTags,
} from "@/lib/seo/customDomain";
import { getSitesDomain, sitesSlugFromHost } from "@/lib/sites/domain";
import {
  getWebsiteAccessByCustomDomain,
  getWebsiteAccessBySitesLabel,
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
  /** Host to 301 to (custom domain, or renamed sites subdomain). */
  redirectToHost: string | null;
};

function rewriteServedContent(
  body: Buffer,
  contentType: string,
  slug: string,
): Blob | string {
  if (!canRewritePreviewContent(contentType)) {
    const arrayBuffer = body.buffer.slice(
      body.byteOffset,
      body.byteOffset + body.byteLength,
    ) as ArrayBuffer;

    return new Blob([arrayBuffer]);
  }

  // Origin scrub first: stripping a baked-in localhost origin exposes its
  // /preview/{slug}/ path as root-relative, which the second pass then cleans.
  return rewritePreviewPathsToRootText(
    rewriteLocalPreviewOriginsText(body.toString("utf8")),
    slug,
  );
}

function isHtmlContentType(contentType: string): boolean {
  return contentType.split(";")[0].trim() === "text/html";
}

function wantsHtml(request: Request): boolean {
  return (request.headers.get("accept") ?? "").includes("text/html");
}

/**
 * Branded 404 for visitors who land on a deleted site or a missing page —
 * a raw JSON error at someone's old bookmark looks broken. Non-HTML requests
 * (assets, API-ish callers) still get the JSON payload.
 */
function notFoundPage(params: { title: string; body: string; ctaHref: string; ctaLabel: string }) {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${params.title}</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #faf8f1; color: #141811; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
  .card { max-width: 26rem; margin: 1.25rem; padding: 2.5rem 2rem; background: #fff; border: 1px solid rgba(0,0,0,.1); border-radius: 2rem; box-shadow: 0 20px 40px rgba(0,0,0,.08); text-align: center; }
  h1 { font-size: 1.5rem; margin: 0 0 .75rem; letter-spacing: -.02em; }
  p { margin: 0 0 1.5rem; font-size: .9rem; line-height: 1.6; color: rgba(20,24,17,.6); }
  a { display: inline-block; padding: .75rem 1.5rem; border-radius: 999px; background: #c5e66a; color: #141811; font-size: .875rem; font-weight: 600; text-decoration: none; }
</style>
</head>
<body>
<main class="card">
<h1>${params.title}</h1>
<p>${params.body}</p>
<a href="${params.ctaHref}">${params.ctaLabel}</a>
</main>
</body>
</html>`;

  return new NextResponse(html, {
    status: 404,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function notFound(
  request: Request,
  reason: string,
  extra: Record<string, string> = {},
) {
  if (wantsHtml(request)) {
    // A missing page on a live site links back to that site's homepage; a
    // missing site altogether links to Refresh Kiwi.
    if (reason === "file_not_found") {
      return notFoundPage({
        title: "Page not found",
        body: "This page doesn't exist — it may have been renamed or removed.",
        ctaHref: "/",
        ctaLabel: "Go to the homepage",
      });
    }

    return notFoundPage({
      title: "This website isn't here any more",
      body: "The website you're looking for has been taken offline or moved. If it's yours, you can manage or rebuild it at Refresh Kiwi.",
      ctaHref: "https://refresh.kiwi",
      ctaLabel: "Visit Refresh Kiwi",
    });
  }

  return NextResponse.json(
    { error: "Website not found", reason, ...extra },
    { status: 404 },
  );
}

async function resolveWebsite(host: string): Promise<ServedWebsite | null> {
  const sitesLabel = sitesSlugFromHost(host);

  if (sitesLabel) {
    const access = await getWebsiteAccessBySitesLabel(sitesLabel);

    if (!access?.isSitesEligible) {
      return null;
    }

    // Priority: connected custom domain > canonical sites label. Both are
    // 301s so search engines only ever index one host per site.
    const redirectToHost =
      access.customDomainStatus === "connected" && access.customDomain
        ? access.customDomain
        : access.sitesLabel !== sitesLabel
          ? `${access.sitesLabel}.${getSitesDomain()}`
          : null;

    return {
      slug: access.slug,
      customDomain: access.customDomain,
      customDomainStatus: access.customDomainStatus,
      seoSearchConsoleToken: access.seoSearchConsoleToken,
      seoAnalyticsId: access.seoAnalyticsId,
      redirectToHost,
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
    redirectToHost: null,
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
    return notFound(request, "missing_host");
  }

  const website = await resolveWebsite(host);

  if (!website) {
    return notFound(
      request,
      sitesSlugFromHost(host) ? "sites_not_eligible" : "domain_not_connected",
      { host },
    );
  }

  const { path } = await context.params;

  if (website.redirectToHost) {
    const targetPath =
      path && path.length > 0 ? `/${path.join("/")}` : "/";
    return NextResponse.redirect(
      `https://${website.redirectToHost}${targetPath}`,
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
    return notFound(request, "file_not_found", { slug: website.slug });
  }

  let body = rewriteServedContent(file.body, file.contentType, website.slug);

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
