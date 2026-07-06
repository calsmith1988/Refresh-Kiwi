import { NextResponse } from "next/server";

import { readPreviewFile } from "@/lib/preview/serve";
import {
  canRewritePreviewContent,
  rewriteLocalPreviewOriginsText,
} from "@/lib/preview/rewrite";
import { isSvgContentType, svgSecurityHeaders } from "@/lib/assets/validate";
import { CUSTOM_DOMAIN_HOST_HEADER } from "@/lib/security/headers";
import { getWebsiteAccessByCustomDomain } from "@/lib/websites/service";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ path?: string[] }>;
}

function rewriteLocalPreviewOrigins(
  body: Buffer,
  contentType: string,
): Blob | string {
  if (!canRewritePreviewContent(contentType)) {
    const arrayBuffer = body.buffer.slice(
      body.byteOffset,
      body.byteOffset + body.byteLength,
    ) as ArrayBuffer;

    return new Blob([arrayBuffer]);
  }

  return rewriteLocalPreviewOriginsText(body.toString("utf8"));
}

export async function GET(request: Request, context: RouteContext) {
  // Only the middleware-set header is trusted here. The ?host= query param
  // and the raw Host header are client-controlled, so honouring them would
  // let anyone serve a connected customer's site from the app's own origin.
  const host =
    request.headers.get(CUSTOM_DOMAIN_HOST_HEADER)?.trim().toLowerCase() ||
    null;

  if (!host) {
    return NextResponse.json(
      { error: "Website not found", reason: "missing_host" },
      { status: 404 },
    );
  }

  const websiteAccess = await getWebsiteAccessByCustomDomain(host);

  if (!websiteAccess || !websiteAccess.isAllowed) {
    return NextResponse.json(
      { error: "Website not found", reason: "domain_not_connected", host },
      { status: 404 },
    );
  }

  const { path } = await context.params;
  const file = await readPreviewFile(websiteAccess.slug, path ?? []);

  if (!file) {
    return NextResponse.json(
      { error: "Page not found", reason: "file_not_found", slug: websiteAccess.slug },
      { status: 404 },
    );
  }

  const body = rewriteLocalPreviewOrigins(file.body, file.contentType);

  return new NextResponse(body, {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "public, max-age=60",
      ...(isSvgContentType(file.contentType) ? svgSecurityHeaders() : {}),
    },
  });
}

export const HEAD = GET;
