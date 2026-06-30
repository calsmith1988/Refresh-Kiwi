import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { Agent } from "@cursor/sdk";

import { getCursorApiKey, getSitesRepoUrl } from "@/lib/cursor/config";
import { logMemoryUsage } from "@/lib/observability/memory";
import { previewDirectory } from "@/lib/preview/paths";
import { uploadSiteDirectoryToR2 } from "@/lib/storage/r2";

const GITHUB_SYNC_ATTEMPTS = 15;
const GITHUB_SYNC_DELAY_MS = 3_000;
const ARTIFACT_SYNC_ATTEMPTS = 5;
const ARTIFACT_SYNC_DELAY_MS = 2_000;
const REQUIRED_HOMEPAGE_FILES = ["index.html", "site.json"] as const;

export function githubHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN?.trim() || process.env.GH_TOKEN?.trim();
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "refresh-kiwi",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export function parseGithubRepo(
  repoUrl: string,
): { owner: string; repo: string } | null {
  const match = repoUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)/i);

  if (!match) {
    return null;
  }

  return { owner: match[1], repo: match[2] };
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function listRelevantArtifacts(
  agent: Awaited<ReturnType<typeof Agent.resume>>,
  prefix: string,
) {
  const artifacts = await agent.listArtifacts();

  return artifacts.filter(
    (artifact) =>
      artifact.path.startsWith(prefix) &&
      !artifact.path.endsWith("/") &&
      artifact.path !== prefix,
  );
}

function relativePathFromPrefix(pathname: string, prefix: string): string {
  return pathname.slice(prefix.length).replaceAll("\\", "/");
}

function hasRequiredHomepageFiles(relativePaths: string[]): boolean {
  const normalized = new Set(
    relativePaths.map((pathname) => pathname.replaceAll("\\", "/")),
  );

  return REQUIRED_HOMEPAGE_FILES.every(
    (file) => normalized.has(file) || normalized.has(`dist/${file}`),
  );
}

function logIncompleteSync(source: "Cursor artifacts" | "GitHub main", prefix: string) {
  console.info(
    `[refresh-kiwi] ${source} for ${prefix} did not include index.html and site.json yet`,
  );
}

async function syncFromAgentArtifacts(
  agentId: string,
  slug: string,
  outputDir: string,
): Promise<boolean> {
  const apiKey = getCursorApiKey();
  const prefix = `sites/${slug}/`;

  await using agent = await Agent.resume(agentId, { apiKey });

  for (let attempt = 1; attempt <= ARTIFACT_SYNC_ATTEMPTS; attempt++) {
    const relevant = await listRelevantArtifacts(agent, prefix);
    logMemoryUsage("preview-sync:artifacts-listed", {
      slug,
      attempt,
      artifacts: relevant.length,
    });

    if (relevant.length > 0) {
      const relativePaths = relevant.map((artifact) =>
        relativePathFromPrefix(artifact.path, prefix),
      );

      if (!hasRequiredHomepageFiles(relativePaths)) {
        logIncompleteSync("Cursor artifacts", prefix);
        if (attempt < ARTIFACT_SYNC_ATTEMPTS) {
          await sleep(ARTIFACT_SYNC_DELAY_MS);
          continue;
        }

        return false;
      }

      for (const artifact of relevant) {
        const relativePath = relativePathFromPrefix(artifact.path, prefix);
        const destination = path.join(outputDir, relativePath);

        await mkdir(path.dirname(destination), { recursive: true });
        logMemoryUsage("preview-sync:before-artifact-download", {
          slug,
          file: relativePath,
        });
        const buffer = await agent.downloadArtifact(artifact.path);
        logMemoryUsage("preview-sync:after-artifact-download", {
          slug,
          file: relativePath,
          bytes: buffer.byteLength,
        });
        await writeFile(destination, buffer);
      }

      return true;
    }

    if (attempt < ARTIFACT_SYNC_ATTEMPTS) {
      console.info(
        `[refresh-kiwi] no artifacts yet for ${prefix}, retry ${attempt}/${ARTIFACT_SYNC_ATTEMPTS}`,
      );
      await sleep(ARTIFACT_SYNC_DELAY_MS);
    }
  }

  return false;
}

