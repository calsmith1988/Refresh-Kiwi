export function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY?.trim();

  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  return key;
}

export function getStripeProPriceId(): string {
  const priceId = process.env.STRIPE_PRO_PRICE_ID?.trim();

  if (!priceId) {
    throw new Error("STRIPE_PRO_PRICE_ID is not configured");
  }

  return priceId;
}

export function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.RENDER_EXTERNAL_URL?.trim() ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}
