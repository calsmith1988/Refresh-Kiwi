import { createHash, randomBytes } from "node:crypto";

import { and, eq, gt, isNull } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";

const VERIFICATION_TOKEN_HOURS = 24;
const PASSWORD_RESET_TOKEN_MINUTES = 30;
const TWO_FACTOR_CHALLENGE_MINUTES = 10;

const { emailVerificationTokens, passwordResetTokens, twoFactorChallenges } = schema;

export function createRawToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function hoursFromNow(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function minutesFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

export async function createEmailVerificationToken(
  userId: string,
): Promise<string> {
  const token = createRawToken();

  await getDb().insert(emailVerificationTokens).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt: hoursFromNow(VERIFICATION_TOKEN_HOURS),
  });

  return token;
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = createRawToken();

  await getDb().insert(passwordResetTokens).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt: minutesFromNow(PASSWORD_RESET_TOKEN_MINUTES),
  });

  return token;
}

export async function createTwoFactorChallenge(userId: string): Promise<string> {
  const token = createRawToken();

  await getDb().insert(twoFactorChallenges).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt: minutesFromNow(TWO_FACTOR_CHALLENGE_MINUTES),
  });

  return token;
}

export async function consumeEmailVerificationToken(token: string) {
  const db = getDb();
  const [storedToken] = await db
    .select()
    .from(emailVerificationTokens)
    .where(
      and(
        eq(emailVerificationTokens.tokenHash, hashToken(token)),
        gt(emailVerificationTokens.expiresAt, new Date()),
        isNull(emailVerificationTokens.usedAt),
      ),
    )
    .limit(1);

  if (!storedToken) {
    return null;
  }

  await db
    .update(emailVerificationTokens)
    .set({ usedAt: new Date() })
    .where(eq(emailVerificationTokens.id, storedToken.id));

  return storedToken;
}

export async function consumePasswordResetToken(token: string) {
  const db = getDb();
  const [storedToken] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, hashToken(token)),
        gt(passwordResetTokens.expiresAt, new Date()),
        isNull(passwordResetTokens.usedAt),
      ),
    )
    .limit(1);

  if (!storedToken) {
    return null;
  }

  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, storedToken.id));

  return storedToken;
}

export async function getTwoFactorChallenge(token: string) {
  const [storedToken] = await getDb()
    .select()
    .from(twoFactorChallenges)
    .where(
      and(
        eq(twoFactorChallenges.tokenHash, hashToken(token)),
        gt(twoFactorChallenges.expiresAt, new Date()),
        isNull(twoFactorChallenges.usedAt),
      ),
    )
    .limit(1);

  return storedToken ?? null;
}

export async function markTwoFactorChallengeUsed(challengeId: string) {
  await getDb()
    .update(twoFactorChallenges)
    .set({ usedAt: new Date() })
    .where(eq(twoFactorChallenges.id, challengeId));
}
