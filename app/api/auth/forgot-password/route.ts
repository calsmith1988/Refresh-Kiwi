import { NextResponse } from "next/server";

import { assertRateLimit, rateLimitKey } from "@/lib/auth/rateLimit";
import { rateLimitResponse } from "@/lib/auth/rateLimitResponse";
import { requestPasswordReset } from "@/lib/auth/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await assertRateLimit(rateLimitKey(request, "forgot-password"), {
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });

    const body = (await request.json()) as { email?: string };
    await requestPasswordReset(body.email ?? "");

    return NextResponse.json({
      ok: true,
      message: "If an account exists for that email, a reset link has been sent.",
    });
  } catch (error) {
    const limited = rateLimitResponse(error);
    if (limited) {
      return limited;
    }

    const message =
      error instanceof Error ? error.message : "Unable to request password reset";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
