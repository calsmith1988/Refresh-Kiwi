import { NextResponse } from "next/server";

import { readWebsiteImageManifest } from "@/lib/assets/localize";
import { getCurrentUser } from "@/lib/auth/session";
import { getOwnedWebsite } from "@/lib/websites/service";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ websiteId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to view images" }, { status: 401 });
  }

  const { websiteId } = await context.params;
  const website = await getOwnedWebsite({ websiteId, userId: user.id });

  if (!website) {
    return NextResponse.json({ error: "Website not found" }, { status: 404 });
  }

  const manifest = await readWebsiteImageManifest(website.slug);

  return NextResponse.json({
    localized: manifest !== null,
    images: manifest?.images ?? [],
  });
}
