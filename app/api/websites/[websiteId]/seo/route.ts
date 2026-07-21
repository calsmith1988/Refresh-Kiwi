import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import {
  normalizeAnalyticsId,
  normalizeSearchConsoleToken,
} from "@/lib/seo/customDomain";
import {
  toWebsiteResponse,
  updateOwnedWebsiteSeoSettings,
} from "@/lib/websites/service";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ websiteId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in to update SEO settings" },
      { status: 401 },
    );
  }

  try {
    const { websiteId } = await context.params;
    const body = (await request.json()) as {
      searchConsoleToken?: string;
      analyticsId?: string;
    };

    const website = await updateOwnedWebsiteSeoSettings({
      websiteId,
      userId: user.id,
      searchConsoleToken: normalizeSearchConsoleToken(
        body.searchConsoleToken ?? "",
      ),
      analyticsId: normalizeAnalyticsId(body.analyticsId ?? ""),
    });

    return NextResponse.json({ website: toWebsiteResponse(website) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update SEO settings";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
