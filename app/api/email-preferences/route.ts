import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

const { users } = schema;

export async function PATCH(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in to update email preferences" },
      { status: 401 },
    );
  }

  const body = (await request.json()) as { marketingEmailsEnabled?: boolean };
  const [updated] = await getDb()
    .update(users)
    .set({
      marketingEmailsEnabled: Boolean(body.marketingEmailsEnabled),
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning();

  return NextResponse.json({
    marketingEmailsEnabled: updated.marketingEmailsEnabled,
  });
}
