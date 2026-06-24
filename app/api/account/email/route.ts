import { NextResponse } from "next/server";

import { assertRateLimit, rateLimitKey } from "@/lib/auth/rateLimit";
import { rateLimitResponse } from "@/lib/auth/rateLimitResponse";
import { requestEmailChange } from "@/lib/auth/service";
import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in to change your email" },
      { status: 401 },
    );
  }

  try {
    await assertRateLimit(rateLimitKey(request, "change-email"), {
      limit: 5,
      windowMs: 15 * 60 * 1000,
      message: "Too many email change attempts. Please wait and try again.",
    });

    const body = (await request.json()) as {
      newEmail?: string;
      currentPassword?: string;
    };
    const result = await requestEmailChange({
      userId: user.id,
      newEmail: body.newEmail ?? "",
      currentPassword: body.currentPassword ?? "",
    });

    return NextResponse.json(result);
  } catch (error) {
    const limited = rateLimitResponse(error);
    if (limited) {
      return limited;
    }

    const message =
      error instanceof Error ? error.message : "Unable to request email change";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
