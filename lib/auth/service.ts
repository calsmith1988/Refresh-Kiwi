import { eq } from "drizzle-orm";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  clearUserSessions,
  createSession,
  setSessionCookie,
} from "@/lib/auth/session";
import {
  consumeEmailVerificationToken,
  consumePasswordResetToken,
  createEmailVerificationToken,
  createPasswordResetToken,
  createTwoFactorChallenge,
  getTwoFactorChallenge,
  markTwoFactorChallengeUsed,
} from "@/lib/auth/tokens";
import {
  buildTotpUri,
  consumeRecoveryCode,
  createRecoveryCodes,
  createTwoFactorSecret,
  replaceRecoveryCodes,
  verifyTotpCode,
} from "@/lib/auth/twoFactor";
import { getDb, schema } from "@/lib/db";
import {
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
} from "@/lib/email/service";

const { users } = schema;

export interface AuthUserResponse {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  marketingEmailsEnabled: boolean;
  plan: "free" | "pro";
  subscriptionStatus: string;
}

export function toAuthUserResponse(
  user: typeof users.$inferSelect,
): AuthUserResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    emailVerified: Boolean(user.emailVerifiedAt),
    twoFactorEnabled: user.twoFactorEnabled,
    marketingEmailsEnabled: user.marketingEmailsEnabled,
    plan: user.plan,
    subscriptionStatus: user.subscriptionStatus,
  };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validatePassword(password: string): void {
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }
}

export async function signUp(params: {
  email: string;
  password: string;
  name?: string | null;
}) {
  const email = normalizeEmail(params.email);

  if (!email.includes("@")) {
    throw new Error("Enter a valid email address");
  }

  validatePassword(params.password);

  const db = getDb();
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    throw new Error("An account already exists for this email");
  }

  const [user] = await db
    .insert(users)
    .values({
      email,
      name: params.name?.trim() || null,
      passwordHash: await hashPassword(params.password),
    })
    .returning();

  const token = await createSession(user.id);
  await setSessionCookie(token);
  const verificationToken = await createEmailVerificationToken(user.id);

  await Promise.all([
    sendWelcomeEmail({ to: user.email, name: user.name }),
    sendVerificationEmail({ to: user.email, token: verificationToken }),
  ]);

  return user;
}

export async function login(params: { email: string; password: string }) {
  const email = normalizeEmail(params.email);
  const [user] = await getDb()
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user || !(await verifyPassword(params.password, user.passwordHash))) {
    throw new Error("Invalid email or password");
  }

  if (user.twoFactorEnabled) {
    return {
      twoFactorRequired: true as const,
      challengeToken: await createTwoFactorChallenge(user.id),
    };
  }

  const token = await createSession(user.id);
  await setSessionCookie(token);

  return {
    twoFactorRequired: false as const,
    user,
  };
}

export async function completeTwoFactorLogin(params: {
  challengeToken: string;
  code: string;
}) {
  const challenge = await getTwoFactorChallenge(params.challengeToken);

  if (!challenge) {
    throw new Error("Two-factor challenge is invalid or has expired");
  }

  const [user] = await getDb()
    .select()
    .from(users)
    .where(eq(users.id, challenge.userId))
    .limit(1);

  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    throw new Error("Two-factor authentication is not enabled for this account");
  }

  const validTotp = verifyTotpCode({
    secret: user.twoFactorSecret,
    code: params.code,
  });
  const validRecoveryCode = validTotp
    ? false
    : await consumeRecoveryCode({ userId: user.id, code: params.code });

  if (!validTotp && !validRecoveryCode) {
    throw new Error("Invalid two-factor code");
  }

  await markTwoFactorChallengeUsed(challenge.id);
  const token = await createSession(user.id);
  await setSessionCookie(token);

  return user;
}

export async function resendVerificationEmail(userId: string) {
  const [user] = await getDb()
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error("User not found");
  }

  if (user.twoFactorEnabled) {
    throw new Error("Two-factor authentication is already enabled");
  }

  if (user.emailVerifiedAt) {
    return;
  }

  const token = await createEmailVerificationToken(user.id);
  await sendVerificationEmail({ to: user.email, token });
}

export async function verifyEmail(token: string) {
  const consumed = await consumeEmailVerificationToken(token);

  if (!consumed) {
    throw new Error("Verification link is invalid or has expired");
  }

  const [user] = await getDb()
    .update(users)
    .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, consumed.userId))
    .returning();

  return user;
}

