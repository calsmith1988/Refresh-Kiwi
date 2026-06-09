import { NextResponse } from "next/server";

import { createBillingPortalSession } from "@/lib/stripe/service";

export const runtime = "nodejs";

export async function POST() {
  try {
    const url = await createBillingPortalSession();

    return NextResponse.json({ url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to open billing portal";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
