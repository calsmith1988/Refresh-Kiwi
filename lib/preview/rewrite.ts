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
