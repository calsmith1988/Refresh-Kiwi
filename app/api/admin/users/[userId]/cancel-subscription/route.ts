import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { recordAdminAction } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/admin/guard";
import { getDb, schema } from "@/lib/db";
import { getStripeClient } from "@/lib/stripe/service";

export const runtime = "nodejs";

const { users } = schema;

interface RouteContext {
  params: Promise<{ userId: string }>;
}

/**
 * Cancels the user's Pro subscription at the end of the current billing
 * period — the safe default for "please cancel for me" support requests. The
 * user keeps Pro until the period ends, and the Stripe webhook downgrades
 * them when the subscription is actually deleted. Refunds and immediate
 * cancellations are deliberately left to the Stripe dashboard.
 */
export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();

  if ("response" in auth) {
    return auth.response;
  }

  const { userId } = await context.params;
  const [user] = await getDb()
    .select({
      id: users.id,
      email: users.email,
      stripeSubscriptionId: users.stripeSubscriptionId,
      subscriptionStatus: users.subscriptionStatus,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!user.stripeSubscriptionId) {
    return NextResponse.json(
      { error: "This user has no Stripe subscription to cancel." },
      { status: 400 },
    );
  }

  try {
    const subscription = await getStripeClient().subscriptions.update(
      user.stripeSubscriptionId,
      { cancel_at_period_end: true },
    );

    await recordAdminAction({
      adminUserId: auth.user.id,
      adminEmail: auth.user.email,
      action: "cancel_subscription_at_period_end",
      targetType: "subscription",
      targetId: user.stripeSubscriptionId,
      details: {
        userId: user.id,
        userEmail: user.email,
        cancelAt: subscription.cancel_at,
      },
    });

    return NextResponse.json({
      ok: true,
      cancelAt: subscription.cancel_at,
      message:
        "Subscription set to cancel at the end of the current billing period.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to cancel subscription";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
