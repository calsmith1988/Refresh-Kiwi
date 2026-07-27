import { NextResponse } from "next/server";

import { listAdminAuditLog } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/admin/guard";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdmin();

  if ("response" in auth) {
    return auth.response;
  }

  return NextResponse.json({ entries: await listAdminAuditLog() });
}
