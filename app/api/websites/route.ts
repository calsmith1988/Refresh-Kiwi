import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { listOwnedWebsites, toWebsiteResponse } from "@/lib/websites/service";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to view websites" }, { status: 401 });
  }

  const websites = await listOwnedWebsites(user.id);

  return NextResponse.json({
    websites: websites.map(toWebsiteResponse),
  });
}
