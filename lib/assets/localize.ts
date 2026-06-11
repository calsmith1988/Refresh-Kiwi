import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { commitFilesToSitesRepo, type RepoFile } from "@/lib/github/commit";
import { previewDirectory } from "@/lib/preview/paths";
import { syncFromGithubMain } from "@/lib/preview/sync";

/**
 * Localise-on-claim: downloads images that generated sites hotlink from the
 * original website, stores them under the site's assets/ folder, rewrites all
 * references, and writes assets/manifest.json (the basis for the upcoming
 * image panel). Safe to run repeatedly — already-local sites are a no-op.
 *
 * Asset storage currently writes to the preview directory on disk and the
 * sites repo on GitHub. If we move binaries to R2/S3 later, only saveAsset()
 * and localAssetUrl() need to change.
 */

const MAX_IMAGES_PER_SITE = 60;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 20_000;
const DOWNLOAD_CONCURRENCY = 4;

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "image/x-icon": ".ico",
  "image/vnd.microsoft.icon": ".ico",
  "image/avif": ".avif",
};

export type LocalizedImage = {
  id: string;
  /** Path relative to the site root, e.g. "assets/img-ab12cd34.webp" */
  file: string;
  /** Public URL served by the preview route */
  url: string;
  originalUrl: string;
  contentType: string;
  bytes: number;
};

export type ImageManifest = {
  version: 1;
  slug: string;
  localizedAt: string;
  images: LocalizedImage[];
};

export type LocalizeResult = {
  slug: string;
  localized: number;
  failed: number;
  skipped: boolean;
};

function localAssetUrl(slug: string, fileName: string): string {
  return `/preview/${slug}/assets/${fileName}`;
}

