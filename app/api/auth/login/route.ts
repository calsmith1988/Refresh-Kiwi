import { NextResponse } from "next/server";

import { assertRateLimit, rateLimitKey } from "@/lib/auth/rateLimit";
import { login, toAuthUserResponse } from "@/lib/auth/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertRateLimit(rateLimitKey(request, "login"), {
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });

    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };

    const user = await login({
      email: body.email ?? "",
      password: body.password ?? "",
    });

    return NextResponse.json({ user: toAuthUserResponse(user) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";

    return NextResponse.json({ error: message }, { status: 401 });
  }
}
