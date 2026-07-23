import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { optimizeImage } from "@/lib/assets/optimize";
import { commitFilesToSitesRepo, type RepoFile } from "@/lib/github/commit";
import { logMemoryUsage } from "@/lib/observability/memory";
import { previewDirectory } from "@/lib/preview/paths";
import { syncFromGithubMain } from "@/lib/preview/sync";
import { isBlockedHostname, resolvesToPrivateIp } from "@/lib/security/ssrf";
import {
  downloadSiteDirectoryFromR2,
  uploadSiteDirectoryToR2,
} from "@/lib/storage/r2";

/**
 * Localise-on-claim: downloads images that generated sites hotlink from the
 * original website, stores them under the site's assets/ folder, rewrites all
 * references, and writes assets/manifest.json (the basis for the upcoming
 * image panel). Safe to run repeatedly — already-local sites are a no-op.
 *
 * Asset storage writes to the preview directory on disk and, when configured,
 * R2. GitHub commits are kept for now so cloud agents still see current assets.
 */

const MAX_IMAGES_PER_SITE = 60;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 20_000;
const DOWNLOAD_CONCURRENCY = 2;
const SKIPPED_ANIMATED_IMAGE_EXTENSIONS = /\.(gif)(?:[?#]|$)/i;

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

export type ImageSource = "original" | "upload" | "remix" | "generated";

export type ImageVersion = {
  /** Path relative to the site root, e.g. "assets/img-ab12cd34.webp" */
  file: string;
  /** Public URL served by the preview route */
  url: string;
  contentType: string;
  bytes: number;
  source: ImageSource;
  createdAt: string;
};

export type LocalizedImage = {
  id: string;
  /** Optional intent for user-added assets. Cursor uses this when placing new images. */
  role?: "logo" | "image";
  /** Path relative to the site root, e.g. "assets/img-ab12cd34.webp" */
  file: string;
  /** Public URL served by the preview route */
  url: string;
  originalUrl: string;
  contentType: string;
  bytes: number;
  /** How the current version came to be; defaults to "original" */
  source?: ImageSource;
  /** Set when the user has replaced this image via the dashboard */
  replacedAt?: string;
  /** Older versions, oldest first. Files are never deleted, so any of these
   * can be restored or downloaded at any time. */
  history?: ImageVersion[];
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

function decodeHtmlUrl(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&#38;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'");
}

function normalizeCandidateUrl(rawUrl: string): string | null {
  const trimmed = decodeHtmlUrl(rawUrl).trim();

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return null;
}

function isLocalizableUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }

    // Never re-download things we already host.
    if (
      parsed.hostname === "refresh.kiwi" ||
      parsed.hostname.endsWith(".refresh.kiwi")
    ) {
      return false;
    }

    // SSRF guard: block localhost, private ranges and cloud metadata hosts.
    if (isBlockedHostname(parsed.hostname)) {
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
function isIconLinkRel(rel: string): boolean {
  const tokens = rel.toLowerCase().split(/\s+/).filter(Boolean);

  return tokens.some(
    (token) =>
      token === "icon" ||
      token === "shortcut" ||
      token === "apple-touch-icon" ||
      token === "apple-touch-icon-precomposed" ||
      token === "mask-icon",
  );
}

function extractCandidateUrls(content: string): Set<string> {
  const urls = new Set<string>();

  // src / poster attributes
  for (const match of content.matchAll(
    /(?:src|poster)\s*=\s*["']((?:https?:)?\/\/[^"']+)["']/gi,
  )) {
    const url = normalizeCandidateUrl(match[1]);

    if (url) {
      urls.add(url);
    }
  }

  // srcset attributes — comma-separated "url descriptor" pairs
  for (const match of content.matchAll(/srcset\s*=\s*["']([^"']+)["']/gi)) {
    for (const entry of match[1].split(",")) {
      const url = normalizeCandidateUrl(entry.trim().split(/\s+/)[0] ?? "");

      if (url) {
        urls.add(url);
      }
    }
  }

  // Favicon / apple-touch-icon <link> tags. Order of attributes varies, so
  // match the whole tag then pull rel + href separately.
  for (const match of content.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const rel = tag.match(/\brel\s*=\s*["']([^"']+)["']/i)?.[1];
    const href = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];

    if (!rel || !href || !isIconLinkRel(rel)) {
      continue;
    }

    const url = normalizeCandidateUrl(href);

    if (url) {
      urls.add(url);
    }
  }

  // CSS url(...) — covers stylesheets and inline style attributes
  for (const match of content.matchAll(
    /url\(\s*["']?((?:https?:)?\/\/[^"')\s]+)["']?\s*\)/gi,
  )) {
    const url = normalizeCandidateUrl(match[1]);

    if (url) {
      urls.add(url);
    }
  }

  return urls;
}

function inferImageContentType(buffer: Buffer): string | null {
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }

  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    return "image/jpeg";
  }

  if (buffer.subarray(0, 4).toString("ascii") === "GIF8") {
    return "image/gif";
  }

  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  const start = buffer.subarray(0, 512).toString("utf8").trimStart().toLowerCase();

  if (start.startsWith("<svg") || start.startsWith("<?xml")) {
    return "image/svg+xml";
  }

  return null;
}

function redactedImageUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url.split("?")[0] ?? url;
  }
}

function imageDownloadUrls(url: string): string[] {
  const urls = [url];

  try {
    const parsed = new URL(url);

    // GoDaddy Website Builder's nebula image CDN is often embedded as
    // protocol-relative HTTP on source sites. Try both schemes before giving up.
    if (parsed.hostname === "nebula.wsimg.com") {
      parsed.protocol = parsed.protocol === "https:" ? "http:" : "https:";
      urls.push(parsed.toString());
    }
  } catch {
    // Use the original URL only.
  }

  return [...new Set(urls)];
}

function shouldSkipRemoteImage(url: string): boolean {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();

    return (
      SKIPPED_ANIMATED_IMAGE_EXTENSIONS.test(pathname) ||
      pathname.endsWith("/animated.webp")
    );
  } catch {
    return SKIPPED_ANIMATED_IMAGE_EXTENSIONS.test(url);
  }
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

const MAX_IMAGE_REDIRECTS = 5;

/**
 * Fetches a URL while validating every redirect hop against the SSRF
 * blocklist, so a public image URL can't bounce the server into an internal
 * service or the cloud metadata endpoint.
 */
async function fetchImageResponse(initialUrl: string): Promise<Response> {
  let currentUrl = initialUrl;

  for (let hop = 0; hop <= MAX_IMAGE_REDIRECTS; hop += 1) {
    const parsed = new URL(currentUrl);

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error(`blocked non-http redirect (${parsed.protocol})`);
    }

    if (
      isBlockedHostname(parsed.hostname) ||
      (await resolvesToPrivateIp(parsed.hostname))
    ) {
      throw new Error("blocked private or internal address");
    }

    const response = await fetch(currentUrl, {
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        Referer: parsed.origin,
      },
      redirect: "manual",
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");

      if (!location) {
        return response;
      }

      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    return response;
  }

  throw new Error("too many redirects");
}