export async function requestPasswordReset(emailInput: string) {
  const email = normalizeEmail(emailInput);

  if (!email.includes("@")) {
    return;
  }

  const [user] = await getDb()
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    return;
  }

  const token = await createPasswordResetToken(user.id);
  await sendPasswordResetEmail({ to: user.email, token });
}

export async function resetPassword(params: {
  token: string;
  password: string;
}) {
  validatePassword(params.password);

  const consumed = await consumePasswordResetToken(params.token);

  if (!consumed) {
    throw new Error("Reset link is invalid or has expired");
  }

  const [user] = await getDb()
    .update(users)
    .set({
      passwordHash: await hashPassword(params.password),
      updatedAt: new Date(),
    })
    .where(eq(users.id, consumed.userId))
    .returning();

  await clearUserSessions(user.id);
  await sendPasswordChangedEmail({ to: user.email });

  return user;
}

export async function updateAccount(params: {
  userId: string;
  name?: string | null;
}) {
  const [user] = await getDb()
    .update(users)
    .set({
      name: params.name?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, params.userId))
    .returning();

  return user;
}

export async function changePassword(params: {
  userId: string;
  currentPassword: string;
  newPassword: string;
}) {
  validatePassword(params.newPassword);

  const [user] = await getDb()
    .select()
    .from(users)
    .where(eq(users.id, params.userId))
    .limit(1);

  if (!user || !(await verifyPassword(params.currentPassword, user.passwordHash))) {
    throw new Error("Current password is incorrect");
  }

  const [updated] = await getDb()
    .update(users)
    .set({
      passwordHash: await hashPassword(params.newPassword),
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning();

  await clearUserSessions(user.id);
  const token = await createSession(user.id);
  await setSessionCookie(token);
  await sendPasswordChangedEmail({ to: user.email });

  return updated;
}

export async function createTwoFactorSetup(userId: string) {
  const [user] = await getDb()
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error("User not found");
  }

  const secret = createTwoFactorSecret();

  await getDb()
    .update(users)
    .set({
      twoFactorSecret: secret,
      twoFactorEnabled: false,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  return {
    secret,
    otpauthUrl: buildTotpUri({ email: user.email, secret }),
  };
}

export async function enableTwoFactor(params: {
  userId: string;
  code: string;
}) {
  const [user] = await getDb()
    .select()
    .from(users)
    .where(eq(users.id, params.userId))
    .limit(1);

  if (!user || !user.twoFactorSecret) {
    throw new Error("Start two-factor setup first");
  }

  if (!verifyTotpCode({ secret: user.twoFactorSecret, code: params.code })) {
    throw new Error("Invalid authenticator code");
  }

  const recoveryCodes = createRecoveryCodes();
  await replaceRecoveryCodes({ userId: user.id, codes: recoveryCodes });

  const [updated] = await getDb()
    .update(users)
    .set({
      twoFactorEnabled: true,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning();

  return { user: updated, recoveryCodes };
}

export async function disableTwoFactor(params: {
  userId: string;
  password: string;
}) {
  const [user] = await getDb()
    .select()
    .from(users)
    .where(eq(users.id, params.userId))
    .limit(1);

  if (!user || !(await verifyPassword(params.password, user.passwordHash))) {
    throw new Error("Password is incorrect");
  }

  await getDb()
    .delete(schema.twoFactorRecoveryCodes)
    .where(eq(schema.twoFactorRecoveryCodes.userId, user.id));

  const [updated] = await getDb()
    .update(users)
    .set({
      twoFactorEnabled: false,
      twoFactorSecret: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning();

  await clearUserSessions(user.id);
  const token = await createSession(user.id);
  await setSessionCookie(token);

  return updated;
}

export async function regenerateRecoveryCodes(params: {
  userId: string;
  password: string;
}) {
  const [user] = await getDb()
    .select()
    .from(users)
    .where(eq(users.id, params.userId))
    .limit(1);

  if (
    !user ||
    !user.twoFactorEnabled ||
    !(await verifyPassword(params.password, user.passwordHash))
  ) {
    throw new Error("Password is incorrect");
  }

  const recoveryCodes = createRecoveryCodes();
  await replaceRecoveryCodes({ userId: user.id, codes: recoveryCodes });

  return recoveryCodes;
}
