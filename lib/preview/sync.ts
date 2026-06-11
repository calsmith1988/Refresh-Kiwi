import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { Agent } from "@cursor/sdk";

import { getCursorApiKey, getSitesRepoUrl } from "@/lib/cursor/config";
import { previewDirectory } from "@/lib/preview/paths";

const GITHUB_SYNC_ATTEMPTS = 8;
const GITHUB_SYNC_DELAY_MS = 2_000;
const ARTIFACT_SYNC_ATTEMPTS = 1;

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

    if (relevant.length > 0) {
      for (const artifact of relevant) {
        const relativePath = artifact.path.slice(prefix.length);
        const destination = path.join(outputDir, relativePath);

        await mkdir(path.dirname(destination), { recursive: true });
        const buffer = await agent.downloadArtifact(artifact.path);
        await writeFile(destination, buffer);
      }

      return true;
    }

    if (attempt < ARTIFACT_SYNC_ATTEMPTS) {
      console.info(
        `[refresh-kiwi] no artifacts yet for ${prefix}, retry ${attempt}/${ARTIFACT_SYNC_ATTEMPTS}`,
      );
    }
  }

  return false;
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

  if (files.length === 0) {
    return false;
  }

  for (const file of files) {
    const relativePath = file.path.slice(prefix.length);
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
    await writeFile(destination, Buffer.from(await fileResponse.arrayBuffer()));
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

  const syncedFromArtifacts = await syncFromAgentArtifacts(
    agentId,
    slug,
    outputDir,
  );

  if (syncedFromArtifacts) {
    return;
  }

  console.info(
    `[refresh-kiwi] no Cursor artifacts for ${prefix}, falling back to GitHub main`,
  );

  for (let attempt = 1; attempt <= GITHUB_SYNC_ATTEMPTS; attempt++) {
    const syncedFromGithub = await syncFromGithubMain(slug, outputDir);

    if (syncedFromGithub) {
      return;
    }

    if (attempt < GITHUB_SYNC_ATTEMPTS) {
      console.info(
        `[refresh-kiwi] no GitHub files yet for ${prefix}, retry ${attempt}/${GITHUB_SYNC_ATTEMPTS}`,
      );
      await sleep(GITHUB_SYNC_DELAY_MS);
    }
  }

  throw new Error(`No files found under ${prefix}`);
}
