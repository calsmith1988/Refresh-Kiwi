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
