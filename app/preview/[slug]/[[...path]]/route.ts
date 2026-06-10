import { NextResponse } from "next/server";

import { isValidSlug } from "@/lib/jobs/slug";
import { readPreviewFile } from "@/lib/preview/serve";
import { getWebsiteAccessBySlug } from "@/lib/websites/service";

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
  params: Promise<{ slug: string; path?: string[] }>;
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

function expiredPreviewResponse() {
  return new NextResponse(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Preview expired | Refresh Kiwi</title>
    <style>
      body {
        align-items: center;
        background: #fbfaf6;
        color: #0a0a0a;
        display: flex;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        justify-content: center;
        margin: 0;
        min-height: 100vh;
        padding: 24px;
      }
      main {
        background: white;
        border: 1px solid rgba(0, 0, 0, 0.1);
        border-radius: 32px;
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.08);
        max-width: 520px;
        padding: 40px;
        text-align: center;
      }
      h1 {
        font-size: clamp(32px, 8vw, 52px);
        letter-spacing: -0.06em;
        line-height: 0.95;
        margin: 0;
      }
      p {
        color: rgba(10, 10, 10, 0.6);
        font-size: 16px;
        line-height: 1.6;
        margin: 18px 0 0;
      }
      a {
        background: #c0ea70;
        border-radius: 999px;
        color: #0a0a0a;
        display: inline-flex;
        font-size: 14px;
        font-weight: 700;
        margin-top: 26px;
        padding: 12px 20px;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>This free preview has expired.</h1>
      <p>Log in or upgrade to Pro to keep your refreshed website live.</p>
      <a href="/dashboard">Open dashboard</a>
    </main>
  </body>
</html>`,
    {
      status: 410,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function GET(_request: Request, context: RouteContext) {
  const { slug, path: pathSegments } = await context.params;

  if (!isValidSlug(slug)) {
    return NextResponse.json({ error: "Invalid preview slug" }, { status: 400 });
  }

  const websiteAccess = await getWebsiteAccessBySlug(slug);

  if (websiteAccess && !websiteAccess.isAllowed) {
    return expiredPreviewResponse();
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
