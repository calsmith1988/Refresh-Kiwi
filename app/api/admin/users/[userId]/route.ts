import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { recordAdminAction } from "@/lib/admin/audit";
import { isAdminEmail, requireAdmin } from "@/lib/admin/guard";
import { getAdminUserDetail } from "@/lib/admin/service";
import { deleteAccount } from "@/lib/auth/service";
import { getDb, schema } from "@/lib/db";

export const runtime = "nodejs";

const { users, websites } = schema;

interface RouteContext {
  params: Promise<{ userId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();

  if ("response" in auth) {
    return auth.response;
  }

  const { userId } = await context.params;
  const detail = await getAdminUserDetail(userId);

  if (!detail) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(detail);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();

  if ("response" in auth) {
    return auth.response;
  }

  const { userId } = await context.params;

  if (userId === auth.user.id) {
    return NextResponse.json(
      { error: "You cannot delete your own admin account from here." },
      { status: 400 },
    );
  }

  const db = getDb();
  const [target] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (isAdminEmail(target.email)) {
    return NextResponse.json(
      { error: "Admin accounts cannot be deleted from the dashboard." },
      { status: 400 },
    );
  }

  // Counted before deletion for the audit trail; the rows themselves are
  // archived/unlinked by deleteAccount.
  const ownedWebsites = await db
    .select({ slug: websites.slug })
    .from(websites)
    .where(eq(websites.userId, target.id));

  try {
    await deleteAccount({ userId: target.id, skipPasswordCheck: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete user";

    return NextResponse.json({ error: message }, { status: 400 });
  }

  await recordAdminAction({
    adminUserId: auth.user.id,
    adminEmail: auth.user.email,
    action: "delete_user",
    targetType: "user",
    targetId: target.id,
    details: {
      email: target.email,
      archivedWebsiteSlugs: ownedWebsites.map((website) => website.slug),
    },
  });

  return NextResponse.json({ ok: true });
}
