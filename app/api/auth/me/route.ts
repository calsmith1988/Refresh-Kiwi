import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { toAuthUserResponse } from "@/lib/auth/service";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  return NextResponse.json({
    user: user ? toAuthUserResponse(user) : null,
  });
}
