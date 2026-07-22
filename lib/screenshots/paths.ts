export const HOMEPAGE_SCREENSHOT_FILE = "homepage-screenshot.jpg";
export const HOMEPAGE_SCREENSHOT_PATH = `assets/${HOMEPAGE_SCREENSHOT_FILE}`;

/**
 * Dashboard thumbnails reuse the same filename after every edit/image change.
 * Pass a version (usually websites.updatedAt) so browsers fetch the new file.
 */
export function homepageScreenshotPath(
  slug: string,
  version?: string | number | Date | null,
): string {
  const base = `/preview/${slug}/${HOMEPAGE_SCREENSHOT_PATH}`;

  if (version == null || version === "") {
    return base;
  }

  const cacheKey =
    version instanceof Date ? version.getTime() : version;

  return `${base}?v=${encodeURIComponent(String(cacheKey))}`;
}
