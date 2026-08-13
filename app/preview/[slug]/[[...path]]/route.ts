import { NextResponse } from "next/server";

import { isSvgContentType, svgSecurityHeaders } from "@/lib/assets/validate";
import { isValidSlug } from "@/lib/jobs/slug";
import { readPreviewFile } from "@/lib/preview/serve";
import {
  canRewritePreviewContent,
  rewriteLocalPreviewOriginsText,
  rewriteRootPathsForPreview,
} from "@/lib/preview/rewrite";
import { getWebsiteAccessBySlug } from "@/lib/websites/service";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ slug: string; path?: string[] }>;
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

function blockedPreviewResponse(kind: "expired" | "removed") {
  const content =
    kind === "removed"
      ? {
          title: "Website removed | Refresh Kiwi",
          heading: "This website has been removed.",
          body: "It was deleted from its Refresh Kiwi account, so there's nothing to show here any more. Fancy a fresh one? It takes about 2 minutes.",
          ctaHref: "/",
          ctaLabel: "Refresh a new website",
        }
      : {
          title: "Website paused | Refresh Kiwi",
          heading: "Your website is paused.",
          body: "It's saved exactly as you left it. Put it online from your dashboard and it comes back in one click.",
          ctaHref: "/dashboard",
          ctaLabel: "Put my website online",
        };

  return new NextResponse(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${content.title}</title>
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
        background: #c5e66a;
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
      <h1>${content.heading}</h1>
      <p>${content.body}</p>
      <a href="${content.ctaHref}">${content.ctaLabel}</a>
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

export async function GET(request: Request, context: RouteContext) {
  const { slug, path: pathSegments } = await context.params;

  if (!isValidSlug(slug)) {
    return NextResponse.json({ error: "Invalid preview slug" }, { status: 400 });
  }

  // Directory-style URLs can leave generated sites resolving against a bad
  // base (we've seen agents bake localhost:10000 into client redirects).
  // Always land on the explicit index document, matching the dashboard links.
  if (!pathSegments?.length) {
    return NextResponse.redirect(
      new URL(`/preview/${slug}/index.html`, request.url),
    );
  }

  const websiteAccess = await getWebsiteAccessBySlug(slug);

  if (websiteAccess && !websiteAccess.isAllowed) {
    return blockedPreviewResponse(
      websiteAccess.status === "archived" ? "removed" : "expired",
    );
  }

  const file = await readPreviewFile(slug, pathSegments ?? []);

  if (!file) {
    return NextResponse.json({ error: "Preview not found" }, { status: 404 });
  }

  let body = rewriteLocalPreviewOrigins(file.body, file.contentType);

  // Safety net for agent output that references its own files with site-root
  // paths (href="/styles.css"): correct on live domains, broken under
  // /preview/{slug}/ — rewrite them to the preview prefix.
  if (typeof body === "string") {
    body = rewriteRootPathsForPreview(body, slug, file.contentType);
  }

  return new NextResponse(body, {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "public, max-age=60",
      ...(isSvgContentType(file.contentType) ? svgSecurityHeaders() : {}),
    },
  });
}
