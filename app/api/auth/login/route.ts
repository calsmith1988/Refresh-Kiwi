import { NextResponse } from "next/server";

import { assertRateLimit, rateLimitKey } from "@/lib/auth/rateLimit";
import { rateLimitResponse } from "@/lib/auth/rateLimitResponse";
import { login, toAuthUserResponse } from "@/lib/auth/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await assertRateLimit(rateLimitKey(request, "login"), {
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });

    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };

    const result = await login({
      email: body.email ?? "",
      password: body.password ?? "",
    });

    if (result.twoFactorRequired) {
      return NextResponse.json({
        twoFactorRequired: true,
        challengeToken: result.challengeToken,
      });
    }

    return NextResponse.json({ user: toAuthUserResponse(result.user) });
  } catch (error) {
    const limited = rateLimitResponse(error);
    if (limited) {
      return limited;
    }

    const message = error instanceof Error ? error.message : "Login failed";

    return NextResponse.json({ error: message }, { status: 401 });
  }
}
