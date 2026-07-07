import { createHash, randomBytes } from "node:crypto";

import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";

import { getDb, schema } from "@/lib/db";

const SESSION_COOKIE = "refresh_kiwi_session";
const SESSION_DAYS = 30;

const { sessions, users } = schema;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function sessionExpiry(): Date {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = sessionExpiry();

  await getDb().insert(sessions).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt,
  });

  return token;
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: sessionExpiry(),
  });
}

/**
 * Session rotation: invalidate whatever session token the browser presented
 * before issuing a fresh one at authentication time. Prevents a previously
 * captured or fixated token from remaining valid across a new login.
 */
export async function invalidateCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await getDb()
      .delete(sessions)
      .where(eq(sessions.tokenHash, hashToken(token)));
  }
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await getDb()
      .delete(sessions)
      .where(eq(sessions.tokenHash, hashToken(token)));
  }

  cookieStore.delete(SESSION_COOKIE);
}

export async function clearUserSessions(userId: string): Promise<void> {
  await getDb().delete(sessions).where(eq(sessions.userId, userId));
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const [session] = await getDb()
    .select({
      user: users,
      sessionId: sessions.id,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, hashToken(token)),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return session?.user ?? null;
}
