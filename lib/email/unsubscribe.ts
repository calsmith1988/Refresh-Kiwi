import { createHmac, timingSafeEqual } from "node:crypto";

import { eq } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";

const { users } = schema;

function getUnsubscribeSecret(): string {
  return (
    process.env.EMAIL_UNSUBSCRIBE_SECRET?.trim() ||
    process.env.STRIPE_WEBHOOK_SECRET?.trim() ||
    "refresh-kiwi-local-unsubscribe"
  );
}

function signatureForUser(userId: string): string {
  return createHmac("sha256", getUnsubscribeSecret()).update(userId).digest("hex");
}

export function createUnsubscribeToken(userId: string): string {
  return `${userId}.${signatureForUser(userId)}`;
}

export function verifyUnsubscribeToken(token: string): string | null {
  const [userId, signature] = token.split(".");

  if (!userId || !signature) {
    return null;
  }

  const expected = signatureForUser(userId);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);

  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }

  return userId;
}

export async function unsubscribeMarketingEmails(token: string): Promise<boolean> {
  const userId = verifyUnsubscribeToken(token);

  if (!userId) {
    return false;
  }

  await getDb()
    .update(users)
    .set({ marketingEmailsEnabled: false, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return true;
}
