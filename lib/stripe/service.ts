import { and, eq, ne, type SQL } from "drizzle-orm";
import Stripe from "stripe";

import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { sendOnce } from "@/lib/email/events";
import {
  sendPaymentFailedEmail,
  sendSubscriptionCanceledEmail,
  sendUpgradeSuccessEmail,
} from "@/lib/email/service";
import { metaUserDataFromRequest, sendMetaEvent } from "@/lib/meta/events";
import { resolveCountryCodeFromRequest } from "@/lib/pricing/geo";
import {
  buildPricingResponse,
  normalizeSupportedCurrency,
} from "@/lib/pricing/regions";
import {
  FREE_MONTH_TRIAL_DAYS,
  findRedeemableRewardForUser,
  markRewardRedeemed,
} from "@/lib/rewards/service";
import {
  getAppUrl,
  getStripeProPriceId,
  getStripeSecretKey,
} from "@/lib/stripe/config";

const { users, websites } = schema;

type Plan = typeof users.$inferSelect.plan;
type SubscriptionStatus = typeof users.$inferSelect.subscriptionStatus;
type SubscriptionEmailUser = {
  id: string;
  email: string;
  previousPlan: Plan;
  previousStripeSubscriptionId: string | null;
};

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

  const websiteStatusValues =
    plan === "pro"
      ? { status: "live" as const, publishedAt: new Date(), updatedAt: new Date() }
      : { status: "preview" as const, updatedAt: new Date() };

  // Apply the plan change and the dependent website status sync atomically:
  // a partial apply (user upgraded but sites still "preview", or downgraded
  // but sites still "live") mis-gates access and publishing.
  async function applyPlanChange(
    where: SQL,
  ): Promise<SubscriptionEmailUser | null> {
    return db.transaction(async (tx) => {
      const [currentUser] = await tx
        .select({
          id: users.id,
          email: users.email,
          plan: users.plan,
          stripeSubscriptionId: users.stripeSubscriptionId,
        })
        .from(users)
        .where(where)
        .limit(1);

      if (!currentUser) {
        return null;
      }

      const [updatedUser] = await tx
        .update(users)
        .set(values)
        .where(eq(users.id, currentUser.id))
        .returning({ id: users.id, email: users.email });

      if (updatedUser) {
        // Never resurrect soft-deleted sites: archived rows have had their R2
        // files removed, so flipping them back to "live" creates zombie sites.
        // Complimentary sites are excluded too: their "live" status is gifted
        // by an admin and must survive the owner's Stripe plan changes.
        await tx
          .update(websites)
          .set(websiteStatusValues)
          .where(
            and(
              eq(websites.userId, updatedUser.id),
              ne(websites.status, "archived"),
              eq(websites.isComplimentary, false),
            ),
          );
      }

      return updatedUser
        ? {
            id: updatedUser.id,
            email: updatedUser.email,
            previousPlan: currentUser.plan,
            previousStripeSubscriptionId: currentUser.stripeSubscriptionId,
          }
        : null;
    });
  }

  if (params.userId) {
    const user = await applyPlanChange(eq(users.id, params.userId));

    if (user) {
      await sendSubscriptionEmail({
        userId: user.id,
        email: user.email,
        status: params.status,
        stripeSubscriptionId: params.stripeSubscriptionId,
        previousPlan: user.previousPlan,
        previousStripeSubscriptionId: user.previousStripeSubscriptionId,
      });
    }

    return;
  }

  if (params.stripeCustomerId) {
    const user = await applyPlanChange(
      eq(users.stripeCustomerId, params.stripeCustomerId),
    );

    if (user) {
      await sendSubscriptionEmail({
        userId: user.id,
        email: user.email,
        status: params.status,
        stripeSubscriptionId: params.stripeSubscriptionId,
        previousPlan: user.previousPlan,
        previousStripeSubscriptionId: user.previousStripeSubscriptionId,
      });
    }

    return;
  }

  if (params.stripeSubscriptionId) {
    const user = await applyPlanChange(
      eq(users.stripeSubscriptionId, params.stripeSubscriptionId),
    );

    if (user) {
      await sendSubscriptionEmail({
        userId: user.id,
        email: user.email,
        status: params.status,
        stripeSubscriptionId: params.stripeSubscriptionId,
        previousPlan: user.previousPlan,
        previousStripeSubscriptionId: user.previousStripeSubscriptionId,
      });
    }

    return;
  }
}

