import { NextResponse } from "next/server";

import { assertRateLimit, rateLimitKey } from "@/lib/auth/rateLimit";
import { rateLimitResponse } from "@/lib/auth/rateLimitResponse";
import { clearSessionCookie, getCurrentUser } from "@/lib/auth/session";
import {
  deleteAccount,
  toAuthUserResponse,
  updateAccount,
} from "@/lib/auth/service";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in to update your account" },
      { status: 401 },
    );
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

    const message =
      error instanceof Error ? error.message : "Unable to update account";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in to delete your account" },
      { status: 401 },
    );
  }

  try {
    await assertRateLimit(rateLimitKey(request, "account-delete"), {
      limit: 5,
      windowMs: 15 * 60 * 1000,
      message: "Too many account deletion attempts. Please wait and try again.",
    });

    const body = (await request.json().catch(() => ({}))) as {
      currentPassword?: string;
    };

    await deleteAccount({
      userId: user.id,
      currentPassword:
        typeof body.currentPassword === "string" ? body.currentPassword : "",
    });
    await clearSessionCookie();

    return NextResponse.json({ ok: true });
  } catch (error) {
    const limited = rateLimitResponse(error);
    if (limited) {
      return limited;
    }

    const message =
      error instanceof Error ? error.message : "Unable to delete account";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
