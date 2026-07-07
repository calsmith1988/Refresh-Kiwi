import { createHmac, timingSafeEqual } from "node:crypto";

import { eq } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";

const { users } = schema;

function getUnsubscribeSecret(): string {
  const secret = process.env.EMAIL_UNSUBSCRIBE_SECRET?.trim();

  if (secret) {
    if (secret.length < 16) {
      throw new Error(
        "EMAIL_UNSUBSCRIBE_SECRET must be at least 16 characters",
      );
    }

    return secret;
  }

  // Tokens signed with a guessable secret would let anyone unsubscribe (or
  // probe) arbitrary user IDs, so production must configure a real secret.
  if (process.env.NODE_ENV === "production") {
    throw new Error("EMAIL_UNSUBSCRIBE_SECRET is not configured");
  }

  return "refresh-kiwi-local-unsubscribe";
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
