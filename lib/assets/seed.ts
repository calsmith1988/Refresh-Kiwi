import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { commitFilesToSitesRepo, type RepoFile } from "@/lib/github/commit";
import { previewDirectory } from "@/lib/preview/paths";
import type { ImageManifest, LocalizedImage } from "@/lib/assets/localize";
import { getR2Object, uploadSiteDirectoryToR2 } from "@/lib/storage/r2";

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

export type SeedAssetInput = {
  role: "logo" | "image";
  buffer: Buffer;
  contentType: string;
  originalName?: string;
  source?: "upload" | "generated";
};

export type SeedAsset = LocalizedImage & {
  role: "logo" | "image";
};

function localAssetUrl(slug: string, fileName: string): string {
  return `/preview/${slug}/assets/${fileName}`;
}

function assetFileName(asset: SeedAssetInput): string {
  const extension = IMAGE_EXTENSIONS[asset.contentType] ?? ".img";
  const hash = createHash("sha1").update(asset.buffer).digest("hex").slice(0, 10);
  const prefix = asset.role === "logo" ? "logo" : "img";

  return `${prefix}-${hash}${extension}`;
}

export async function seedWebsiteAssets(
  slug: string,
  inputs: SeedAssetInput[],
): Promise<SeedAsset[]> {
  if (inputs.length === 0) {
    return [];
  }

  const baseDir = previewDirectory(slug);
  const assetsDir = path.join(baseDir, "assets");
  await mkdir(assetsDir, { recursive: true });

  const now = new Date().toISOString();
  const assets: SeedAsset[] = [];
  const repoFiles: RepoFile[] = [];

  for (const [index, input] of inputs.entries()) {
    const fileName = assetFileName(input);
    const file = `assets/${fileName}`;
    const url = localAssetUrl(slug, fileName);

    await writeFile(path.join(assetsDir, fileName), input.buffer);
    repoFiles.push({
      path: `sites/${slug}/${file}`,
      content: input.buffer,
    });

    assets.push({
      id: input.role === "logo" ? "seed-logo" : `seed-image-${index + 1}`,
      role: input.role,
      file,
      url,
      originalUrl: url,
      contentType: input.contentType,
      bytes: input.buffer.byteLength,
      source: input.source ?? "upload",
      replacedAt: now,
    });
  }

  const manifest: ImageManifest = {
    version: 1,
    slug,
    localizedAt: now,
    images: assets,
  };
  const manifestJson = JSON.stringify(manifest, null, 2);

  await writeFile(path.join(assetsDir, "manifest.json"), manifestJson, "utf8");
  repoFiles.push({
    path: `sites/${slug}/assets/manifest.json`,
    content: Buffer.from(manifestJson),
  });

  try {
    await uploadSiteDirectoryToR2(slug, baseDir);
  } catch (error) {
    console.error(`[refresh-kiwi] failed to upload seed assets for ${slug} to R2:`, error);
  }

  try {
    await commitFilesToSitesRepo(repoFiles, `Seed uploaded assets for ${slug}`);
  } catch (error) {
    console.error(
      `[refresh-kiwi] failed to commit seed assets for ${slug}:`,
      error,
    );
  }

  return assets;
}

export async function readSeedAssets(slug: string): Promise<SeedAsset[]> {
  const manifestPath = path.join(previewDirectory(slug), "assets", "manifest.json");

  try {
    await stat(manifestPath);
  } catch {
    const object = await getR2Object(`sites/${slug}/assets/manifest.json`);

    if (!object) {
      return [];
    }

    await mkdir(path.dirname(manifestPath), { recursive: true });
    await writeFile(manifestPath, object.body);
  }

  try {
    const raw = await readFile(manifestPath, "utf8");
    const manifest = JSON.parse(raw) as ImageManifest;

    return manifest.images.filter(
      (image): image is SeedAsset =>
        image.role === "logo" || image.role === "image",
    );
  } catch (error) {
    console.error(`[refresh-kiwi] failed to read seed assets for ${slug}:`, error);
    return [];
  }
}
