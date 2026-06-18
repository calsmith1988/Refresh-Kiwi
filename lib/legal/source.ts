export type DiscoveredLegalPage = {
  title: string;
  url: string;
  text: string;
};

export type LegalSourceDiscovery = {
  pages: DiscoveredLegalPage[];
  summary: string;
  content: string;
};

const LEGAL_LINK_PATTERN = /(privacy|cookie|cookies|terms|legal|gdpr)/i;
const SOURCE_FETCH_TIMEOUT_MS = 8000;
const MAX_LEGAL_PAGES = 3;
const MAX_PAGE_TEXT_CHARS = 12_000;

async function fetchText(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SOURCE_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Refresh Kiwi legal-page discovery (+https://refresh.kiwi)",
      },
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return null;
    }

    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripHtml(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  ).slice(0, MAX_PAGE_TEXT_CHARS);
}

function extractTitle(html: string, fallback: string): string {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];

  return decodeEntities(title?.replace(/\s+/g, " ").trim() || fallback);
}

function legalLinksFromHomepage(homepageHtml: string, sourceUrl: string): string[] {
  const urls = new Set<string>();
  const source = new URL(sourceUrl);
  const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of homepageHtml.matchAll(anchorPattern)) {
    const href = decodeEntities(match[1] ?? "").trim();
    const label = stripHtml(match[2] ?? "");

    if (!href || (!LEGAL_LINK_PATTERN.test(href) && !LEGAL_LINK_PATTERN.test(label))) {
      continue;
    }

    try {
      const url = new URL(href, source);
      if (url.hostname.replace(/^www\./, "") !== source.hostname.replace(/^www\./, "")) {
        continue;
      }

      url.hash = "";
      urls.add(url.toString());
    } catch {
      // Ignore malformed links.
    }
  }

  return [...urls].slice(0, MAX_LEGAL_PAGES);
}

export async function discoverLegalPagesFromSource(
  sourceUrl: string,
): Promise<LegalSourceDiscovery> {
  const homepageHtml = await fetchText(sourceUrl);

  if (!homepageHtml) {
    return {
      pages: [],
      summary: "No source legal pages could be fetched quickly.",
      content: "",
    };
  }

  const links = legalLinksFromHomepage(homepageHtml, sourceUrl);
  const pages: DiscoveredLegalPage[] = [];

  for (const url of links) {
    const html = await fetchText(url);
    if (!html) {
      continue;
    }

    const text = stripHtml(html);
    if (text.length < 100) {
      continue;
    }

    pages.push({
      title: extractTitle(html, url),
      url,
      text,
    });
  }

  if (pages.length === 0) {
    return {
      pages,
      summary:
        "No usable legal page content was found from the source site during the quick check.",
      content: "",
    };
  }

  return {
    pages,
    summary: `Found ${pages.length} likely legal page${pages.length === 1 ? "" : "s"} on the source site: ${pages
      .map((page) => `${page.title} (${page.url})`)
      .join(", ")}.`,
    content: pages
      .map(
        (page) =>
          `## Existing source legal page: ${page.title}\nURL: ${page.url}\n\n${page.text}`,
      )
      .join("\n\n---\n\n"),
  };
}
