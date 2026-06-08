import { NextResponse } from "next/server";

import { isValidSlug } from "@/lib/jobs/slug";
import { readPreviewFile } from "@/lib/preview/serve";

export const runtime = "nodejs";

const LOCAL_PREVIEW_ORIGIN_PATTERN = /https?:\/\/(?:localhost|127\.0\.0\.1):10000/gi;
const REWRITABLE_CONTENT_TYPES = [
  "text/html",
  "text/css",
  "text/javascript",
  "application/json",
];

interface RouteContext {
  params: Promise<{ slug: string; path?: string[] }>;
}

function rewriteLocalPreviewOrigins(
  body: Buffer,
  contentType: string,
): Uint8Array | string {
  const canRewrite = REWRITABLE_CONTENT_TYPES.some((rewritableType) =>
    contentType.startsWith(rewritableType),
  );

  if (!canRewrite) {
    return new Uint8Array(body);
  }

  return body.toString("utf8").replace(LOCAL_PREVIEW_ORIGIN_PATTERN, "");
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

  const body = rewriteLocalPreviewOrigins(file.body, file.contentType);

  return new NextResponse(body, {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "public, max-age=60",
    },
  });
}
