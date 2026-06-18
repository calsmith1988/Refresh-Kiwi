import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { userHasProPlan } from "@/lib/websites/service";

export const runtime = "nodejs";

const { editRequests, websites } = schema;

interface RouteContext {
  params: Promise<{ websiteId: string; editRequestId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to view edits" }, { status: 401 });
  }

  const { websiteId, editRequestId } = await context.params;
  const [editRequest] = await getDb()
    .select({
      id: editRequests.id,
      websiteId: editRequests.websiteId,
      prompt: editRequests.prompt,
      status: editRequests.status,
      errorMessage: editRequests.errorMessage,
      createdAt: editRequests.createdAt,
      updatedAt: editRequests.updatedAt,
    })
    .from(editRequests)
    .innerJoin(websites, eq(editRequests.websiteId, websites.id))
    .where(
      and(
        eq(editRequests.id, editRequestId),
        eq(editRequests.websiteId, websiteId),
        eq(websites.userId, user.id),
      ),
    )
    .limit(1);

  if (!editRequest) {
    return NextResponse.json({ error: "Edit request not found" }, { status: 404 });
  }

  return NextResponse.json({
    editRequest: {
      ...editRequest,
      createdAt: editRequest.createdAt.toISOString(),
      updatedAt: editRequest.updatedAt.toISOString(),
    },
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in to cancel edits" },
      { status: 401 },
    );
  }

  const { websiteId, editRequestId } = await context.params;
  const db = getDb();
  const [editRequest] = await db
    .select({
      id: editRequests.id,
      status: editRequests.status,
      website: websites,
    })
    .from(editRequests)
    .innerJoin(websites, eq(editRequests.websiteId, websites.id))
    .where(
      and(
        eq(editRequests.id, editRequestId),
        eq(editRequests.websiteId, websiteId),
        eq(websites.userId, user.id),
      ),
    )
    .limit(1);

  if (!editRequest) {
    return NextResponse.json({ error: "Edit request not found" }, { status: 404 });
  }

  if (editRequest.status !== "queued" && editRequest.status !== "running") {
    return NextResponse.json(
      { error: "This edit can no longer be cancelled" },
      { status: 409 },
    );
  }

  const [updated] = await db
    .update(editRequests)
    .set({
      status: "failed",
      errorMessage: "Edit cancelled.",
      updatedAt: new Date(),
    })
    .where(eq(editRequests.id, editRequest.id))
    .returning();

  const hasPro = await userHasProPlan(user.id);
  if (!hasPro && editRequest.website.freeEditsUsed > 0) {
    await db
      .update(websites)
      .set({
        freeEditsUsed: Math.max(0, editRequest.website.freeEditsUsed - 1),
        updatedAt: new Date(),
      })
      .where(eq(websites.id, editRequest.website.id));
  }

  return NextResponse.json({
    editRequest: {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}
