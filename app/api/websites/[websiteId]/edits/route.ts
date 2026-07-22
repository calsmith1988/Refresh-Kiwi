import { NextResponse } from "next/server";

import { assertRateLimit, rateLimitKey } from "@/lib/auth/rateLimit";
import { rateLimitResponse } from "@/lib/auth/rateLimitResponse";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import {
  isNewPageEditRequest,
  NEW_PAGE_EDIT_MESSAGE,
} from "@/lib/edits/pageRequest";
import {
  checkDailyEditQuota,
  MAX_EDIT_PROMPT_LENGTH,
  MIN_EDIT_PROMPT_LENGTH,
} from "@/lib/edits/quota";
import { enqueueBackgroundTask } from "@/lib/worker/queue";
import { getOwnedWebsite, toWebsiteResponse, userHasProPlan } from "@/lib/websites/service";
import { and, eq, inArray } from "drizzle-orm";

export const runtime = "nodejs";

const { editRequests, websites } = schema;

interface RouteContext {
  params: Promise<{ websiteId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to request edits" }, { status: 401 });
  }

  const { websiteId } = await context.params;

  try {
    await assertRateLimit(`${rateLimitKey(request, "edit-request")}:${user.id}`, {
      limit: 10,
      windowMs: 15 * 60 * 1000,
      message: "Too many edit requests. Please wait a moment and try again.",
    });
  } catch (error) {
    const limited = rateLimitResponse(error);
    if (limited) {
      return limited;
    }

    throw error;
  }

  const website = await getOwnedWebsite({ websiteId, userId: user.id });

  if (!website) {
    return NextResponse.json({ error: "Website not found" }, { status: 404 });
  }

  const body = (await request.json()) as { prompt?: string };
  const prompt = body.prompt?.trim() ?? "";

  if (prompt.length < MIN_EDIT_PROMPT_LENGTH) {
    return NextResponse.json(
      { error: "Tell us what you want changed" },
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

  const hasPro = await userHasProPlan(user.id);
  const isExpiredPreview =
    website.status === "expired" ||
    (!hasPro &&
      website.status !== "live" &&
      website.expiresAt.getTime() <= Date.now());

  if (website.status === "archived") {
    return NextResponse.json(
      { error: "Archived websites cannot be edited." },
      { status: 400 },
    );
  }

  if (isExpiredPreview) {
    return NextResponse.json(
      { error: "This free preview has ended. Go Pro to bring it back and keep making changes." },
      { status: 402 },
    );
  }

  // One change at a time per website — two agents editing the same site
  // concurrently would race and overwrite each other's work.
  const [activeEdit] = await getDb()
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
      { error: "We're still making your last change — it'll be done in a minute or two, then you can add the next one." },
      { status: 409 },
    );
  }

  const freeEditsRemaining = Math.max(
    0,
    website.freeEditsLimit - website.freeEditsUsed,
  );

  if (!hasPro && freeEditsRemaining <= 0) {
    return NextResponse.json(
      { error: "You've used your 3 free changes. Go Pro for unlimited changes." },
      { status: 402 },
    );
  }

  const dailyQuota = await checkDailyEditQuota(user.id);
  if (!dailyQuota.ok) {
    return NextResponse.json(
      { error: dailyQuota.message },
      { status: dailyQuota.status },
    );
  }

  const db = getDb();

  const [editRequest] = await db
    .insert(editRequests)
    .values({
      websiteId: website.id,
      userId: user.id,
      prompt,
      status: "queued",
    })
    .returning();

  const [updatedWebsite] = await db
    .update(websites)
    .set({
      freeEditsUsed: hasPro ? website.freeEditsUsed : website.freeEditsUsed + 1,
      updatedAt: new Date(),
    })
    .where(eq(websites.id, website.id))
    .returning();

  await enqueueBackgroundTask({
    type: "edit-request",
    payload: { editRequestId: editRequest.id },
  });

  return NextResponse.json({
    editRequest,
    website: toWebsiteResponse(updatedWebsite),
    queued: true,
    message:
      "Edit request queued. The editor agent is applying this change now.",
  });
}
