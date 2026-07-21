import { readPreviewFile } from "@/lib/preview/serve";

/**
 * SEO plumbing for customer sites served on their own custom domain:
 * generated sitemap.xml / robots.txt (from site.json) and serve-time <head>
 * injection of canonical, Search Console verification, and analytics tags.
 *
 * Everything here is serve-time only — no agent runs, no build time, and it
 * works retroactively for websites generated before this existed.
 */

export interface WebsiteSeoSettings {
  searchConsoleToken: string | null;
  analyticsId: string | null;
}

/**
 * Accepts either the raw Search Console token or the full meta tag Google
 * shows ("<meta name=\"google-site-verification\" content=\"TOKEN\" />").
 * Returns the bare token, or null for empty input.
 */
export function normalizeSearchConsoleToken(input: string): string | null {
  const trimmed = input.trim();

  if (!trimmed) {
    return null;
  }

  const fromTag = trimmed.match(/content\s*=\s*["']([^"']+)["']/i)?.[1];
  const token = (fromTag ?? trimmed).trim();

  if (!/^[A-Za-z0-9_-]{8,128}$/.test(token)) {
    throw new Error(
      "That doesn't look like a Search Console verification code. Paste the code (or the whole meta tag) Google gives you.",
    );
  }

  return token;
}

/** Accepts a GA4 measurement ID like G-ABC123XYZ. Returns null for empty input. */
export function normalizeAnalyticsId(input: string): string | null {
  const trimmed = input.trim().toUpperCase();

  if (!trimmed) {
    return null;
  }

  if (!/^G-[A-Z0-9]{4,20}$/.test(trimmed)) {
    throw new Error(
      'That doesn\'t look like a Google Analytics measurement ID. It starts with "G-", like G-ABC123XYZ.',
    );
  }

  return trimmed;
}

interface SiteJsonPage {
  path?: string;
  title?: string;
}

async function readSitePages(slug: string): Promise<string[]> {
  try {
    const file = await readPreviewFile(slug, ["site.json"]);

    if (!file) {
      return ["/"];
    }

    const parsed = JSON.parse(file.body.toString("utf8")) as {
      pages?: SiteJsonPage[];
    };
    const paths = (parsed.pages ?? [])
      .map((page) => page.path)
      .filter((path): path is string => typeof path === "string" && path.startsWith("/"));

    return paths.length > 0 ? [...new Set(paths)] : ["/"];
  } catch {
    return ["/"];
  }
}

function siteOrigin(host: string): string {
  return `https://${host}`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/** Builds a sitemap.xml for a customer site from its site.json page list. */
export async function buildCustomDomainSitemap(
  slug: string,
  host: string,
): Promise<string> {
  const origin = siteOrigin(host);
  const pages = await readSitePages(slug);
  const entries = pages
    .map((path) => {
      const url = path === "/" ? `${origin}/` : `${origin}${path}`;
      return `  <url>\n    <loc>${escapeXml(url)}</loc>\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

/** Builds a robots.txt for a customer site that allows crawling and points at the sitemap. */
export function buildCustomDomainRobots(host: string): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${siteOrigin(host)}/sitemap.xml\n`;
}

function canonicalPath(pathSegments: string[]): string {
  if (pathSegments.length === 0) {
    return "/";
  }

  const joined = pathSegments.join("/");

  // index.html and .html suffixes resolve to their clean route.
  if (joined === "index.html") {
    return "/";
  }

  return `/${joined.replace(/\/index\.html$/, "").replace(/\.html$/, "")}`;
}

function analyticsSnippet(analyticsId: string): string {
  return [
    `<script async src="https://www.googletagmanager.com/gtag/js?id=${analyticsId}"></script>`,
    `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${analyticsId}');</script>`,
  ].join("\n");
}

/**
 * Injects canonical, Search Console verification, and analytics tags into an
 * HTML page served on a custom domain. Skips any tag the page already has, so
 * agent-written or user-edited tags always win.
 */
export function injectSeoTags(params: {
  html: string;
  host: string;
  pathSegments: string[];
  settings: WebsiteSeoSettings;
}): string {
  const { html, host, pathSegments, settings } = params;
  const headEnd = html.search(/<\/head>/i);

  if (headEnd === -1) {
    return html;
  }

  const tags: string[] = [];

  if (!/rel\s*=\s*["']canonical["']/i.test(html)) {
    const url = `${siteOrigin(host)}${canonicalPath(pathSegments)}`;
    tags.push(`<link rel="canonical" href="${escapeXml(url)}">`);
  }

  if (
    settings.searchConsoleToken &&
    !/name\s*=\s*["']google-site-verification["']/i.test(html)
  ) {
    tags.push(
      `<meta name="google-site-verification" content="${escapeXml(settings.searchConsoleToken)}">`,
    );
  }

  if (settings.analyticsId && !html.includes("googletagmanager.com/gtag/js")) {
    tags.push(analyticsSnippet(settings.analyticsId));
  }

  if (tags.length === 0) {
    return html;
  }

  return `${html.slice(0, headEnd)}${tags.join("\n")}\n${html.slice(headEnd)}`;
}
