import { NextResponse } from "next/server";

import { isValidSlug } from "@/lib/jobs/slug";
import { readPreviewFile } from "@/lib/preview/serve";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ slug: string; path?: string[] }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { slug, path: pathSegments } = await context.params;

  if (!isValidSlug(slug)) {
    return NextResponse.json({ error: "Invalid preview slug" }, { status: 400 });
  }

  const file = await readPreviewFile(slug, pathSegments ?? []);

  if (!file) {
    return NextResponse.json({ error: "Preview not found" }, { status: 404 });
  }

  return new NextResponse(file.body, {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "public, max-age=60",
    },
  });
}
