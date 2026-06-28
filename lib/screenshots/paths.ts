export const HOMEPAGE_SCREENSHOT_FILE = "homepage-screenshot.jpg";
export const HOMEPAGE_SCREENSHOT_PATH = `assets/${HOMEPAGE_SCREENSHOT_FILE}`;

export function homepageScreenshotPath(slug: string): string {
  return `/preview/${slug}/${HOMEPAGE_SCREENSHOT_PATH}`;
}
