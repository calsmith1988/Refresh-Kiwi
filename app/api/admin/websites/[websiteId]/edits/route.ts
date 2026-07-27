import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { recordAdminAction } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/admin/guard";
import { getAdminWebsite } from "@/lib/admin/service";
import { getDb, schema } from "@/lib/db";
import {
  isNewPageEditRequest,
  NEW_PAGE_EDIT_MESSAGE,
} from "@/lib/edits/pageRequest";
import {
  MAX_EDIT_PROMPT_LENGTH,
  MIN_EDIT_PROMPT_LENGTH,
} from "@/lib/edits/quota";
import { enqueueBackgroundTask } from "@/lib/worker/queue";

export const runtime = "nodejs";

const { editRequests } = schema;

interface RouteContext {
  params: Promise<{ websiteId: string }>;
}

/**
 * Applies an edit on a customer's behalf (support requests from non-technical
 * owners). Deliberately different from the customer route: no free-edit
 * consumption, no daily cap, and the edit request is attributed to the admin
 * user so the customer's quotas are untouched. Concurrency and archived
 * checks still apply — those protect the site, not the quota.
 */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdmin();

  if ("response" in auth) {
    return auth.response;
  }

  const { websiteId } = await context.params;
  const website = await getAdminWebsite(websiteId);

  if (!website) {
    return NextResponse.json({ error: "Website not found" }, { status: 404 });
  }

  if (website.status === "archived") {
    return NextResponse.json(
      { error: "Archived websites cannot be edited." },
      { status: 400 },
    );
  }

  const body = (await request.json()) as { prompt?: string };
  const prompt = body.prompt?.trim() ?? "";

  if (prompt.length < MIN_EDIT_PROMPT_LENGTH) {
    return NextResponse.json(
      { error: "Describe the change to apply" },
      { status: 400 },
    );
  }

  if (prompt.length > MAX_EDIT_PROMPT_LENGTH) {
    return NextResponse.json(
      { error: "Keep the change request under 4,000 characters." },
      { status: 400 },
    );
  }

  if (isNewPageEditRequest(prompt)) {
    return NextResponse.json({ error: NEW_PAGE_EDIT_MESSAGE }, { status: 400 });
  }

  const db = getDb();

  // One change at a time per website — same guard as the customer route.
  const [activeEdit] = await db
    .select({ id: editRequests.id })
    .from(editRequests)
    .where(
      and(
        eq(editRequests.websiteId, website.id),
        inArray(editRequests.status, ["queued", "running"]),
      ),
    )
    .limit(1);

  if (activeEdit) {
    return NextResponse.json(
      { error: "An edit is already queued or running for this website." },
      { status: 409 },
    );
  }

  const [editRequest] = await db
    .insert(editRequests)
    .values({
      websiteId: website.id,
      userId: auth.user.id,
      prompt,
      status: "queued",
    })
    .returning();

  await enqueueBackgroundTask({
    type: "edit-request",
    payload: { editRequestId: editRequest.id },
  });

  await recordAdminAction({
    adminUserId: auth.user.id,
    adminEmail: auth.user.email,
    action: "apply_edit_on_behalf",
    targetType: "edit_request",
    targetId: editRequest.id,
    details: {
      websiteId: website.id,
      slug: website.slug,
      prompt: prompt.slice(0, 500),
    },
  });

  return NextResponse.json({ ok: true, editRequest, queued: true });
}
