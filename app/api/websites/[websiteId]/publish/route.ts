import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { enqueueBackgroundTask } from "@/lib/worker/queue";
import {
  publishOwnedWebsite,
  toWebsiteResponse,
  userHasProPlan,
} from "@/lib/websites/service";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ websiteId: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to publish this website" }, { status: 401 });
  }

  const hasPro = await userHasProPlan(user.id);

  if (!hasPro) {
    return NextResponse.json(
      { error: "Upgrade to Pro to keep this website live." },
      { status: 402 },
    );
  }

  try {
    const { websiteId } = await context.params;
    const website = await publishOwnedWebsite({ websiteId, userId: user.id });

    await enqueueBackgroundTask({
      type: "localize-images",
      payload: { slug: website.slug },
    });

    return NextResponse.json({ website: toWebsiteResponse(website) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to publish website";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
