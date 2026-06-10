import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";

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
