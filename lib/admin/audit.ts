import { desc } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";

const { adminAuditLog } = schema;

export type AdminAuditEntry = {
  adminUserId: string;
  adminEmail: string;
  action: string;
  targetType: "user" | "website" | "domain" | "edit_request" | "subscription";
  targetId?: string | null;
  details?: Record<string, unknown>;
};

/**
 * Audit writes must never block or fail the admin action itself — an insert
 * failure is logged and swallowed.
 */
export async function recordAdminAction(entry: AdminAuditEntry): Promise<void> {
  try {
    await getDb().insert(adminAuditLog).values({
      adminUserId: entry.adminUserId,
      adminEmail: entry.adminEmail,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId ?? null,
      details: entry.details ?? null,
    });
  } catch (error) {
    console.error(
      `[refresh-kiwi] failed to record admin audit entry action=${entry.action}`,
      error,
    );
  }
}

export async function listAdminAuditLog(limit = 200) {
  return getDb()
    .select()
    .from(adminAuditLog)
    .orderBy(desc(adminAuditLog.createdAt))
    .limit(limit);
}
