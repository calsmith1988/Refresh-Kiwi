import { NextResponse } from "next/server";

import { readPreviewFile } from "@/lib/preview/serve";
import { getWebsiteAccessByCustomDomain } from "@/lib/websites/service";

export const runtime = "nodejs";

const LOCAL_PREVIEW_ORIGIN_PATTERN =
  /(?:https?:)?\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/gi;
const REWRITABLE_CONTENT_TYPES = [
  "text/html",
  "text/css",
  "text/javascript",
  "application/json",
];

interface RouteContext {
  params: Promise<{ path?: string[] }>;
}

function rewriteLocalPreviewOrigins(
  body: Buffer,
  contentType: string,
): Blob | string {
  const canRewrite = REWRITABLE_CONTENT_TYPES.some((rewritableType) =>
    contentType.startsWith(rewritableType),
  );

  if (!canRewrite) {
    const arrayBuffer = body.buffer.slice(
      body.byteOffset,
      body.byteOffset + body.byteLength,
    ) as ArrayBuffer;

    return new Blob([arrayBuffer]);
  }

  return body.toString("utf8").replace(LOCAL_PREVIEW_ORIGIN_PATTERN, "");
}

export async function GET(request: Request, context: RouteContext) {
  const url = new URL(request.url);
  const host = url.searchParams.get("host");

  if (!host) {
    return NextResponse.json({ error: "Website not found" }, { status: 404 });
  }

  const websiteAccess = await getWebsiteAccessByCustomDomain(host);

  if (!websiteAccess || !websiteAccess.isAllowed) {
    return NextResponse.json({ error: "Website not found" }, { status: 404 });
  }

  const { path } = await context.params;
  const file = await readPreviewFile(websiteAccess.slug, path ?? []);

  if (!file) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  const body = rewriteLocalPreviewOrigins(file.body, file.contentType);

  return new NextResponse(body, {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "public, max-age=60",
    },
  });
}

export const HEAD = GET;
