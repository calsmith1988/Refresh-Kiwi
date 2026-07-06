import { readdir, stat } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { getSitesRepoUrl } from "@/lib/cursor/config";
import { isValidSlug } from "@/lib/jobs/slug";
import { previewDirectory } from "@/lib/preview/paths";
import { githubHeaders, parseGithubRepo } from "@/lib/preview/sync";
import { isInternalRequestAuthorized } from "@/lib/security/internal";
import { listR2Keys } from "@/lib/storage/r2";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

async function listFiles(dir: string, baseDir = dir): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        return listFiles(entryPath, baseDir);
      }

      return [path.relative(baseDir, entryPath).replaceAll(path.sep, "/")];
    }),
  );

  return files.flat();
}

async function listGithubPreviewFiles(slug: string): Promise<string[]> {
  const parsed = parseGithubRepo(getSitesRepoUrl());

  if (!parsed) {
    return [];
  }

  const prefix = `sites/${slug}/`;
  const treeUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/main?recursive=1`;
  const response = await fetch(treeUrl, { headers: githubHeaders() });

  if (!response.ok) {
    return [];
  }

  const tree = (await response.json()) as {
    tree: Array<{ path: string; type: string }>;
  };

  return tree.tree
    .filter((item) => item.type === "blob" && item.path.startsWith(prefix))
    .map((item) => item.path.slice(prefix.length));
}

async function listR2PreviewFiles(slug: string): Promise<string[]> {
  const prefix = `sites/${slug}/`;

  try {
    return (await listR2Keys(prefix)).map((key) => key.slice(prefix.length));
  } catch {
    return [];
  }
}

export async function GET(request: Request, context: RouteContext) {
  if (!isInternalRequestAuthorized(request)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { slug } = await context.params;

  if (!isValidSlug(slug)) {
    return NextResponse.json({ error: "Invalid preview slug" }, { status: 400 });
  }

  const previewDir = previewDirectory(slug);
  const headers = request.headers;

  try {
    const dirStat = await stat(previewDir);

    return NextResponse.json({
      slug,
      exists: dirStat.isDirectory(),
      previewDir,
      files: dirStat.isDirectory() ? await listFiles(previewDir) : [],
      r2Files: await listR2PreviewFiles(slug),
      githubFiles: await listGithubPreviewFiles(slug),
      request: {
        url: request.url,
        host: headers.get("host"),
        forwardedHost: headers.get("x-forwarded-host"),
        forwardedProto: headers.get("x-forwarded-proto"),
      },
    });
  } catch (error) {
    return NextResponse.json({
      slug,
      exists: false,
      previewDir,
      files: [],
      r2Files: await listR2PreviewFiles(slug),
      githubFiles: await listGithubPreviewFiles(slug),
      error: error instanceof Error ? error.message : "Unable to inspect preview",
      request: {
        url: request.url,
        host: headers.get("host"),
        forwardedHost: headers.get("x-forwarded-host"),
        forwardedProto: headers.get("x-forwarded-proto"),
      },
    });
  }
}
