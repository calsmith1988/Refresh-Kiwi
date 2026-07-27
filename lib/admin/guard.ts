import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";

export type AdminUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string): boolean {
  return adminEmails().has(email.trim().toLowerCase());
}

/**
 * Admin access = a signed-in, email-verified user whose email is on the
 * ADMIN_EMAILS allowlist, with 2FA enabled (enforced in production so local
 * dev doesn't require an authenticator). Unset ADMIN_EMAILS disables the
 * whole admin surface.
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  const user = await getCurrentUser();

  if (!user || !isAdminEmail(user.email) || !user.emailVerifiedAt) {
    return null;
  }

  if (process.env.NODE_ENV === "production" && !user.twoFactorEnabled) {
    return null;
  }

  return user;
}

/** 404, not 401/403 — non-admins shouldn't learn the admin surface exists. */
export function adminNotFoundResponse(): NextResponse {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function requireAdmin(): Promise<
  { user: AdminUser } | { response: NextResponse }
> {
  const user = await getAdminUser();

  if (!user) {
    return { response: adminNotFoundResponse() };
  }

  return { user };
}
