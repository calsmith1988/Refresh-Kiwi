import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { eq } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";
import { getAppUrl } from "@/lib/stripe/config";
import { commitFilesToSitesRepo, type RepoFile } from "@/lib/github/commit";
import { logMemoryUsage } from "@/lib/observability/memory";
import { previewDirectory } from "@/lib/preview/paths";
import {
  HOMEPAGE_SCREENSHOT_FILE,
  HOMEPAGE_SCREENSHOT_PATH,
} from "@/lib/screenshots/paths";
import { putSiteFile } from "@/lib/storage/r2";

const { websites } = schema;

const VIEWPORT = { width: 1440, height: 1100 };
const CAPTURE_TIMEOUT_MS = 45_000;
// Generated designs often fade or slide the hero in after load; capturing at
// the load event catches them mid-animation. Let the page settle first.
const SETTLE_AFTER_LOAD_MS = 2_500;
const BLOCKED_SCREENSHOT_EXTENSIONS = /\.(gif|m3u8|m4v|mov|mp4|webm)(?:[?#]|$)/i;

let screenshotQueue: Promise<void> = Promise.resolve();

type PlaywrightChromium = {
  launch(options: {
    args: string[];
  }): Promise<{
    newPage(options: {
      viewport: typeof VIEWPORT;
      deviceScaleFactor: number;
    }): Promise<{
      route(
        url: string,
        handler: (route: {
          request(): {
            resourceType(): string;
            url(): string;
          };
          abort(): Promise<void>;
          continue(): Promise<void>;
        }) => Promise<void>,
      ): Promise<void>;
      goto(url: string, options: {
        waitUntil: "load";
        timeout: number;
      }): Promise<unknown>;
      waitForTimeout(timeout: number): Promise<void>;
      screenshot(options: {
        type: "jpeg";
        quality: number;
        fullPage: boolean;
        timeout: number;
      }): Promise<Buffer | Uint8Array>;
    }>;
    close(): Promise<void>;
  }>;
};

function screenshotsEnabled(): boolean {
  return process.env.SCREENSHOTS_ENABLED?.trim() !== "false";
}

function shouldBlockScreenshotRequest(params: {
  resourceType: string;
  url: string;
}): boolean {
  const resourceType = params.resourceType.toLowerCase();
  const url = params.url.toLowerCase();

  // Fonts are deliberately allowed: blocking them made every screenshot
  // render in fallback system fonts, which misrepresents typography-led
  // designs in the dashboard and emails.
  if (resourceType === "media") {
    return true;
  }

  if (BLOCKED_SCREENSHOT_EXTENSIONS.test(url)) {
    return true;
  }

  // Mux animated thumbnails and similar generated animated WebPs can decode
  // like video in Chromium. Static thumbnails are fine for screenshots.
  return url.includes("/animated.webp");
}

async function loadChromium(): Promise<PlaywrightChromium> {
  const importModule = new Function("specifier", "return import(specifier)") as (
    specifier: string,
  ) => Promise<{ chromium: PlaywrightChromium }>;

  try {
    const { chromium } = await importModule("playwright");
    return chromium;
  } catch (error) {
    throw new Error(
      "Playwright is not installed. Run npm install, or set SCREENSHOTS_ENABLED=false to skip homepage screenshots.",
      { cause: error },
    );
  }
}

async function captureHomepageScreenshot(slug: string): Promise<Buffer> {
  logMemoryUsage("screenshot:before-load-chromium", { slug });
  const chromium = await loadChromium();
  logMemoryUsage("screenshot:before-launch-browser", { slug });
  const browser = await chromium.launch({
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-background-networking",
      "--mute-audio",
    ],
  });
  logMemoryUsage("screenshot:after-launch-browser", { slug });

  try {
    const page = await browser.newPage({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
    });
    logMemoryUsage("screenshot:after-new-page", { slug });
    const url = `${getAppUrl()}/preview/${encodeURIComponent(slug)}/index.html`;

    await page.route("**/*", async (route) => {
      const request = route.request();

      if (
        shouldBlockScreenshotRequest({
          resourceType: request.resourceType(),
          url: request.url(),
        })
      ) {
        await route.abort();
        return;
      }

      await route.continue();
    });

    await page.goto(url, {
      waitUntil: "load",
      timeout: CAPTURE_TIMEOUT_MS,
    });
    logMemoryUsage("screenshot:after-page-load", { slug });

    await page.waitForTimeout(SETTLE_AFTER_LOAD_MS);

    const screenshot = Buffer.from(
      await page.screenshot({
        type: "jpeg",
        quality: 78,
        fullPage: false,
        timeout: CAPTURE_TIMEOUT_MS,
      }),
    );
    logMemoryUsage("screenshot:after-capture", {
      slug,
      bytes: screenshot.byteLength,
    });

    return screenshot;
  } finally {
    await browser.close();
    logMemoryUsage("screenshot:after-close-browser", { slug });
  }
}

async function saveHomepageScreenshot(slug: string, buffer: Buffer) {
  logMemoryUsage("screenshot:before-save", {
    slug,
    bytes: buffer.byteLength,
  });
  const baseDir = previewDirectory(slug);
  const assetsDir = path.join(baseDir, "assets");
  const destination = path.join(assetsDir, HOMEPAGE_SCREENSHOT_FILE);

  await mkdir(assetsDir, { recursive: true });
  await writeFile(destination, buffer);

  try {
    await putSiteFile({
      slug,
      file: HOMEPAGE_SCREENSHOT_PATH,
      body: buffer,
      contentType: "image/jpeg",
    });
  } catch (error) {
    console.error(`[refresh-kiwi] screenshot: failed to upload ${slug} to R2:`, error);
  }

  const repoFiles: RepoFile[] = [
    {
      path: `sites/${slug}/${HOMEPAGE_SCREENSHOT_PATH}`,
      content: await readFile(destination),
    },
  ];

  try {
    await commitFilesToSitesRepo(slug, repoFiles, `Capture homepage screenshot for ${slug}`);
  } catch (error) {
    console.error(
      `[refresh-kiwi] screenshot: failed to commit ${slug} to sites repo:`,
      error,
    );
  }

  logMemoryUsage("screenshot:after-save", {
    slug,
    bytes: buffer.byteLength,
  });
}

async function touchWebsiteUpdatedAt(websiteId: string): Promise<void> {
  await getDb()
    .update(websites)
    .set({ updatedAt: new Date() })
    .where(eq(websites.id, websiteId));
}

export async function captureAndSaveHomepageScreenshot(
  slug: string,
  options?: { websiteId?: string },
): Promise<void> {
  const startedAt = Date.now();
  logMemoryUsage("screenshot:start", { slug });
  const screenshot = await captureHomepageScreenshot(slug);

  await saveHomepageScreenshot(slug, screenshot);

  // Bump after the file is written so dashboard `?v=` cache-busts to the new image.
  if (options?.websiteId) {
    await touchWebsiteUpdatedAt(options.websiteId);
  }

  console.info(
    `[refresh-kiwi] screenshot: captured homepage for ${slug} in ${(
      (Date.now() - startedAt) /
      1000
    ).toFixed(1)}s`,
  );
}

export async function tryCaptureHomepageScreenshot(
  slug: string,
  options?: { websiteId?: string },
): Promise<void> {
  if (!screenshotsEnabled()) {
    console.info(`[refresh-kiwi] screenshot: skipped for ${slug}; disabled by env`);
    return;
  }

  screenshotQueue = screenshotQueue
    .catch(() => {
      // Keep the single-process queue alive after failures.
    })
    .then(async () => {
      try {
        await captureAndSaveHomepageScreenshot(slug, options);
      } catch (error) {
        console.error(
          `[refresh-kiwi] screenshot: failed to capture homepage for ${slug}:`,
          error,
        );
      }
    });

  return screenshotQueue;
}
