export function getCursorApiKey(): string {
  const apiKey = process.env.CURSOR_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("CURSOR_API_KEY is not configured");
  }

  return apiKey;
}

export function getSitesRepoUrl(): string {
  const repoUrl = process.env.CURSOR_SITES_REPO_URL?.trim();

  if (!repoUrl) {
    throw new Error("CURSOR_SITES_REPO_URL is not configured");
  }

  return repoUrl;
}
