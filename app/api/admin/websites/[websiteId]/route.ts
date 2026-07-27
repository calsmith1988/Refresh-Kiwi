import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { recordAdminAction } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/admin/guard";
import { getAdminWebsite } from "@/lib/admin/service";
import { getDb, schema } from "@/lib/db";

export const runtime = "nodejs";

const { jobs, websites } = schema;

interface RouteContext {
  params: Promise<{ websiteId: string }>;
}

type AdminWebsitePatchBody =
  | { action: "rename"; name?: string }
  | { action: "extend-expiry"; days?: number }
  | { action: "reset-edits" };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdmin();

  if ("response" in auth) {
    return auth.response;
  }

  const { websiteId } = await context.params;
  const website = await getAdminWebsite(websiteId);

  if (!website) {
    return NextResponse.json({ error: "Website not found" }, { status: 404 });
  }

  let body: AdminWebsitePatchBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const db = getDb();

  switch (body.action) {
    case "rename": {
      const name = body.name?.trim() ?? "";

      if (name.length < 2 || name.length > 80) {
        return NextResponse.json(
          { error: "Website name must be 2-80 characters" },
          { status: 400 },
        );
      }

      const [updated] = await db.transaction(async (tx) => {
        const result = await tx
          .update(websites)
          .set({ brandName: name, updatedAt: new Date() })
          .where(eq(websites.id, website.id))
          .returning();

        await tx
          .update(jobs)
          .set({ brandName: name, updatedAt: new Date() })
          .where(eq(jobs.id, website.jobId));

        return result;
      });

      await recordAdminAction({
        adminUserId: auth.user.id,
        adminEmail: auth.user.email,
        action: "rename_website",
        targetType: "website",
        targetId: website.id,
        details: { slug: website.slug, from: website.brandName, to: name },
      });

      return NextResponse.json({ ok: true, website: updated });
    }

    case "extend-expiry": {
      const days = Math.min(Math.max(Number(body.days) || 7, 1), 90);
      const base = Math.max(website.expiresAt.getTime(), Date.now());
      const expiresAt = new Date(base + days * 24 * 60 * 60 * 1000);

      const [updated] = await db
        .update(websites)
        .set({
          expiresAt,
          // A previously expired preview becomes viewable again.
          status: website.status === "expired" ? "preview" : website.status,
          updatedAt: new Date(),
        })
        .where(eq(websites.id, website.id))
        .returning();

      await recordAdminAction({
        adminUserId: auth.user.id,
        adminEmail: auth.user.email,
        action: "extend_website_expiry",
        targetType: "website",
        targetId: website.id,
        details: { slug: website.slug, days, newExpiresAt: expiresAt.toISOString() },
      });

      return NextResponse.json({ ok: true, website: updated });
    }

    case "reset-edits": {
      const [updated] = await db
        .update(websites)
        .set({ freeEditsUsed: 0, updatedAt: new Date() })
        .where(eq(websites.id, website.id))
        .returning();

      await recordAdminAction({
        adminUserId: auth.user.id,
        adminEmail: auth.user.email,
        action: "reset_free_edits",
        targetType: "website",
        targetId: website.id,
        details: { slug: website.slug, previousUsed: website.freeEditsUsed },
      });

      return NextResponse.json({ ok: true, website: updated });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
