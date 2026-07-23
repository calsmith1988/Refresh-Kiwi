import { readFile } from "node:fs/promises";
import path from "node:path";

import { eq } from "drizzle-orm";

import { getSitesRepoUrl } from "@/lib/cursor/config";
import { getDb, schema } from "@/lib/db";
import { githubHeaders, parseGithubRepo } from "@/lib/github/api";

const { jobs } = schema;

/**
 * Per-site GitHub repos.
 *
 * Every new site gets its own repo (named site-{slug}) under the same owner
 * as CURSOR_SITES_REPO_URL, so Cursor agents clone one small repo instead of
 * the ever-growing shared monorepo. Files keep the same sites/{slug}/ layout
 * inside the per-site repo, which means prompts, preview sync, serving, and
 * commit paths are identical for both repo generations.
 *
 * Sites built before this existed have jobs.sites_repo_url = NULL and keep
 * resolving to the shared repo.
 */

type GithubRepoResponse = {
  full_name: string;
  html_url: string;
  default_branch: string;
};

async function githubJson<T>(url: string, init?: RequestInit): Promise<T> {
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
    const error = new Error(
      `GitHub API ${init?.method ?? "GET"} ${url} failed (${response.status}): ${body.slice(0, 300)}`,
    ) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return (await response.json()) as T;
}

function siteRepoName(slug: string): string {
  return `site-${slug}`;
}

let cachedTokenLogin: string | null = null;

async function getTokenLogin(): Promise<string> {
  if (cachedTokenLogin) {
    return cachedTokenLogin;
  }

  const user = await githubJson<{ login: string }>("https://api.github.com/user");
  cachedTokenLogin = user.login;
  return user.login;
}

/** Seeds the repo's root AGENTS.md from the master copy kept in this app. */
async function seedAgentsFile(owner: string, repo: string): Promise<void> {
  let contents: string;

  try {
    const masterPath = path.join(process.cwd(), "docs", "sites-repo", "AGENTS.md");
    contents = await readFile(masterPath, "utf8");
    // Strip the leading HTML comment that explains the master-copy setup —
    // it's about the app repo, not the sites repo.
    contents = contents.replace(/^<!--[\s\S]*?-->\s*/, "");
  } catch (error) {
    console.warn(
      `[refresh-kiwi] AGENTS.md master copy not found; skipping seed for ${owner}/${repo}:`,
      error,
    );
    return;
  }

  await githubJson(
    `https://api.github.com/repos/${owner}/${repo}/contents/AGENTS.md`,
    {
      method: "PUT",
      body: JSON.stringify({
        message: "Seed agent guidelines",
        content: Buffer.from(contents, "utf8").toString("base64"),
      }),
    },
  );
}

/**
 * Creates (or reuses) the per-site GitHub repo for a slug and returns its URL.
 * Idempotent: safe to call again on worker retries.
 */
export async function ensureSiteRepo(slug: string): Promise<string> {
  const shared = parseGithubRepo(getSitesRepoUrl());

  if (!shared) {
    throw new Error("CURSOR_SITES_REPO_URL is not a GitHub repository URL");
  }

  const owner = shared.owner;
  const name = siteRepoName(slug);

  // Reuse if it already exists (worker retry, or slug re-run).
  try {
    const existing = await githubJson<GithubRepoResponse>(
      `https://api.github.com/repos/${owner}/${name}`,
    );
    return existing.html_url;
  } catch (error) {
    if ((error as { status?: number }).status !== 404) {
      throw error;
    }
  }

  const login = await getTokenLogin();
  const createUrl =
    login.toLowerCase() === owner.toLowerCase()
      ? "https://api.github.com/user/repos"
      : `https://api.github.com/orgs/${owner}/repos`;

  const created = await githubJson<GithubRepoResponse>(createUrl, {
    method: "POST",
    body: JSON.stringify({
      name,
      description: `Refresh Kiwi generated site: ${slug}`,
      private: true,
      auto_init: true,
      has_issues: false,
      has_projects: false,
      has_wiki: false,
    }),
  });

  try {
    await seedAgentsFile(owner, name);
  } catch (error) {
    // Non-fatal: the task prompt carries the important constraints.
    console.warn(
      `[refresh-kiwi] failed to seed AGENTS.md into ${owner}/${name}:`,
      error,
    );
  }

  console.info(`[refresh-kiwi] created per-site repo ${owner}/${name} for ${slug}`);
  return created.html_url;
}

/**
 * Resolves the GitHub repo holding a site's files: the job's per-site repo
 * when present, otherwise the shared legacy repo from CURSOR_SITES_REPO_URL.
 */
export async function resolveSitesRepoUrlForSlug(slug: string): Promise<string> {
  const [job] = await getDb()
    .select({ sitesRepoUrl: jobs.sitesRepoUrl })
    .from(jobs)
    .where(eq(jobs.slug, slug))
    .limit(1);

  return job?.sitesRepoUrl ?? getSitesRepoUrl();
}
