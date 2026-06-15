import { NextResponse } from "next/server";

import { assertRateLimit, rateLimitKey } from "@/lib/auth/rateLimit";
import { rateLimitResponse } from "@/lib/auth/rateLimitResponse";
import { getCurrentUser } from "@/lib/auth/session";
import { enableTwoFactor, toAuthUserResponse } from "@/lib/auth/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to enable 2FA" }, { status: 401 });
  }

  try {
    await assertRateLimit(rateLimitKey(request, "two-factor-enable"), {
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });

    const body = (await request.json()) as { code?: string };
    const result = await enableTwoFactor({
      userId: user.id,
      code: body.code ?? "",
    });

    return NextResponse.json({
      user: toAuthUserResponse(result.user),
      recoveryCodes: result.recoveryCodes,
    });
  } catch (error) {
    const limited = rateLimitResponse(error);
    if (limited) {
      return limited;
    }

    const message = error instanceof Error ? error.message : "Unable to enable 2FA";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
