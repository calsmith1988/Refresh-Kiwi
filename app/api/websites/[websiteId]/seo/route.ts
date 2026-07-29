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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeContactEmail(input: string): string | null {
  const email = input.trim().toLowerCase();

  if (!email) {
    return null;
  }

  if (email.length > 200 || !EMAIL_PATTERN.test(email)) {
    throw new Error("Enter a valid email address for enquiries");
  }

  return email;
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
      contactEmail?: string;
    };

    const website = await updateOwnedWebsiteSeoSettings({
      websiteId,
      userId: user.id,
      searchConsoleToken: normalizeSearchConsoleToken(
        body.searchConsoleToken ?? "",
      ),
      analyticsId: normalizeAnalyticsId(body.analyticsId ?? ""),
      contactEmail: normalizeContactEmail(body.contactEmail ?? ""),
    });

    return NextResponse.json({ website: toWebsiteResponse(website) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update SEO settings";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
