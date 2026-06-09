import { eq } from "drizzle-orm";
import Stripe from "stripe";

import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { getAppUrl, getStripeProPriceId, getStripeSecretKey } from "@/lib/stripe/config";

const { users } = schema;

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
    success_url: `${appUrl}/?upgraded=1`,
    cancel_url: `${appUrl}/?upgrade_cancelled=1`,
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
