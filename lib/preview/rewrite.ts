const LOCAL_PREVIEW_ORIGIN_PATTERN =
  /(?:https?:)?\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/gi;
const ESCAPED_LOCAL_PREVIEW_ORIGIN_PATTERN =
  /(?:https?:)?\\\/\\\/(?:localhost|127\.0\.0\.1)(?::\d+)?/gi;

export const REWRITABLE_PREVIEW_CONTENT_TYPES = [
  "text/html",
  "text/css",
  "text/javascript",
  "application/json",
];

export function canRewritePreviewContent(contentType: string): boolean {
  return REWRITABLE_PREVIEW_CONTENT_TYPES.some((rewritableType) =>
    contentType.startsWith(rewritableType),
  );
}

export function rewriteLocalPreviewOriginsText(value: string): string {
  return value
    .replace(LOCAL_PREVIEW_ORIGIN_PATTERN, "")
    .replace(ESCAPED_LOCAL_PREVIEW_ORIGIN_PATTERN, "");
}

/**
 * On live hosts (custom domains and refreshkiwi.site subdomains) the site is
 * served from the domain root, but generated files link with the preview-style
 * /preview/{slug}/ prefix (that's what every prompt instructs, so the same
 * files work on the /preview dashboard surface). Stripping the prefix at serve
 * time gives live visitors clean root paths and retroactively fixes every
 * already-published site without touching its repo.
 *
 * Only root-relative occurrences are rewritten: the negative lookbehind skips
 * paths inside absolute URLs (e.g. og:image pointing at the app origin), which
 * must keep resolving on the app host. Escaped variants cover JSON and inline
 * JS string literals. Call after rewriteLocalPreviewOriginsText — scrubbing a
 * localhost origin first is what exposes its path as root-relative.
 */
export function rewritePreviewPathsToRootText(
  value: string,
  slug: string,
): string {
  // Slugs are strictly [a-z0-9-] (see lib/jobs/slug.ts), so the interpolation
  // is regex-safe. The trailing group either consumes the path separator or
  // requires the match to end at a non-path character, so a different slug
  // sharing this one as a prefix (e.g. "{slug}-2") is never touched.
  const plainPattern = new RegExp(
    `(?<![A-Za-z0-9.-])/preview/${slug}(?:/|(?![A-Za-z0-9_-]))`,
    "g",
  );
  const escapedPattern = new RegExp(
    `(?<![A-Za-z0-9.-])\\\\/preview\\\\/${slug}(?:\\\\/|(?![A-Za-z0-9_-]))`,
    "g",
  );

  return value.replace(plainPattern, "/").replace(escapedPattern, "\\/");
}

/**
 * Agents are told to reference their own files with /preview/{slug}/ paths,
 * but occasionally write site-root paths instead (href="/styles.css"). Those
 * work on live custom domains/subdomains — where the site owns the whole
 * origin — but 404 under /preview/{slug}/, so the preview renders unstyled.
 * This safety net rewrites root paths to the preview prefix at serve time.
 *
 * App-owned paths (/api/... for the contact-form relay, /preview/... when
 * already correct) and protocol-relative //host URLs are left untouched.
 */
const PRESERVED_ROOT_PREFIXES = ["preview/", "api/", "_next/"];

function previewPath(slug: string, rootPath: string): string {
  if (
    PRESERVED_ROOT_PREFIXES.some((prefix) => rootPath.startsWith(prefix))
  ) {
    return `/${rootPath}`;
  }

  return `/preview/${slug}/${rootPath}`;
}

const HTML_URL_ATTRIBUTE_PATTERN =
  /\b(href|src|poster|action)=("|')\/(?!\/)([^"']*)\2/gi;
const HTML_SRCSET_ATTRIBUTE_PATTERN = /\b(srcset)=("|')([^"']*)\2/gi;
const CSS_URL_PATTERN = /\burl\(\s*("|')?\/(?!\/)([^"')\s]*)\1?\s*\)/gi;
const CSS_IMPORT_PATTERN = /@import\s+("|')\/(?!\/)([^"']*)\1/gi;

function rewriteCssRootPaths(value: string, slug: string): string {
  return value
    .replace(CSS_URL_PATTERN, (_match, quote: string | undefined, rootPath: string) => {
      const q = quote ?? "";
      return `url(${q}${previewPath(slug, rootPath)}${q})`;
    })
    .replace(CSS_IMPORT_PATTERN, (_match, quote: string, rootPath: string) => {
      return `@import ${quote}${previewPath(slug, rootPath)}${quote}`;
    });
}

function rewriteSrcsetValue(value: string, slug: string): string {
  return value
    .split(",")
    .map((candidate) => {
      const trimmed = candidate.trim();

      if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
        return trimmed;
      }

      const [url, ...descriptors] = trimmed.split(/\s+/);

      return [previewPath(slug, url.slice(1)), ...descriptors].join(" ");
    })
    .join(", ");
}

export function rewriteRootPathsForPreview(
  value: string,
  slug: string,
  contentType: string,
): string {
  const baseType = contentType.split(";")[0].trim().toLowerCase();

  if (baseType === "text/css") {
    return rewriteCssRootPaths(value, slug);
  }

  if (baseType !== "text/html") {
    return value;
  }

  const html = value
    .replace(
      HTML_URL_ATTRIBUTE_PATTERN,
      (_match, attribute: string, quote: string, rootPath: string) => {
        return `${attribute}=${quote}${previewPath(slug, rootPath)}${quote}`;
      },
    )
    .replace(
      HTML_SRCSET_ATTRIBUTE_PATTERN,
      (_match, attribute: string, quote: string, srcset: string) => {
        return `${attribute}=${quote}${rewriteSrcsetValue(srcset, slug)}${quote}`;
      },
    );

  // Inline <style> blocks and style="" attributes can also carry url(/...)
  // references.
  return rewriteCssRootPaths(html, slug);
}