function isLocalizableUrl(url: string): boolean {
  if (!/^https:\/\//i.test(url)) {
    return false;
  }

  try {
    const parsed = new URL(url);

    // Never re-download things we already host.
    if (
      parsed.hostname === "refresh.kiwi" ||
      parsed.hostname.endsWith(".refresh.kiwi") ||
      parsed.hostname === "localhost"
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Collects candidate external URLs from HTML/CSS. Over-collection is fine:
 * anything that doesn't download as an image/* response is left untouched.
 */
function extractCandidateUrls(content: string): Set<string> {
  const urls = new Set<string>();

  // src / poster attributes
  for (const match of content.matchAll(
    /(?:src|poster)\s*=\s*["'](https:\/\/[^"']+)["']/gi,
  )) {
    urls.add(match[1]);
  }

  // srcset attributes — comma-separated "url descriptor" pairs
  for (const match of content.matchAll(/srcset\s*=\s*["']([^"']+)["']/gi)) {
    for (const entry of match[1].split(",")) {
      const url = entry.trim().split(/\s+/)[0];

      if (url?.startsWith("https://")) {
        urls.add(url);
      }
    }
  }

  // CSS url(...) — covers stylesheets and inline style attributes
  for (const match of content.matchAll(
    /url\(\s*["']?(https:\/\/[^"')\s]+)["']?\s*\)/gi,
  )) {
    urls.add(match[1]);
  }

  return urls;
}

function assetFileName(originalUrl: string, contentType: string): string {
  const hash = createHash("sha1").update(originalUrl).digest("hex").slice(0, 10);
  let extension = IMAGE_EXTENSIONS[contentType.split(";")[0].trim()] ?? "";

  if (!extension) {
    const urlExtension = path.extname(new URL(originalUrl).pathname).toLowerCase();
    extension = /^\.(png|jpe?g|gif|webp|svg|ico|avif)$/.test(urlExtension)
      ? urlExtension
      : ".img";
  }

  return `img-${hash}${extension}`;
}

async function downloadImage(
  url: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; RefreshKiwi/1.0; +https://refresh.kiwi)",
        Accept: "image/*,*/*;q=0.8",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.startsWith("image/")) {
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    if (buffer.byteLength === 0 || buffer.byteLength > MAX_IMAGE_BYTES) {
      return null;
    }

    return { buffer, contentType: contentType.split(";")[0].trim() };
  } catch {
    return null;
  }
}

async function listSiteTextFiles(baseDir: string): Promise<string[]> {
  const entries = await readdir(baseDir, {
    recursive: true,
    withFileTypes: true,
  });

  return entries
    .filter(
      (entry) =>
        entry.isFile() && /\.(html|css)$/i.test(entry.name),
    )
    .map((entry) => path.join(entry.parentPath, entry.name));
}

async function ensureLocalSiteFiles(slug: string): Promise<string | null> {
  const baseDir = previewDirectory(slug);

  try {
    const dirStat = await stat(baseDir);

    if (dirStat.isDirectory()) {
      return baseDir;
    }
  } catch {
    // Fall through to GitHub sync below.
  }

  try {
    const synced = await syncFromGithubMain(slug, baseDir);
    return synced ? baseDir : null;
  } catch {
    return null;
  }
}

async function saveAsset(
  baseDir: string,
  fileName: string,
  buffer: Buffer,
): Promise<void> {
  const assetsDir = path.join(baseDir, "assets");
  await mkdir(assetsDir, { recursive: true });
  await writeFile(path.join(assetsDir, fileName), buffer);
}

async function readExistingManifest(
  baseDir: string,
): Promise<ImageManifest | null> {
  try {
    const raw = await readFile(
      path.join(baseDir, "assets", "manifest.json"),
      "utf8",
    );
    return JSON.parse(raw) as ImageManifest;
  } catch {
    return null;
  }
}

export async function localizeWebsiteImages(
  slug: string,
): Promise<LocalizeResult> {
  const result: LocalizeResult = { slug, localized: 0, failed: 0, skipped: false };

  try {
    const baseDir = await ensureLocalSiteFiles(slug);

    if (!baseDir) {
      console.warn(`[refresh-kiwi] localise: no site files found for ${slug}`);
      result.skipped = true;
      return result;
    }

    const filePaths = await listSiteTextFiles(baseDir);

    if (filePaths.length === 0) {
      result.skipped = true;
      return result;
    }

    const fileContents = new Map<string, string>();
    const candidateUrls = new Set<string>();

    for (const filePath of filePaths) {
      const content = await readFile(filePath, "utf8");
      fileContents.set(filePath, content);

      for (const url of extractCandidateUrls(content)) {
        if (isLocalizableUrl(url)) {
          candidateUrls.add(url);
        }
      }
    }

    if (candidateUrls.size === 0) {
      result.skipped = true;
      return result;
    }

    const urls = [...candidateUrls].slice(0, MAX_IMAGES_PER_SITE);
    const existingManifest = await readExistingManifest(baseDir);
    const previousImages = new Map(
      (existingManifest?.images ?? []).map((image) => [image.originalUrl, image]),
    );

    console.info(
      `[refresh-kiwi] localise: ${slug} has ${urls.length} hotlinked image(s) to download`,
    );

    const localized: LocalizedImage[] = [];
    const queue = [...urls];

    const workers = Array.from(
      { length: Math.min(DOWNLOAD_CONCURRENCY, queue.length) },
      async () => {
        for (;;) {
          const url = queue.shift();

          if (!url) {
            return;
          }

          const downloaded = await downloadImage(url);

          if (!downloaded) {
            result.failed += 1;
            continue;
          }

          const fileName = assetFileName(url, downloaded.contentType);
          await saveAsset(baseDir, fileName, downloaded.buffer);

          localized.push({
            id: fileName.replace(/\.[^.]+$/, ""),
            file: `assets/${fileName}`,
            url: localAssetUrl(slug, fileName),
            originalUrl: url,
            contentType: downloaded.contentType,
            bytes: downloaded.buffer.byteLength,
          });
        }
      },
    );

    await Promise.all(workers);

    if (localized.length === 0) {
      console.warn(
        `[refresh-kiwi] localise: every download failed for ${slug} (${result.failed} attempted) — leaving hotlinks in place`,
      );
      return result;
    }

    // Rewrite every reference to a successfully downloaded image. Failed
    // downloads keep their original hotlink so nothing breaks visually.
    const rewrittenFiles: string[] = [];

    for (const [filePath, original] of fileContents) {
      let content = original;

      for (const image of localized) {
        content = content.split(image.originalUrl).join(image.url);
      }

      if (content !== original) {
        await writeFile(filePath, content, "utf8");
        fileContents.set(filePath, content);
        rewrittenFiles.push(filePath);
      }
    }

    const manifest: ImageManifest = {
      version: 1,
      slug,
      localizedAt: new Date().toISOString(),
      images: [
        // Keep previously localised images that are still in the manifest so
        // repeated runs (e.g. after edits) accumulate rather than reset.
        ...[...previousImages.values()].filter(
          (previous) =>
            !localized.some((image) => image.originalUrl === previous.originalUrl),
        ),
        ...localized,
      ],
    };

    const manifestJson = JSON.stringify(manifest, null, 2);
    await saveAsset(baseDir, "manifest.json", Buffer.from(manifestJson));

    result.localized = localized.length;

    console.info(
      `[refresh-kiwi] localise: ${slug} saved ${localized.length} image(s), rewrote ${rewrittenFiles.length} file(s), ${result.failed} failed`,
    );

    // Push the localised site to the sites repo so future agent runs (edits,
    // extra pages) build on local assets instead of resurrecting hotlinks.
    try {
      const repoFiles: RepoFile[] = [];

      for (const [filePath, content] of fileContents) {
        repoFiles.push({
          path: `sites/${slug}/${path.relative(baseDir, filePath).split(path.sep).join("/")}`,
          content: Buffer.from(content, "utf8"),
        });
      }

      for (const image of localized) {
        repoFiles.push({
          path: `sites/${slug}/${image.file}`,
          content: await readFile(path.join(baseDir, image.file)),
        });
      }

      repoFiles.push({
        path: `sites/${slug}/assets/manifest.json`,
        content: Buffer.from(manifestJson),
      });

      const commitSha = await commitFilesToSitesRepo(
        repoFiles,
        `Localise ${localized.length} image(s) for ${slug}`,
      );

      console.info(
        `[refresh-kiwi] localise: ${slug} committed to sites repo (${commitSha.slice(0, 7)})`,
      );
    } catch (error) {
      // The local preview already has the localised files, so this is
      // recoverable — the next run will retry the commit.
      console.error(
        `[refresh-kiwi] localise: failed to commit ${slug} to sites repo:`,
        error,
      );
    }

    return result;
  } catch (error) {
    console.error(`[refresh-kiwi] localise: unexpected failure for ${slug}:`, error);
    return result;
  }
}
