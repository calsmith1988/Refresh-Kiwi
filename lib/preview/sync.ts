import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { githubHeaders, parseGithubRepo } from "@/lib/github/api";
import { resolveSitesRepoUrlForSlug } from "@/lib/github/repos";
import { logMemoryUsage } from "@/lib/observability/memory";
import { previewDirectory } from "@/lib/preview/paths";
import { uploadSiteDirectoryToR2 } from "@/lib/storage/r2";

const GITHUB_SYNC_ATTEMPTS = 15;
const GITHUB_SYNC_DELAY_MS = 3_000;
// Give a normal push-to-main time to land before checking whether the agent
// left the finished site on its own branch instead.
const BRANCH_RESCUE_AFTER_ATTEMPTS = 5;
const REQUIRED_HOMEPAGE_FILES = ["index.html", "site.json"] as const;

export { githubHeaders, parseGithubRepo };

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
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

function logIncompleteSync(source: "GitHub main", prefix: string) {
  console.info(
    `[refresh-kiwi] ${source} for ${prefix} did not include index.html and site.json yet`,
  );
}

async function uploadSyncedPreview(slug: string, outputDir: string): Promise<void> {
  try {
    logMemoryUsage("preview-sync:before-r2-upload", { slug });
    await uploadSiteDirectoryToR2(slug, outputDir);
    logMemoryUsage("preview-sync:after-r2-upload", { slug });
  } catch (error) {
    // Deliberately non-fatal (the build itself succeeded), but serious: until
    // a later sync re-uploads, this site serves from the slow GitHub-contents
    // fallback whenever the worker's local copy is lost.
    console.error(
      `[refresh-kiwi] R2 sync failed for ${slug} after retries; site will rely on the GitHub serving fallback:`,
      error,
    );
  }
}

async function resolveParsedRepo(slug: string) {
  const repoUrl = await resolveSitesRepoUrlForSlug(slug);
  const parsed = parseGithubRepo(repoUrl);

  if (!parsed) {
    throw new Error(`Sites repo for ${slug} is not a GitHub repository URL`);
  }

  return parsed;
}

export async function syncFromGithubMain(slug: string, outputDir: string): Promise<boolean> {
  const parsed = await resolveParsedRepo(slug);

  const prefix = `sites/${slug}/`;
  const treeUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/main?recursive=1`;
  const treeResponse = await fetch(treeUrl, {
    headers: githubHeaders(),
  });

  if (!treeResponse.ok) {
    if (treeResponse.status === 403 || treeResponse.status === 404) {
      throw new Error(
        `GitHub sync cannot access ${parsed.owner}/${parsed.repo} (${treeResponse.status}). Set GITHUB_TOKEN on Render with contents read access for the sites repo(s).`,
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

/**
 * Rescue for a misbehaving agent that committed the finished site to its own
 * branch (typically cursor/*, often behind a PR) instead of main. Everything
 * downstream — preview sync, serving, edits, image localization — only reads
 * main, so find a non-main branch whose tree contains the complete site and
 * merge it into main via the GitHub merge API.
 */
async function tryMergeAgentBranchIntoMain(slug: string): Promise<boolean> {
  const parsed = await resolveParsedRepo(slug);
  const prefix = `sites/${slug}/`;
  const base = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`;

  let branches: Array<{ name: string; commit: { sha: string } }>;

  try {
    const response = await fetch(`${base}/branches?per_page=100`, {
      headers: githubHeaders(),
    });

    if (!response.ok) {
      return false;
    }

    branches = (await response.json()) as Array<{
      name: string;
      commit: { sha: string };
    }>;
  } catch (error) {
    console.warn(`[refresh-kiwi] branch rescue: could not list branches for ${slug}:`, error);
    return false;
  }

  const candidates: Array<{ name: string; committedAt: number }> = [];

  for (const branch of branches) {
    if (branch.name === "main") {
      continue;
    }

    try {
      const treeResponse = await fetch(
        `${base}/git/trees/${encodeURIComponent(branch.commit.sha)}?recursive=1`,
        { headers: githubHeaders() },
      );

      if (!treeResponse.ok) {
        continue;
      }

      const tree = (await treeResponse.json()) as {
        tree: Array<{ path: string; type: string }>;
      };
      const relativePaths = tree.tree
        .filter((item) => item.type === "blob" && item.path.startsWith(prefix))
        .map((item) => relativePathFromPrefix(item.path, prefix));

      if (relativePaths.length === 0 || !hasRequiredHomepageFiles(relativePaths)) {
        continue;
      }

      const commitResponse = await fetch(`${base}/commits/${branch.commit.sha}`, {
        headers: githubHeaders(),
      });
      const commit = commitResponse.ok
        ? ((await commitResponse.json()) as {
            commit?: { committer?: { date?: string } };
          })
        : null;

      candidates.push({
        name: branch.name,
        committedAt: Date.parse(commit?.commit?.committer?.date ?? "") || 0,
      });
    } catch {
      continue;
    }
  }

  // Prefer the most recent work — old stale branches must not resurrect
  // outdated content.
  candidates.sort((a, b) => b.committedAt - a.committedAt);

  for (const candidate of candidates) {
    try {
      const mergeResponse = await fetch(`${base}/merges`, {
        method: "POST",
        headers: {
          ...githubHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          base: "main",
          head: candidate.name,
          commit_message: `Rescue: merge ${candidate.name} into main (agent committed off-main)`,
        }),
      });

      // 201 = merged. 204 = branch already contained in main, meaning it
      // isn't the missing work — try the next candidate.
      if (mergeResponse.status === 201) {
        console.warn(
          `[refresh-kiwi] site files for ${prefix} were left on branch ${candidate.name}; merged into main`,
        );
        return true;
      }

      if (mergeResponse.status !== 204) {
        console.warn(
          `[refresh-kiwi] branch rescue: merging ${candidate.name} into main failed (${mergeResponse.status})`,
        );
      }
    } catch (error) {
      console.warn(
        `[refresh-kiwi] branch rescue: merging ${candidate.name} into main failed:`,
        error,
      );
    }
  }

  return false;
}

/**
 * Pulls the agent's finished site files from the repo's main branch onto the
 * worker (and into R2). Agents commit their work to GitHub — the Cursor
 * "artifacts" API is a different mechanism (screenshots/videos under the VM's
 * artifacts/ directory) and never contains site files, so the repo is the
 * only sync source. The agentId is logged purely for traceability.
 */
export async function syncPreviewFromAgent(
  agentId: string,
  slug: string,
): Promise<void> {
  const prefix = `sites/${slug}/`;
  const outputDir = previewDirectory(slug);

  console.info(
    `[refresh-kiwi] syncing ${prefix} from GitHub main agentId=${agentId}`,
  );
  logMemoryUsage("preview-sync:start", { slug });

  let branchRescueAttempted = false;

  for (let attempt = 1; attempt <= GITHUB_SYNC_ATTEMPTS; attempt++) {
    const syncedFromGithub = await syncFromGithubMain(slug, outputDir);

    if (syncedFromGithub) {
      await uploadSyncedPreview(slug, outputDir);
      logMemoryUsage("preview-sync:complete", { slug, source: "github" });
      return;
    }

    // If main still has nothing after a reasonable wait, check whether the
    // agent committed the site to its own branch and merge it into main.
    if (!branchRescueAttempted && attempt >= BRANCH_RESCUE_AFTER_ATTEMPTS) {
      branchRescueAttempted = true;

      if (await tryMergeAgentBranchIntoMain(slug)) {
        continue;
      }
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
