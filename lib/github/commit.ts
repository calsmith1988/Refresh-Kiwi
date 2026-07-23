import { githubHeaders, parseGithubRepo } from "@/lib/github/api";
import { resolveSitesRepoUrlForSlug } from "@/lib/github/repos";

export type RepoFile = {
  /** Path inside the repo, e.g. "sites/my-slug/index.html" */
  path: string;
  content: Buffer;
};

type GitRef = { object: { sha: string } };
type GitCommit = { sha: string; tree: { sha: string } };
type GitBlob = { sha: string };
type GitTree = { sha: string };

async function githubRequest<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...githubHeaders(),
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `GitHub API ${init?.method ?? "GET"} ${url} failed (${response.status}): ${body.slice(0, 300)}`,
    );
  }

  return (await response.json()) as T;
}

/**
 * Commits a batch of files to the site's repo `main` branch as a single
 * commit using the Git data API (blobs -> tree -> commit -> ref). The target
 * repo is the site's own repo when it has one, else the shared legacy repo.
 * Requires GITHUB_TOKEN to have contents write access.
 */
export async function commitFilesToSitesRepo(
  slug: string,
  files: RepoFile[],
  message: string,
): Promise<string> {
  if (files.length === 0) {
    throw new Error("No files to commit");
  }

  const repoUrl = await resolveSitesRepoUrlForSlug(slug);
  const parsed = parseGithubRepo(repoUrl);

  if (!parsed) {
    throw new Error(`Sites repo for ${slug} is not a GitHub repository URL`);
  }

  const base = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`;

  const ref = await githubRequest<GitRef>(`${base}/git/ref/heads/main`);
  const headSha = ref.object.sha;
  const headCommit = await githubRequest<GitCommit>(
    `${base}/git/commits/${headSha}`,
  );

  const treeEntries: Array<{
    path: string;
    mode: "100644";
    type: "blob";
    sha: string;
  }> = [];

  for (const file of files) {
    const blob = await githubRequest<GitBlob>(`${base}/git/blobs`, {
      method: "POST",
      body: JSON.stringify({
        content: file.content.toString("base64"),
        encoding: "base64",
      }),
    });

    treeEntries.push({
      path: file.path,
      mode: "100644",
      type: "blob",
      sha: blob.sha,
    });
  }

  const tree = await githubRequest<GitTree>(`${base}/git/trees`, {
    method: "POST",
    body: JSON.stringify({
      base_tree: headCommit.tree.sha,
      tree: treeEntries,
    }),
  });

  const commit = await githubRequest<GitCommit>(`${base}/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message,
      tree: tree.sha,
      parents: [headSha],
    }),
  });

  await githubRequest(`${base}/git/refs/heads/main`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha }),
  });

  return commit.sha;
}
