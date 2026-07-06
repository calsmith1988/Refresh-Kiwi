import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getDb, schema } from "@/lib/db";
import { getStripeWebhookSecret } from "@/lib/stripe/config";
import {
  getStripeClient,
  handleCheckoutSessionCompleted,
  handleInvoicePaymentFailed,
  handleInvoicePaymentSucceeded,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
} from "@/lib/stripe/service";

export const runtime = "nodejs";

const { stripeEvents } = schema;

/**
 * Records the event id and returns false if we've already processed it.
 * Stripe retries deliveries, so this guards against double plan syncs and
 * duplicate emails. The primary-key conflict is the atomic dedupe point.
 */
async function claimStripeEvent(event: Stripe.Event): Promise<boolean> {
  const inserted = await getDb()
    .insert(stripeEvents)
    .values({ id: event.id, type: event.type })
    .onConflictDoNothing({ target: stripeEvents.id })
    .returning({ id: stripeEvents.id });

  return inserted.length > 0;
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripeClient().webhooks.constructEvent(
      await request.text(),
      signature,
      getStripeWebhookSecret(),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid Stripe webhook";

    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    // Skip events we've already handled (Stripe re-delivers on retry).
    if (!(await claimStripeEvent(event))) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object);
        break;
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    // Release the idempotency claim so Stripe's retry can reprocess — we only
    // want to skip events that fully succeeded.
    await getDb()
      .delete(stripeEvents)
      .where(eq(stripeEvents.id, event.id))
      .catch(() => {});

    const message =
      error instanceof Error ? error.message : "Failed to process webhook";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
