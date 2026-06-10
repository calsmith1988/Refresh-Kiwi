import { NextResponse } from "next/server";
import { after } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { getOwnedWebsite, toWebsiteResponse, userHasProPlan } from "@/lib/websites/service";
import { eq } from "drizzle-orm";

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
  const website = await getOwnedWebsite({ websiteId, userId: user.id });

  if (!website) {
    return NextResponse.json({ error: "Website not found" }, { status: 404 });
  }

  const body = (await request.json()) as { prompt?: string };
  const prompt = body.prompt?.trim() ?? "";

  if (prompt.length < 5) {
    return NextResponse.json(
      { error: "Tell us what you want changed" },
      { status: 400 },
    );
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
      { error: "This free preview has ended. Go Pro (£10/month) to bring it back and keep making changes." },
      { status: 402 },
    );
  }

  const freeEditsRemaining = Math.max(
    0,
    website.freeEditsLimit - website.freeEditsUsed,
  );

  if (!hasPro && freeEditsRemaining <= 0) {
    return NextResponse.json(
      { error: "You've used your 3 free changes. Go Pro (£10/month) for unlimited changes." },
      { status: 402 },
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

  after(async () => {
    try {
      const { processEditRequest } = await import("@/lib/edits/processor");
      await processEditRequest(editRequest.id);
    } catch (error) {
      console.error(
        `[refresh-kiwi] failed to start edit request ${editRequest.id}`,
        error,
      );
    }
  });

  return NextResponse.json({
    editRequest,
    website: toWebsiteResponse(updatedWebsite),
    queued: true,
    message:
      "Edit request queued. The editor agent is applying this change now.",
  });
}
