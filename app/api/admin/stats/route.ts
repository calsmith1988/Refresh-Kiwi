import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/guard";
import { getAdminStats } from "@/lib/admin/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAdmin();

  if ("response" in auth) {
    return auth.response;
  }

  const url = new URL(request.url);
  const days = Math.min(
    Math.max(Number(url.searchParams.get("days")) || 30, 1),
    365,
  );

  try {
    return NextResponse.json(await getAdminStats(days));
  } catch (error) {
    console.error("[refresh-kiwi] admin stats failed", error);

    // Drizzle wraps driver errors, so the useful detail is on `cause`.
    const cause = error instanceof Error ? error.cause : null;
    const message = [
      error instanceof Error ? error.message : "Failed to load admin stats",
      cause instanceof Error ? cause.message : null,
    ]
      .filter(Boolean)
      .join(" — ");

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
