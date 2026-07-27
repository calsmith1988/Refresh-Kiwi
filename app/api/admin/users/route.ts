import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/guard";
import { listAdminUsers } from "@/lib/admin/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAdmin();

  if ("response" in auth) {
    return auth.response;
  }

  const url = new URL(request.url);

  return NextResponse.json({
    users: await listAdminUsers({
      search: url.searchParams.get("search") ?? undefined,
      limit: Number(url.searchParams.get("limit")) || undefined,
      offset: Number(url.searchParams.get("offset")) || undefined,
    }),
  });
}
