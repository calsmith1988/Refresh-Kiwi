import { readdir, stat } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { isValidSlug } from "@/lib/jobs/slug";
import { previewDirectory } from "@/lib/preview/paths";

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

export async function GET(request: Request, context: RouteContext) {
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
