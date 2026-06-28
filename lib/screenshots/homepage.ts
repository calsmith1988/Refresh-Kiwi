import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

import { getAppUrl } from "@/lib/stripe/config";
import { commitFilesToSitesRepo, type RepoFile } from "@/lib/github/commit";
import { previewDirectory } from "@/lib/preview/paths";
import {
  HOMEPAGE_SCREENSHOT_FILE,
  HOMEPAGE_SCREENSHOT_PATH,
} from "@/lib/screenshots/paths";

const VIEWPORT = { width: 1440, height: 1100 };
const CAPTURE_TIMEOUT_MS = 45_000;

let screenshotQueue: Promise<void> = Promise.resolve();

function screenshotsEnabled(): boolean {
  return process.env.SCREENSHOTS_ENABLED?.trim() !== "false";
}

async function captureHomepageScreenshot(slug: string): Promise<Buffer> {
  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
    });
    const url = `${getAppUrl()}/preview/${encodeURIComponent(slug)}/index.html`;

    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: CAPTURE_TIMEOUT_MS,
    });

    return Buffer.from(
      await page.screenshot({
        type: "jpeg",
        quality: 78,
        fullPage: false,
        timeout: CAPTURE_TIMEOUT_MS,
      }),
    );
  } finally {
    await browser.close();
  }
}

async function saveHomepageScreenshot(slug: string, buffer: Buffer) {
  const baseDir = previewDirectory(slug);
  const assetsDir = path.join(baseDir, "assets");
  const destination = path.join(assetsDir, HOMEPAGE_SCREENSHOT_FILE);

  await mkdir(assetsDir, { recursive: true });
  await writeFile(destination, buffer);

  const repoFiles: RepoFile[] = [
    {
      path: `sites/${slug}/${HOMEPAGE_SCREENSHOT_PATH}`,
      content: await readFile(destination),
    },
  ];

  await commitFilesToSitesRepo(repoFiles, `Capture homepage screenshot for ${slug}`);
}

export async function captureAndSaveHomepageScreenshot(
  slug: string,
): Promise<void> {
  const startedAt = Date.now();
  const screenshot = await captureHomepageScreenshot(slug);

  await saveHomepageScreenshot(slug, screenshot);

  console.info(
    `[refresh-kiwi] screenshot: captured homepage for ${slug} in ${(
      (Date.now() - startedAt) /
      1000
    ).toFixed(1)}s`,
  );
}

export async function tryCaptureHomepageScreenshot(slug: string): Promise<void> {
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
        await captureAndSaveHomepageScreenshot(slug);
      } catch (error) {
        console.error(
          `[refresh-kiwi] screenshot: failed to capture homepage for ${slug}:`,
          error,
        );
      }
    });

  return screenshotQueue;
}
