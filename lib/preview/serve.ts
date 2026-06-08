import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { previewDirectory } from "@/lib/preview/paths";

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

async function resolveFile(
  slug: string,
  segments: string[],
): Promise<string | null> {
  const baseDir = previewDirectory(slug);
  const relativePath = segments.length > 0 ? segments.join("/") : "index.html";
  const candidates = [
    path.join(baseDir, relativePath),
    path.join(baseDir, "dist", relativePath),
    path.join(baseDir, `${relativePath}.html`),
    path.join(baseDir, "dist", `${relativePath}.html`),
  ];

  if (segments.length === 0) {
    candidates.unshift(
      path.join(baseDir, "index.html"),
      path.join(baseDir, "dist", "index.html"),
    );
  }

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    const resolvedBase = path.resolve(baseDir);

    if (!resolved.startsWith(resolvedBase)) {
      continue;
    }

    try {
      const fileStat = await stat(resolved);

      if (fileStat.isFile()) {
        return resolved;
      }
    } catch {
      continue;
    }
  }

  return null;
}

export async function readPreviewFile(slug: string, segments: string[]) {
  const filePath = await resolveFile(slug, segments);

  if (!filePath) {
    return null;
  }

  const body = await readFile(filePath);

  return {
    body,
    contentType: contentType(filePath),
  };
}
