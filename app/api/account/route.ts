import { NextResponse } from "next/server";

import { assertRateLimit, rateLimitKey } from "@/lib/auth/rateLimit";
import { rateLimitResponse } from "@/lib/auth/rateLimitResponse";
import { getCurrentUser } from "@/lib/auth/session";
import { toAuthUserResponse, updateAccount } from "@/lib/auth/service";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to update your account" }, { status: 401 });
  }

  try {
    await assertRateLimit(rateLimitKey(request, "account-update"), {
      limit: 20,
      windowMs: 15 * 60 * 1000,
    });

    const body = (await request.json()) as { name?: string | null };
    const updated = await updateAccount({
      userId: user.id,
      name: body.name ?? null,
    });

    return NextResponse.json({ user: toAuthUserResponse(updated) });
  } catch (error) {
    const limited = rateLimitResponse(error);
    if (limited) {
      return limited;
    }

    const message = error instanceof Error ? error.message : "Unable to update account";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
