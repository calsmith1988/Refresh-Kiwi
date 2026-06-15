import { NextResponse } from "next/server";

import { assertRateLimit, rateLimitKey } from "@/lib/auth/rateLimit";
import { rateLimitResponse } from "@/lib/auth/rateLimitResponse";
import { getCurrentUser } from "@/lib/auth/session";
import { disableTwoFactor, toAuthUserResponse } from "@/lib/auth/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to disable 2FA" }, { status: 401 });
  }

  try {
    await assertRateLimit(rateLimitKey(request, "two-factor-disable"), {
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });

    const body = (await request.json()) as { password?: string };
    const updated = await disableTwoFactor({
      userId: user.id,
      password: body.password ?? "",
    });

    return NextResponse.json({ user: toAuthUserResponse(updated) });
  } catch (error) {
    const limited = rateLimitResponse(error);
    if (limited) {
      return limited;
    }

    const message = error instanceof Error ? error.message : "Unable to disable 2FA";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
