import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/guard";
import { getAdminUserDetail } from "@/lib/admin/service";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ userId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();

  if ("response" in auth) {
    return auth.response;
  }

  const { userId } = await context.params;
  const detail = await getAdminUserDetail(userId);

  if (!detail) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(detail);
}
