import { NextResponse } from "next/server";

import { assertRateLimit, rateLimitKey } from "@/lib/auth/rateLimit";
import { rateLimitResponse } from "@/lib/auth/rateLimitResponse";
import { resetPassword } from "@/lib/auth/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await assertRateLimit(rateLimitKey(request, "reset-password"), {
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });

    const body = (await request.json()) as {
      token?: string;
      password?: string;
    };

    if (!body.token) {
      return NextResponse.json({ error: "Reset token is required" }, { status: 400 });
    }

    await resetPassword({
      token: body.token,
      password: body.password ?? "",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const limited = rateLimitResponse(error);
    if (limited) {
      return limited;
    }

    const message =
      error instanceof Error ? error.message : "Unable to reset password";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
