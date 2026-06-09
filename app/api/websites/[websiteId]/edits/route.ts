import { NextResponse } from "next/server";

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
  const freeEditsRemaining = Math.max(
    0,
    website.freeEditsLimit - website.freeEditsUsed,
  );

  if (!hasPro && freeEditsRemaining <= 0) {
    return NextResponse.json(
      { error: "You have used your 3 free edits. Upgrade to Pro for unlimited edits." },
      { status: 402 },
    );
  }

  const db = getDb();

  await db.insert(editRequests).values({
    websiteId: website.id,
    userId: user.id,
    prompt,
    status: "queued",
  });

  const [updatedWebsite] = await db
    .update(websites)
    .set({
      freeEditsUsed: hasPro ? website.freeEditsUsed : website.freeEditsUsed + 1,
      updatedAt: new Date(),
    })
    .where(eq(websites.id, website.id))
    .returning();

  return NextResponse.json({
    website: toWebsiteResponse(updatedWebsite),
    queued: true,
    message:
      "Edit request queued. The editor agent will apply this change in the next Phase 3 build step.",
  });
}
