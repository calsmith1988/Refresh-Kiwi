import { eq } from "drizzle-orm";
import Stripe from "stripe";

import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { sendOnce } from "@/lib/email/events";
import {
  sendPaymentFailedEmail,
  sendSubscriptionCanceledEmail,
  sendUpgradeSuccessEmail,
} from "@/lib/email/service";
import { getAppUrl, getStripeProPriceId, getStripeSecretKey } from "@/lib/stripe/config";

const { users, websites } = schema;

type Plan = typeof users.$inferSelect.plan;
type SubscriptionStatus = typeof users.$inferSelect.subscriptionStatus;

const PRO_SUBSCRIPTION_STATUSES = new Set<SubscriptionStatus>([
  "active",
  "trialing",
]);

function isProStatus(status: SubscriptionStatus): boolean {
  return PRO_SUBSCRIPTION_STATUSES.has(status);
}

function normalizeSubscriptionStatus(
  status: Stripe.Subscription.Status,
): SubscriptionStatus {
  switch (status) {
    case "active":
    case "trialing":
    case "past_due":
    case "canceled":
    case "incomplete":
      return status;
    default:
      return "none";
  }
}

async function updateUserSubscription(params: {
  userId?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  status: SubscriptionStatus;
}) {
  const db = getDb();
  const plan: Plan = isProStatus(params.status) ? "pro" : "free";
  const values: Partial<typeof users.$inferInsert> = {
    plan,
    subscriptionStatus: params.status,
    updatedAt: new Date(),
  };

  if (params.stripeCustomerId) {
    values.stripeCustomerId = params.stripeCustomerId;
  }

  if (params.stripeSubscriptionId) {
    values.stripeSubscriptionId = params.stripeSubscriptionId;
  }

  async function syncWebsites(userId: string) {
    if (plan === "pro") {
      await db
        .update(websites)
        .set({
          status: "live",
          publishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(websites.userId, userId));
      return;
    }

    await db
      .update(websites)
      .set({
        status: "preview",
        updatedAt: new Date(),
      })
      .where(eq(websites.userId, userId));
  }

  if (params.userId) {
    const [user] = await db
      .update(users)
      .set(values)
      .where(eq(users.id, params.userId))
      .returning({ id: users.id, email: users.email });
    await syncWebsites(params.userId);

    if (user) {
      await sendSubscriptionEmail({
        userId: user.id,
        email: user.email,
        status: params.status,
      });
    }

    return;
  }

  if (params.stripeCustomerId) {
    const [user] = await db
      .update(users)
      .set(values)
      .where(eq(users.stripeCustomerId, params.stripeCustomerId))
      .returning({ id: users.id, email: users.email });

    if (user) {
      await syncWebsites(user.id);
      await sendSubscriptionEmail({
        userId: user.id,
        email: user.email,
        status: params.status,
      });
    }

    return;
  }

  if (params.stripeSubscriptionId) {
    const [user] = await db
      .update(users)
      .set(values)
      .where(eq(users.stripeSubscriptionId, params.stripeSubscriptionId))
      .returning({ id: users.id, email: users.email });

    if (user) {
      await syncWebsites(user.id);
      await sendSubscriptionEmail({
        userId: user.id,
        email: user.email,
        status: params.status,
      });
    }

    return;
  }
}

async function sendSubscriptionEmail(params: {
  userId: string;
  email: string;
  status: SubscriptionStatus;
}) {
  if (params.status === "active") {
    await sendOnce({ type: "pro_started", userId: params.userId }, () =>
      sendUpgradeSuccessEmail({ to: params.email }),
    );
  }

  if (params.status === "canceled") {
    await sendOnce({ type: "subscription_canceled", userId: params.userId }, () =>
      sendSubscriptionCanceledEmail({ to: params.email }),
    );
  }
}

export function getStripeClient(): Stripe {
  return new Stripe(getStripeSecretKey(), {
    apiVersion: "2026-05-27.dahlia",
  });
}

export async function createProCheckoutSession(): Promise<string> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Sign in before upgrading to Pro");
  }

  const stripe = getStripeClient();
  let customerId = user.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name ?? undefined,
      metadata: { userId: user.id },
    });

    customerId = customer.id;

    await getDb()
      .update(users)
      .set({ stripeCustomerId: customerId, updatedAt: new Date() })
      .where(eq(users.id, user.id));
  }

  const appUrl = getAppUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: getStripeProPriceId(), quantity: 1 }],
    success_url: `${appUrl}/dashboard?upgraded=1`,
    cancel_url: `${appUrl}/dashboard?upgrade_cancelled=1`,
    metadata: { userId: user.id },
    subscription_data: {
      metadata: { userId: user.id },
    },
    allow_promotion_codes: true,
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL");
  }

  return session.url;
}

export async function createBillingPortalSession(): Promise<string> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Sign in to manage billing");
  }

  if (!user.stripeCustomerId) {
    return createProCheckoutSession();
  }

  const session = await getStripeClient().billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${getAppUrl()}/dashboard`,
  });

  return session.url;
}

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
) {
  const userId = session.metadata?.userId ?? null;
  const stripeCustomerId =
    typeof session.customer === "string" ? session.customer : null;
  const stripeSubscriptionId =
    typeof session.subscription === "string" ? session.subscription : null;

  if (!stripeSubscriptionId) {
    await updateUserSubscription({
      userId,
      stripeCustomerId,
      status: "active",
    });
    return;
  }

  const subscription = await getStripeClient().subscriptions.retrieve(
    stripeSubscriptionId,
  );

  await handleSubscriptionUpdated(subscription, userId);
}

export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  fallbackUserId?: string | null,
) {
  const stripeCustomerId =
    typeof subscription.customer === "string" ? subscription.customer : null;
  const userId = subscription.metadata.userId || fallbackUserId || null;

  await updateUserSubscription({
    userId,
    stripeCustomerId,
    stripeSubscriptionId: subscription.id,
    status: normalizeSubscriptionStatus(subscription.status),
  });
}

export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
) {
  const stripeCustomerId =
    typeof subscription.customer === "string" ? subscription.customer : null;
  const userId = subscription.metadata.userId || null;

  await updateUserSubscription({
    userId,
    stripeCustomerId,
    stripeSubscriptionId: subscription.id,
    status: "canceled",
  });
}

export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const stripeCustomerId =
    typeof invoice.customer === "string" ? invoice.customer : null;

  if (stripeCustomerId) {
    const [user] = await getDb()
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.stripeCustomerId, stripeCustomerId))
      .limit(1);

    if (user) {
      await sendOnce(
        { type: `payment_failed:${invoice.id}`, userId: user.id },
        () => sendPaymentFailedEmail({ to: user.email }),
      );
    }
  }

  await updateUserSubscription({
    stripeCustomerId,
    status: "past_due",
  });
}

export async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const stripeCustomerId =
    typeof invoice.customer === "string" ? invoice.customer : null;
  const stripeSubscriptionId =
    typeof invoice.parent?.subscription_details?.subscription === "string"
      ? invoice.parent.subscription_details.subscription
      : null;

  if (stripeSubscriptionId) {
    const subscription = await getStripeClient().subscriptions.retrieve(
      stripeSubscriptionId,
    );
    await handleSubscriptionUpdated(subscription);
    return;
  }

  await updateUserSubscription({
    stripeCustomerId,
    status: "active",
  });
}
