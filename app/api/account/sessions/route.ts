import { NextResponse } from "next/server";

import {
  clearSessionCookie,
  clearUserSessions,
  getCurrentUser,
} from "@/lib/auth/session";

export const runtime = "nodejs";

export async function DELETE() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in to manage sessions" },
      { status: 401 },
    );
  }

  await clearUserSessions(user.id);
  await clearSessionCookie();

  return NextResponse.json({ ok: true });
}
