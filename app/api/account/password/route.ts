import { NextResponse } from "next/server";

import { assertRateLimit, rateLimitKey } from "@/lib/auth/rateLimit";
import { rateLimitResponse } from "@/lib/auth/rateLimitResponse";
import { getCurrentUser } from "@/lib/auth/session";
import { changePassword, toAuthUserResponse } from "@/lib/auth/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to change your password" }, { status: 401 });
  }

  try {
    await assertRateLimit(rateLimitKey(request, "change-password"), {
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });

    const body = (await request.json()) as {
      currentPassword?: string;
      newPassword?: string;
    };
    const updated = await changePassword({
      userId: user.id,
      currentPassword: body.currentPassword ?? "",
      newPassword: body.newPassword ?? "",
    });

    return NextResponse.json({ user: toAuthUserResponse(updated) });
  } catch (error) {
    const limited = rateLimitResponse(error);
    if (limited) {
      return limited;
    }

    const message = error instanceof Error ? error.message : "Unable to change password";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