async function downloadImage(
  url: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const failures: string[] = [];

  for (const downloadUrl of imageDownloadUrls(url)) {
    try {
      if (shouldSkipRemoteImage(downloadUrl)) {
        failures.push(`${new URL(downloadUrl).protocol} animated image skipped`);
        continue;
      }

      const response = await fetchImageResponse(downloadUrl);

      const responseContentType = response.headers.get("content-type") ?? "";

      if (!response.ok) {
        failures.push(`${new URL(downloadUrl).protocol} ${response.status}`);
        continue;
      }

      if (responseContentType.split(";")[0].trim() === "image/gif") {
        failures.push(`${new URL(downloadUrl).protocol} animated GIF skipped`);
        continue;
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      if (buffer.byteLength === 0) {
        failures.push(`${new URL(downloadUrl).protocol} empty response`);
        continue;
      }

      if (buffer.byteLength > MAX_IMAGE_BYTES) {
        failures.push(
          `${new URL(downloadUrl).protocol} too large (${buffer.byteLength} bytes)`,
        );
        continue;
      }

      const contentType = responseContentType.startsWith("image/")
        ? responseContentType.split(";")[0].trim()
        : inferImageContentType(buffer);

      if (!contentType) {
        failures.push(
          `${new URL(downloadUrl).protocol} unsupported content-type "${responseContentType || "missing"}" (${buffer.byteLength} bytes)`,
        );
        continue;
      }

      if (contentType === "image/gif") {
        failures.push(`${new URL(downloadUrl).protocol} animated GIF skipped`);
        continue;
      }

      return { buffer, contentType };
    } catch (error) {
      failures.push(
        `${new URL(downloadUrl).protocol} ${
          error instanceof Error ? error.message : "request failed"
        }`,
      );
    }
  }

  console.warn(
    `[refresh-kiwi] localise: failed to download ${redactedImageUrl(url)}: ${failures.join("; ")}`,
  );

  return null;
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
    // Fall through to R2/GitHub sync below.
  }

  try {
    const syncedFromR2 = await downloadSiteDirectoryFromR2(slug, baseDir);

    if (syncedFromR2) {
      return baseDir;
    }
  } catch (error) {
    console.error(`[refresh-kiwi] failed to restore ${slug} from R2:`, error);
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

async function uploadSiteToR2(slug: string, baseDir: string): Promise<void> {
  try {
    await uploadSiteDirectoryToR2(slug, baseDir);
  } catch (error) {
    console.error(`[refresh-kiwi] failed to upload ${slug} to R2:`, error);
  }
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

/** Reads the image manifest for a site, pulling files from GitHub if the
 * local preview copy is missing (e.g. after a redeploy). */
export async function readWebsiteImageManifest(
  slug: string,
): Promise<ImageManifest | null> {
  const baseDir = await ensureLocalSiteFiles(slug);

  if (!baseDir) {
    return null;
  }

  return readExistingManifest(baseDir);
}

export function isSupportedImageType(contentType: string): boolean {
  return contentType in IMAGE_EXTENSIONS;
}

export const MAX_UPLOAD_BYTES = MAX_IMAGE_BYTES;
export const MAX_IMAGES_PER_UPLOAD = 8;

const MAX_HISTORY_VERSIONS = 10;

function currentAsVersion(
  image: LocalizedImage,
  manifest: ImageManifest,
): ImageVersion {
  return {
    file: image.file,
    url: image.url,
    contentType: image.contentType,
    bytes: image.bytes,
    source: image.source ?? "original",
    createdAt: image.replacedAt ?? manifest.localizedAt,
  };
}

/** Caps history length while always preserving the original version. */
function trimHistory(history: ImageVersion[]): ImageVersion[] {
  if (history.length <= MAX_HISTORY_VERSIONS) {
    return history;
  }

  return [history[0], ...history.slice(history.length - MAX_HISTORY_VERSIONS + 1)];
}

function uploadedAssetFileName(
  buffer: Buffer,
  contentType: string,
  role: "logo" | "image",
): string {
  const extension = IMAGE_EXTENSIONS[contentType];

  if (!extension) {
    throw new Error("Unsupported image type");
  }

  const hash = createHash("sha1").update(buffer).digest("hex").slice(0, 10);
  const prefix = role === "logo" ? "logo" : "img";

  return `${prefix}-${hash}${extension}`;
}

export async function appendLocalizedImages(params: {
  slug: string;
  assets: Array<{
    buffer: Buffer;
    contentType: string;
    role: "logo" | "image";
    source?: "upload" | "generated";
  }>;
}): Promise<LocalizedImage[]> {
  const { slug, assets } = params;

  if (assets.length === 0) {
    return [];
  }

  if (assets.length > MAX_IMAGES_PER_UPLOAD) {
    throw new Error(`Upload up to ${MAX_IMAGES_PER_UPLOAD} images at a time`);
  }

  const baseDir = await ensureLocalSiteFiles(slug);

  if (!baseDir) {
    throw new Error("Website files not found");
  }

  const now = new Date().toISOString();
  const manifest: ImageManifest = (await readExistingManifest(baseDir)) ?? {
    version: 1,
    slug,
    localizedAt: now,
    images: [],
  };
  const added: LocalizedImage[] = [];
  const repoFiles: RepoFile[] = [];

  for (const asset of assets) {
    const fileName = uploadedAssetFileName(
      asset.buffer,
      asset.contentType,
      asset.role,
    );
    const file = `assets/${fileName}`;
    const existing = manifest.images.find((image) => image.file === file);

    if (existing) {
      added.push(existing);
      continue;
    }

    await saveAsset(baseDir, fileName, asset.buffer);

    const image: LocalizedImage = {
      id: fileName.replace(/\.[^.]+$/, ""),
      role: asset.role,
      file,
      url: localAssetUrl(slug, fileName),
      originalUrl: localAssetUrl(slug, fileName),
      contentType: asset.contentType,
      bytes: asset.buffer.byteLength,
      source: asset.source ?? "upload",
      replacedAt: now,
    };

    manifest.images.push(image);
    added.push(image);
    repoFiles.push({
      path: `sites/${slug}/${file}`,
      content: asset.buffer,
    });
  }

  manifest.localizedAt = now;
  const manifestJson = JSON.stringify(manifest, null, 2);
  await saveAsset(baseDir, "manifest.json", Buffer.from(manifestJson));
  await uploadSiteToR2(slug, baseDir);
  repoFiles.push({
    path: `sites/${slug}/assets/manifest.json`,
    content: Buffer.from(manifestJson),
  });

  try {
    await commitFilesToSitesRepo(slug, repoFiles, `Add uploaded image(s) for ${slug}`);
  } catch (error) {
    console.error(
      `[refresh-kiwi] image upload: failed to commit ${slug} to sites repo:`,
      error,
    );
  }

  return added;
}

export async function updateLocalizedImageRole(params: {
  slug: string;
  imageId: string;
  role: "logo" | "image";
}): Promise<LocalizedImage> {
  const baseDir = await ensureLocalSiteFiles(params.slug);

  if (!baseDir) {
    throw new Error("Website files not found");
  }

  const manifest = await readExistingManifest(baseDir);
  const image = manifest?.images.find((entry) => entry.id === params.imageId);

  if (!manifest || !image) {
    throw new Error("Image not found in this website");
  }

  const updated: LocalizedImage = {
    ...image,
    role: params.role,
  };

  manifest.images = manifest.images.map((entry) =>
    entry.id === updated.id ? updated : entry,
  );

  const manifestJson = JSON.stringify(manifest, null, 2);
  await saveAsset(baseDir, "manifest.json", Buffer.from(manifestJson));
  await uploadSiteToR2(params.slug, baseDir);

  try {
    await commitFilesToSitesRepo(
      params.slug,
      [
        {
          path: `sites/${params.slug}/assets/manifest.json`,
          content: Buffer.from(manifestJson),
        },
      ],
      `Mark image ${params.imageId} as ${params.role} for ${params.slug}`,
    );
  } catch (error) {
    console.error(
      `[refresh-kiwi] image role: failed to commit ${params.slug} to sites repo:`,
      error,
    );
  }

  return updated;
}

/** Rewrites every HTML/CSS reference from one asset URL to another. Returns
 * the rewritten file contents keyed by absolute path. */
async function rewriteAssetReferences(
  baseDir: string,
  oldUrl: string,
  newUrl: string,
): Promise<Map<string, string>> {
  const rewrittenFiles = new Map<string, string>();

  for (const filePath of await listSiteTextFiles(baseDir)) {
    const content = await readFile(filePath, "utf8");

    if (!content.includes(oldUrl)) {
      continue;
    }

    const rewritten = content.split(oldUrl).join(newUrl);
    await writeFile(filePath, rewritten, "utf8");
    rewrittenFiles.set(filePath, rewritten);
  }

  return rewrittenFiles;
}

async function persistImageChange(params: {
  slug: string;
  baseDir: string;
  manifest: ImageManifest;
  updated: LocalizedImage;
  rewrittenFiles: Map<string, string>;
  newAsset: { fileName: string; buffer: Buffer } | null;
  commitMessage: string;
}): Promise<void> {
  const { slug, baseDir, manifest, updated, rewrittenFiles, newAsset } = params;

  manifest.images = manifest.images.map((entry) =>
    entry.id === updated.id ? updated : entry,
  );

  const manifestJson = JSON.stringify(manifest, null, 2);
  await saveAsset(baseDir, "manifest.json", Buffer.from(manifestJson));
  await uploadSiteToR2(slug, baseDir);

  try {
    const repoFiles: RepoFile[] = [
      {
        path: `sites/${slug}/assets/manifest.json`,
        content: Buffer.from(manifestJson),
      },
    ];

    if (newAsset) {
      repoFiles.push({
        path: `sites/${slug}/assets/${newAsset.fileName}`,
        content: newAsset.buffer,
      });
    }

    for (const [filePath, content] of rewrittenFiles) {
      repoFiles.push({
        path: `sites/${slug}/${path.relative(baseDir, filePath).split(path.sep).join("/")}`,
        content: Buffer.from(content, "utf8"),
      });
    }

    await commitFilesToSitesRepo(slug, repoFiles, params.commitMessage);
  } catch (error) {
    console.error(
      `[refresh-kiwi] image change: failed to commit ${slug} to sites repo:`,
      error,
    );
  }
}

/**
 * Replaces a localised image with new bytes (user upload or AI remix). The
 * replacement gets a fresh content-addressed filename (so stale caches can't
 * show the old image), every HTML/CSS reference is rewritten, the previous
 * version is kept in the manifest history, and the result is committed to
 * the sites repo.
 */
export async function replaceLocalizedImage(params: {
  slug: string;
  imageId: string;
  buffer: Buffer;
  contentType: string;
  source: "upload" | "remix";
}): Promise<LocalizedImage> {
  const { slug, imageId, buffer, contentType, source } = params;
  const baseDir = await ensureLocalSiteFiles(slug);

  if (!baseDir) {
    throw new Error("Website files not found");
  }

  const manifest = await readExistingManifest(baseDir);
  const image = manifest?.images.find((entry) => entry.id === imageId);

  if (!manifest || !image) {
    throw new Error("Image not found in this website");
  }

  const extension = IMAGE_EXTENSIONS[contentType];

  if (!extension) {
    throw new Error("Unsupported image type");
  }

  const hash = createHash("sha1").update(buffer).digest("hex").slice(0, 10);
  const fileName = `img-${hash}${extension}`;
  const oldUrl = image.url;
  const newUrl = localAssetUrl(slug, fileName);

  if (oldUrl === newUrl) {
    // Identical bytes re-uploaded — nothing to do.
    return image;
  }

  await saveAsset(baseDir, fileName, buffer);

  const rewrittenFiles = await rewriteAssetReferences(baseDir, oldUrl, newUrl);

  const updated: LocalizedImage = {
    ...image,
    file: `assets/${fileName}`,
    url: newUrl,
    contentType,
    bytes: buffer.byteLength,
    source,
    replacedAt: new Date().toISOString(),
    history: trimHistory([
      ...(image.history ?? []),
      currentAsVersion(image, manifest),
    ]),
  };

  await persistImageChange({
    slug,
    baseDir,
    manifest,
    updated,
    rewrittenFiles,
    newAsset: { fileName, buffer },
    commitMessage: `Replace image ${imageId} for ${slug} (${source})`,
  });

  return updated;
}

/**
 * Restores a previous version of an image. The asset file already exists (we
 * never delete versions), so this only rewrites references and reshuffles
 * the manifest history.
 */
export async function revertLocalizedImage(params: {
  slug: string;
  imageId: string;
  /** The version to restore, identified by its manifest `file` path */
  file: string;
}): Promise<LocalizedImage> {
  const { slug, imageId, file } = params;
  const baseDir = await ensureLocalSiteFiles(slug);

  if (!baseDir) {
    throw new Error("Website files not found");
  }

  const manifest = await readExistingManifest(baseDir);
  const image = manifest?.images.find((entry) => entry.id === imageId);

  if (!manifest || !image) {
    throw new Error("Image not found in this website");
  }

  const version = image.history?.find((entry) => entry.file === file);

  if (!version) {
    throw new Error("That version is no longer available");
  }

  const rewrittenFiles = await rewriteAssetReferences(
    baseDir,
    image.url,
    version.url,
  );

  const updated: LocalizedImage = {
    ...image,
    file: version.file,
    url: version.url,
    contentType: version.contentType,
    bytes: version.bytes,
    source: version.source,
    replacedAt: new Date().toISOString(),
    history: trimHistory([
      ...(image.history ?? []).filter((entry) => entry.file !== version.file),
      currentAsVersion(image, manifest),
    ]),
  };

  await persistImageChange({
    slug,
    baseDir,
    manifest,
    updated,
    rewrittenFiles,
    newAsset: null,
    commitMessage: `Restore previous image ${imageId} for ${slug}`,
  });

  return updated;
}

export async function localizeWebsiteImages(
  slug: string,
): Promise<LocalizeResult> {
  const result: LocalizeResult = { slug, localized: 0, failed: 0, skipped: false };

  try {
    logMemoryUsage("image-localize:start", { slug });
    const baseDir = await ensureLocalSiteFiles(slug);
    logMemoryUsage("image-localize:after-ensure-files", { slug });

    if (!baseDir) {
      console.warn(`[refresh-kiwi] localise: no site files found for ${slug}`);
      result.skipped = true;
      return result;
    }

    const filePaths = await listSiteTextFiles(baseDir);
    logMemoryUsage("image-localize:text-files-listed", {
      slug,
      files: filePaths.length,
    });

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
    logMemoryUsage("image-localize:candidates-collected", {
      slug,
      candidates: candidateUrls.size,
      capped: urls.length,
    });
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

          logMemoryUsage("image-localize:before-download", { slug });
          const downloaded = await downloadImage(url);

          if (!downloaded) {
            result.failed += 1;
            continue;
          }
          logMemoryUsage("image-localize:after-download", {
            slug,
            bytes: downloaded.buffer.byteLength,
            contentType: downloaded.contentType,
          });

          logMemoryUsage("image-localize:before-optimize", {
            slug,
            bytes: downloaded.buffer.byteLength,
            contentType: downloaded.contentType,
          });
          const optimized = await optimizeImage(
            downloaded.buffer,
            downloaded.contentType,
          );
          logMemoryUsage("image-localize:after-optimize", {
            slug,
            bytes: optimized.buffer.byteLength,
            contentType: optimized.contentType,
          });
          const fileName = assetFileName(url, optimized.contentType);
          await saveAsset(baseDir, fileName, optimized.buffer);

          localized.push({
            id: fileName.replace(/\.[^.]+$/, ""),
            file: `assets/${fileName}`,
            url: localAssetUrl(slug, fileName),
            originalUrl: url,
            contentType: optimized.contentType,
            bytes: optimized.buffer.byteLength,
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
    logMemoryUsage("image-localize:before-r2-upload", {
      slug,
      localized: localized.length,
      failed: result.failed,
    });
    await uploadSiteToR2(slug, baseDir);
    logMemoryUsage("image-localize:after-r2-upload", {
      slug,
      localized: localized.length,
      failed: result.failed,
    });

    result.localized = localized.length;

    console.info(
      `[refresh-kiwi] localise: ${slug} saved ${localized.length} image(s), rewrote ${rewrittenFiles.length} file(s), ${result.failed} failed`,
    );

    // Push the localised site to the sites repo so future agent runs (edits,
    // extra pages) build on local assets instead of resurrecting hotlinks.
    try {
      logMemoryUsage("image-localize:before-repo-files", {
        slug,
        localized: localized.length,
      });
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
      logMemoryUsage("image-localize:after-repo-files", {
        slug,
        files: repoFiles.length,
      });

      const commitSha = await commitFilesToSitesRepo(
        slug,
        repoFiles,
        `Localise ${localized.length} image(s) for ${slug}`,
      );

      console.info(
        `[refresh-kiwi] localise: ${slug} committed to sites repo (${commitSha.slice(0, 7)})`,
      );
      logMemoryUsage("image-localize:after-commit", {
        slug,
        files: repoFiles.length,
      });
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
    logMemoryUsage("image-localize:failed", { slug });
    return result;
  }
}
