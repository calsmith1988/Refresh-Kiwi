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

export async function recordEmailEvent(params: {
  type: string;
  userId?: string | null;
  websiteId?: string | null;
}) {
  await getDb().insert(emailEvents).values({
    type: params.type,
    userId: params.userId ?? null,
    websiteId: params.websiteId ?? null,
  });
}

export async function sendOnce(
  params: {
    type: string;
    userId?: string | null;
    websiteId?: string | null;
  },
  send: () => Promise<void>,
) {
  if (await hasEmailEvent(params)) {
    return false;
  }

  await send();
  await recordEmailEvent(params);
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
