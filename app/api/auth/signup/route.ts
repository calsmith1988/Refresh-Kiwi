import { NextResponse } from "next/server";

import { assertRateLimit, rateLimitKey } from "@/lib/auth/rateLimit";
import { rateLimitResponse } from "@/lib/auth/rateLimitResponse";
import { signUp, toAuthUserResponse } from "@/lib/auth/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await assertRateLimit(rateLimitKey(request, "signup"), {
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });

    const body = (await request.json()) as {
      email?: string;
      password?: string;
      name?: string;
    };

    const user = await signUp({
      email: body.email ?? "",
      password: body.password ?? "",
      name: body.name ?? null,
    });

    return NextResponse.json({ user: toAuthUserResponse(user) }, { status: 201 });
  } catch (error) {
    const limited = rateLimitResponse(error);
    if (limited) {
      return limited;
    }

    const message = error instanceof Error ? error.message : "Signup failed";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
