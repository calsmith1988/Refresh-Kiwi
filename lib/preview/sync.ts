import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { Agent } from "@cursor/sdk";

import { getCursorApiKey, getSitesRepoUrl } from "@/lib/cursor/config";
import { previewDirectory } from "@/lib/preview/paths";

const ARTIFACT_RETRY_ATTEMPTS = 8;
const ARTIFACT_RETRY_DELAY_MS = 5_000;

function parseGithubRepo(
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

  for (let attempt = 1; attempt <= ARTIFACT_RETRY_ATTEMPTS; attempt++) {
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

    if (attempt < ARTIFACT_RETRY_ATTEMPTS) {
      console.info(
        `[refresh-kiwi] no artifacts yet for ${prefix}, retry ${attempt}/${ARTIFACT_RETRY_ATTEMPTS}`,
      );
      await sleep(ARTIFACT_RETRY_DELAY_MS);
    }
  }

  return false;
}

async function syncFromGithubMain(slug: string, outputDir: string): Promise<void> {
  const parsed = parseGithubRepo(getSitesRepoUrl());

  if (!parsed) {
    throw new Error("CURSOR_SITES_REPO_URL is not a GitHub repository URL");
  }

  const prefix = `sites/${slug}/`;
  const treeUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/main?recursive=1`;
  const treeResponse = await fetch(treeUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "refresh-kiwi",
    },
  });

  if (!treeResponse.ok) {
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
    throw new Error(`No files found on GitHub under ${prefix}`);
  }

  for (const file of files) {
    const relativePath = file.path.slice(prefix.length);
    const rawUrl = `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/main/${file.path}`;
    const fileResponse = await fetch(rawUrl, {
      headers: { "User-Agent": "refresh-kiwi" },
    });

    if (!fileResponse.ok) {
      throw new Error(`Failed to download ${file.path} (${fileResponse.status})`);
    }

    const destination = path.join(outputDir, relativePath);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, Buffer.from(await fileResponse.arrayBuffer()));
  }
}

export async function syncPreviewFromAgent(
  agentId: string,
  slug: string,
): Promise<void> {
  const prefix = `sites/${slug}/`;
  const outputDir = previewDirectory(slug);

  const syncedFromArtifacts = await syncFromAgentArtifacts(
    agentId,
    slug,
    outputDir,
  );

  if (syncedFromArtifacts) {
    return;
  }

  console.info(
    `[refresh-kiwi] falling back to GitHub sync for ${prefix} agentId=${agentId}`,
  );

  await syncFromGithubMain(slug, outputDir);
}
