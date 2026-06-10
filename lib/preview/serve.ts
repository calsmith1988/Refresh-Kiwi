import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { getSitesRepoUrl } from "@/lib/cursor/config";
import { previewDirectory } from "@/lib/preview/paths";
import { githubHeaders, parseGithubRepo } from "@/lib/preview/sync";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function contentType(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  return MIME_TYPES[extension] ?? "application/octet-stream";
}

function htmlContentTypePathForExtensionless(
  relativePath: string,
  fallback: string,
): string {
  return path.extname(relativePath) ? relativePath : fallback;
}

async function resolveFile(
  slug: string,
  segments: string[],
): Promise<{ path: string; contentTypePath: string } | null> {
  const baseDir = previewDirectory(slug);
  const relativePath = segments.length > 0 ? segments.join("/") : "index.html";
  const candidates = [
    {
      path: path.join(baseDir, relativePath),
      contentTypePath: htmlContentTypePathForExtensionless(
        relativePath,
        "index.html",
      ),
    },
    {
      path: path.join(baseDir, "dist", relativePath),
      contentTypePath: htmlContentTypePathForExtensionless(
        relativePath,
        "index.html",
      ),
    },
    {
      path: path.join(baseDir, relativePath, "index.html"),
      contentTypePath: "index.html",
    },
    {
      path: path.join(baseDir, "dist", relativePath, "index.html"),
      contentTypePath: "index.html",
    },
    {
      path: path.join(baseDir, `${relativePath}.html`),
      contentTypePath: `${relativePath}.html`,
    },
    {
      path: path.join(baseDir, "dist", `${relativePath}.html`),
      contentTypePath: `${relativePath}.html`,
    },
  ];

  if (segments.length === 0) {
    candidates.unshift(
      {
        path: path.join(baseDir, "index.html"),
        contentTypePath: "index.html",
      },
      {
        path: path.join(baseDir, "dist", "index.html"),
        contentTypePath: "index.html",
      },
    );
  }

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate.path);
    const resolvedBase = path.resolve(baseDir);

    if (!resolved.startsWith(resolvedBase)) {
      continue;
    }

    try {
      const fileStat = await stat(resolved);

      if (fileStat.isFile()) {
        return { path: resolved, contentTypePath: candidate.contentTypePath };
      }
    } catch {
      continue;
    }
  }

  return null;
}

async function readGithubPreviewFile(slug: string, segments: string[]) {
  const parsed = parseGithubRepo(getSitesRepoUrl());

  if (!parsed) {
    throw new Error("CURSOR_SITES_REPO_URL is not a GitHub repository URL");
  }

  const relativePath = segments.length > 0 ? segments.join("/") : "index.html";
  const candidates = [
    relativePath,
    `dist/${relativePath}`,
    `${relativePath}/index.html`,
    `dist/${relativePath}/index.html`,
    `${relativePath}.html`,
    `dist/${relativePath}.html`,
  ];

  if (segments.length === 0) {
    candidates.unshift("index.html", "dist/index.html");
  }

  for (const candidate of candidates) {
    const githubPath = `sites/${slug}/${candidate}`;
    const encodedPath = githubPath.split("/").map(encodeURIComponent).join("/");
    const fileUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/contents/${encodedPath}?ref=main`;
    const response = await fetch(fileUrl, {
      headers: {
        ...githubHeaders(),
        Accept: "application/vnd.github.raw",
      },
    });

    if (response.ok) {
      return {
        body: Buffer.from(await response.arrayBuffer()),
        contentType: contentType(candidate),
      };
    }

    if (response.status !== 404) {
      throw new Error(`Failed to read ${githubPath} (${response.status})`);
    }
  }

  return null;
}

export async function readPreviewFile(slug: string, segments: string[]) {
  const filePath = await resolveFile(slug, segments);

  if (!filePath) {
    return readGithubPreviewFile(slug, segments);
  }

  const body = await readFile(filePath.path);

  return {
    body,
    contentType: contentType(filePath.contentTypePath),
  };
}
