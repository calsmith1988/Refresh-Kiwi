import { NextResponse } from "next/server";

import { assertRateLimit, rateLimitKey } from "@/lib/auth/rateLimit";
import { rateLimitResponse } from "@/lib/auth/rateLimitResponse";
import { getCurrentUser } from "@/lib/auth/session";
import { createTwoFactorSetup } from "@/lib/auth/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to set up 2FA" }, { status: 401 });
  }

  try {
    await assertRateLimit(rateLimitKey(request, "two-factor-setup"), {
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });

    return NextResponse.json(await createTwoFactorSetup(user.id));
  } catch (error) {
    const limited = rateLimitResponse(error);
    if (limited) {
      return limited;
    }

    const message = error instanceof Error ? error.message : "Unable to start 2FA setup";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
