import { NextResponse } from "next/server";

import { assertRateLimit, rateLimitKey } from "@/lib/auth/rateLimit";
import { rateLimitResponse } from "@/lib/auth/rateLimitResponse";
import { completeTwoFactorLogin, toAuthUserResponse } from "@/lib/auth/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await assertRateLimit(rateLimitKey(request, "two-factor-login"), {
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });

    const body = (await request.json()) as {
      challengeToken?: string;
      code?: string;
    };

    if (!body.challengeToken || !body.code) {
      return NextResponse.json(
        { error: "Two-factor challenge and code are required" },
        { status: 400 },
      );
    }

    const user = await completeTwoFactorLogin({
      challengeToken: body.challengeToken,
      code: body.code,
    });

    return NextResponse.json({ user: toAuthUserResponse(user) });
  } catch (error) {
    const limited = rateLimitResponse(error);
    if (limited) {
      return limited;
    }

    const message =
      error instanceof Error ? error.message : "Unable to verify two-factor code";

    return NextResponse.json({ error: message }, { status: 401 });
  }
}
