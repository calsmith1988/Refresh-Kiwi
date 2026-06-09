import { eq } from "drizzle-orm";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";

const { users } = schema;

export interface AuthUserResponse {
  id: string;
  email: string;
  name: string | null;
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
    plan: user.plan,
    subscriptionStatus: user.subscriptionStatus,
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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

  if (params.password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

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

  const token = await createSession(user.id);
  await setSessionCookie(token);

  return user;
}
