import { NextResponse } from "next/server";

import { isValidSlug } from "@/lib/jobs/slug";
import { readPreviewFile } from "@/lib/preview/serve";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ slug: string; path?: string[] }>;
}

export async function GET(request: Request, context: RouteContext) {
  const { slug, path: pathSegments } = await context.params;

  if (!isValidSlug(slug)) {
    return NextResponse.json({ error: "Invalid preview slug" }, { status: 400 });
  }

  const url = new URL(request.url);

  if ((pathSegments ?? []).length === 0 && !url.pathname.endsWith("/")) {
    const location = `${url.pathname}/${url.search}`;

    return new NextResponse(null, {
      status: 308,
      headers: {
        Location: location,
      },
    });
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
