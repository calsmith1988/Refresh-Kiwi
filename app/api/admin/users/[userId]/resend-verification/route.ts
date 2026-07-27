import { NextResponse } from "next/server";

import { recordAdminAction } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/admin/guard";
import { resendVerificationEmail } from "@/lib/auth/service";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ userId: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();

  if ("response" in auth) {
    return auth.response;
  }

  const { userId } = await context.params;

  try {
    await resendVerificationEmail(userId);

    await recordAdminAction({
      adminUserId: auth.user.id,
      adminEmail: auth.user.email,
      action: "resend_verification_email",
      targetType: "user",
      targetId: userId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to resend verification email";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