async function uploadSyncedPreview(slug: string, outputDir: string): Promise<void> {
  try {
    logMemoryUsage("preview-sync:before-r2-upload", { slug });
    await uploadSiteDirectoryToR2(slug, outputDir);
    logMemoryUsage("preview-sync:after-r2-upload", { slug });
  } catch (error) {
    console.error(`[refresh-kiwi] R2 sync failed for ${slug}:`, error);
  }
}

export async function syncFromGithubMain(slug: string, outputDir: string): Promise<boolean> {
  const parsed = parseGithubRepo(getSitesRepoUrl());

  if (!parsed) {
    throw new Error("CURSOR_SITES_REPO_URL is not a GitHub repository URL");
  }

  const prefix = `sites/${slug}/`;
  const treeUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/main?recursive=1`;
  const treeResponse = await fetch(treeUrl, {
    headers: githubHeaders(),
  });

  if (!treeResponse.ok) {
    if (treeResponse.status === 403 || treeResponse.status === 404) {
      throw new Error(
        `GitHub sync cannot access ${parsed.owner}/${parsed.repo} (${treeResponse.status}). Set GITHUB_TOKEN on Render with contents read access for CURSOR_SITES_REPO_URL.`,
      );
    }

    throw new Error(
      `GitHub tree fetch failed (${treeResponse.status}) for ${prefix}`,
    );
  }

  const tree = (await treeResponse.json()) as {
    tree: Array<{ path: string; type: string }>;
  };

  const files = tree.tree.filter(
    (item) => item.type === "blob" && item.path.startsWith(prefix),
  );
  logMemoryUsage("preview-sync:github-files-listed", {
    slug,
    files: files.length,
  });

  if (files.length === 0) {
    return false;
  }

  const relativePaths = files.map((file) =>
    relativePathFromPrefix(file.path, prefix),
  );

  if (!hasRequiredHomepageFiles(relativePaths)) {
    logIncompleteSync("GitHub main", prefix);
    return false;
  }

  for (const file of files) {
    const relativePath = relativePathFromPrefix(file.path, prefix);
    const encodedPath = file.path.split("/").map(encodeURIComponent).join("/");
    const fileUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/contents/${encodedPath}?ref=main`;
    const fileResponse = await fetch(fileUrl, {
      headers: {
        ...githubHeaders(),
        Accept: "application/vnd.github.raw",
      },
    });

    if (!fileResponse.ok) {
      throw new Error(`Failed to download ${file.path} (${fileResponse.status})`);
    }

    const destination = path.join(outputDir, relativePath);
    await mkdir(path.dirname(destination), { recursive: true });
    logMemoryUsage("preview-sync:before-github-file-download", {
      slug,
      file: relativePath,
    });
    const buffer = Buffer.from(await fileResponse.arrayBuffer());
    logMemoryUsage("preview-sync:after-github-file-download", {
      slug,
      file: relativePath,
      bytes: buffer.byteLength,
    });
    await writeFile(destination, buffer);
  }

  return true;
}

export async function syncPreviewFromAgent(
  agentId: string,
  slug: string,
): Promise<void> {
  const prefix = `sites/${slug}/`;
  const outputDir = previewDirectory(slug);

  console.info(
    `[refresh-kiwi] syncing Cursor artifacts for ${prefix} agentId=${agentId}`,
  );
  logMemoryUsage("preview-sync:start", { slug });

  const syncedFromArtifacts = await syncFromAgentArtifacts(
    agentId,
    slug,
    outputDir,
  );

  if (syncedFromArtifacts) {
    await uploadSyncedPreview(slug, outputDir);
    logMemoryUsage("preview-sync:complete", { slug, source: "artifacts" });
    return;
  }

  console.info(
    `[refresh-kiwi] no Cursor artifacts for ${prefix}, falling back to GitHub main`,
  );

  for (let attempt = 1; attempt <= GITHUB_SYNC_ATTEMPTS; attempt++) {
    const syncedFromGithub = await syncFromGithubMain(slug, outputDir);

    if (syncedFromGithub) {
      await uploadSyncedPreview(slug, outputDir);
      logMemoryUsage("preview-sync:complete", { slug, source: "github" });
      return;
    }

    if (attempt < GITHUB_SYNC_ATTEMPTS) {
      console.info(
        `[refresh-kiwi] no GitHub files yet for ${prefix}, retry ${attempt}/${GITHUB_SYNC_ATTEMPTS}`,
      );
      await sleep(GITHUB_SYNC_DELAY_MS);
    }
  }

  throw new Error(`No complete homepage found under ${prefix}`);
}
