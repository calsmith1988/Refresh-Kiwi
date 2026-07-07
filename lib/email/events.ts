import { and, eq } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";

const { emailEvents, users } = schema;

export async function hasEmailEvent(params: {
  type: string;
  userId?: string | null;
  websiteId?: string | null;
}): Promise<boolean> {
  const conditions = [eq(emailEvents.type, params.type)];

  if (params.userId) {
    conditions.push(eq(emailEvents.userId, params.userId));
  }

  if (params.websiteId) {
    conditions.push(eq(emailEvents.websiteId, params.websiteId));
  }

  const [event] = await getDb()
    .select({ id: emailEvents.id })
    .from(emailEvents)
    .where(and(...conditions))
    .limit(1);

  return Boolean(event);
}

function dedupeKeyFor(params: {
  type: string;
  userId?: string | null;
  websiteId?: string | null;
}): string {
  return `${params.type}:${params.userId ?? ""}:${params.websiteId ?? ""}`;
}

/**
 * Records the event, returning false if an identical event was already
 * recorded (unique index on dedupe_key makes this race-safe).
 */
export async function recordEmailEvent(params: {
  type: string;
  userId?: string | null;
  websiteId?: string | null;
}): Promise<boolean> {
  const [inserted] = await getDb()
    .insert(emailEvents)
    .values({
      type: params.type,
      userId: params.userId ?? null,
      websiteId: params.websiteId ?? null,
      dedupeKey: dedupeKeyFor(params),
    })
    .onConflictDoNothing({ target: emailEvents.dedupeKey })
    .returning({ id: emailEvents.id });

  return Boolean(inserted);
}

export async function sendOnce(
  params: {
    type: string;
    userId?: string | null;
    websiteId?: string | null;
  },
  send: () => Promise<void>,
) {
  // Covers rows recorded before dedupe_key existed (their key is NULL, so the
  // unique index alone wouldn't catch them).
  if (await hasEmailEvent(params)) {
    return false;
  }

  // Claim before sending: if two workers race, only one insert wins, so the
  // email can't go out twice. On send failure the claim is released so a
  // later run can retry.
  if (!(await recordEmailEvent(params))) {
    return false;
  }

  try {
    await send();
  } catch (error) {
    await getDb()
      .delete(emailEvents)
      .where(eq(emailEvents.dedupeKey, dedupeKeyFor(params)));
    throw error;
  }

  return true;
}

export async function userAllowsMarketing(userId: string): Promise<boolean> {
  const [user] = await getDb()
    .select({ marketingEmailsEnabled: users.marketingEmailsEnabled })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user?.marketingEmailsEnabled ?? false;
}
