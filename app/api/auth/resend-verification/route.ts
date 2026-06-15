import { NextResponse } from "next/server";

import { assertRateLimit, rateLimitKey } from "@/lib/auth/rateLimit";
import { rateLimitResponse } from "@/lib/auth/rateLimitResponse";
import { getCurrentUser } from "@/lib/auth/session";
import { resendVerificationEmail } from "@/lib/auth/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to verify your email" }, { status: 401 });
  }

  try {
    await assertRateLimit(rateLimitKey(request, "resend-verification"), {
      limit: 3,
      windowMs: 15 * 60 * 1000,
    });

    await resendVerificationEmail(user.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const limited = rateLimitResponse(error);
    if (limited) {
      return limited;
    }

    const message =
      error instanceof Error ? error.message : "Unable to resend verification email";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
