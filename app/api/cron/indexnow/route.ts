import { NextResponse } from "next/server";

import { submitMarketingUrlsToIndexNow } from "@/lib/seo/indexnow";

export const runtime = "nodejs";

function getCronSecret(): string | null {
  return process.env.CRON_SECRET?.trim() || null;
}

function isAuthorized(request: Request): boolean {
  const secret = getCronSecret();

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/** POST marketing sitemap URLs to IndexNow (Bing, Yandex, etc.). Not Google. */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await submitMarketingUrlsToIndexNow();

  if (!result.ok) {
    return NextResponse.json(
      {
        error: "IndexNow submission failed",
        status: result.status,
        urlCount: result.urlCount,
        body: result.body,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    status: result.status,
    urlCount: result.urlCount,
  });
}