async function sendSubscriptionEmail(params: {
  userId: string;
  email: string;
  status: SubscriptionStatus;
  stripeSubscriptionId?: string | null;
  previousPlan: Plan;
  previousStripeSubscriptionId: string | null;
}) {
  const movedOntoPro =
    params.status === "active" &&
    params.previousPlan !== "pro" &&
    (!params.stripeSubscriptionId ||
      params.stripeSubscriptionId !== params.previousStripeSubscriptionId);

  if (movedOntoPro) {
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

export async function createProCheckoutSession(params?: {
  request?: Request;
  metaEventId?: string | null;
  currency?: string | null;
}): Promise<string> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Sign in before upgrading to Pro");
  }

  const stripe = getStripeClient();
  let customerId = user.stripeCustomerId;
  const countryCode = resolveCountryCodeFromRequest(params?.request);
  const selectedCurrency = normalizeSupportedCurrency(params?.currency);
  const pricing = buildPricingResponse({
    countryCode,
    currency: selectedCurrency,
  });

  if (!pricing.checkoutAllowed) {
    throw new Error(
      pricing.checkoutUnavailableMessage ?? "Kiwi Pro is not available yet.",
    );
  }

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
  const metaEventId = params?.metaEventId || `checkout.${user.id}.${Date.now()}`;
  // A won free month is applied as a 30-day trial: the card is still collected
  // and "trialing" already counts as Pro everywhere, so no other billing logic
  // changes. Customer-facing copy always calls it a free month, never a trial.
  const reward = await findRedeemableRewardForUser(user.id);
  const checkoutParams: Stripe.Checkout.SessionCreateParams & {
    adaptive_pricing?: { enabled: boolean };
    currency?: string;
  } = {
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: getStripeProPriceId(), quantity: 1 }],
    success_url: `${appUrl}/dashboard?upgraded=1`,
    cancel_url: `${appUrl}/dashboard?upgrade_cancelled=1`,
    metadata: {
      userId: user.id,
      metaEventId,
      currency: pricing.currency,
      countryCode,
    },
    subscription_data: {
      metadata: {
        userId: user.id,
        metaEventId,
        currency: pricing.currency,
        countryCode,
        ...(reward ? { rewardId: reward.id } : {}),
      },
      ...(reward ? { trial_period_days: FREE_MONTH_TRIAL_DAYS } : {}),
    },
    allow_promotion_codes: true,
    adaptive_pricing: { enabled: true },
    ...(selectedCurrency ? { currency: selectedCurrency.toLowerCase() } : {}),
  };

  const session = await stripe.checkout.sessions.create(checkoutParams);

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL");
  }

  await sendMetaEvent({
    eventName: "InitiateCheckout",
    eventId: metaEventId,
    eventSourceUrl: params?.request?.headers.get("referer"),
    userData: params?.request
      ? metaUserDataFromRequest(params.request, { email: user.email })
      : { email: user.email },
    customData: {
      content_name: "Kiwi Pro",
      currency: pricing.currency,
    },
  });

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
  const metaEventId =
    session.metadata?.metaEventId ?? `subscribe.${session.id}`;
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
    await sendMetaEvent({
      eventName: "Subscribe",
      eventId: metaEventId,
      eventSourceUrl: getAppUrl(),
      userData: {
        email: session.customer_details?.email ?? session.customer_email,
      },
      customData: {
        content_name: "Kiwi Pro",
        currency: session.currency?.toUpperCase() ?? "GBP",
        value: session.amount_total ? session.amount_total / 100 : undefined,
      },
    });
    return;
  }

  const subscription = await getStripeClient().subscriptions.retrieve(
    stripeSubscriptionId,
  );

  await handleSubscriptionUpdated(subscription, userId);
  await sendMetaEvent({
    eventName: "Subscribe",
    eventId: metaEventId,
    eventSourceUrl: getAppUrl(),
    userData: {
      email: session.customer_details?.email ?? session.customer_email,
    },
    customData: {
      content_name: "Kiwi Pro",
      currency: session.currency?.toUpperCase() ?? "GBP",
      value: session.amount_total ? session.amount_total / 100 : undefined,
    },
  });
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

  // The subscription now exists, so a won free month has been spent. Safe to
  // repeat: markRewardRedeemed only moves rows out of "attached".
  //
  // Bookkeeping only, so a failure here must not fail the webhook — the plan
  // sync above is the part that gates access. The trade-off is that a reward
  // left stranded in "attached" could fund a second free month if the customer
  // cancels and resubscribes, which is far cheaper than a plan sync that keeps
  // failing and retrying.
  const rewardId = subscription.metadata.rewardId;

  if (rewardId) {
    try {
      await markRewardRedeemed(rewardId);
    } catch (error) {
      console.error("[refresh-kiwi] could not mark reward redeemed", error);
    }
  }
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
