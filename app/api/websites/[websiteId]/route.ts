import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import {
  archiveOwnedWebsite,
  renameOwnedWebsite,
  toWebsiteResponse,
} from "@/lib/websites/service";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ websiteId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in to rename this website" },
      { status: 401 },
    );
  }

  try {
    const { websiteId } = await context.params;
    const body = (await request.json()) as { name?: string };

    if (!body.name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const website = await renameOwnedWebsite({
      websiteId,
      userId: user.id,
      name: body.name,
    });

    return NextResponse.json({ website: toWebsiteResponse(website) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to rename website";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in to delete this website" },
      { status: 401 },
    );
  }

  try {
    const { websiteId } = await context.params;
    const body = (await request.json()) as { confirmation?: string };

    if (!body.confirmation) {
      return NextResponse.json(
        { error: "confirmation is required" },
        { status: 400 },
      );
    }

    const website = await archiveOwnedWebsite({
      websiteId,
      userId: user.id,
      confirmation: body.confirmation,
    });

    return NextResponse.json({ website: toWebsiteResponse(website) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete website";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
