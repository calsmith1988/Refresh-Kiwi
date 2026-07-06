import { NextResponse } from "next/server";

import { getCursorApiKey, getSitesRepoUrl } from "@/lib/cursor/config";
import { isInternalRequestAuthorized } from "@/lib/security/internal";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isInternalRequestAuthorized(request)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const apiKey = getCursorApiKey();
    const repoUrl = getSitesRepoUrl();

    const { Cursor } = await import("@cursor/sdk");

    const me = await Cursor.me({ apiKey });
    const repos = await Cursor.repositories.list({ apiKey });

    const connected = repos.some(
      (repo) => (repo.url ?? "").toLowerCase() === repoUrl.toLowerCase(),
    );

    return NextResponse.json({
      ok: true,
      apiKeyName: me.apiKeyName,
      sitesRepoUrl: repoUrl,
      sitesRepoConnected: connected,
      connectedRepoCount: repos.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Cursor health check failed";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
