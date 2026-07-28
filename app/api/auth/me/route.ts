import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { toAuthUserResponse } from "@/lib/auth/service";
import { findRedeemableRewardForUser } from "@/lib/rewards/service";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  // Sibling field rather than part of the user object: a won free month isn't
  // an account property, and this keeps toAuthUserResponse (used by every
  // other auth route) unchanged. The reward id stays server-side.
  const reward = user ? await findRedeemableRewardForUser(user.id) : null;

  return NextResponse.json(
    {
      user: user ? toAuthUserResponse(user) : null,
      activeReward: reward
        ? { kind: reward.kind, expiresAt: reward.expiresAt }
        : null,
    },
    {
      // Account details must never be cached by shared proxies or served
      // stale to another user from a shared browser cache.
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
