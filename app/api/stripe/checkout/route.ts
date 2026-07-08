import { NextResponse } from "next/server";

import { createProCheckoutSession } from "@/lib/stripe/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    let body: { metaEventId?: string; currency?: string } = {};

    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const url = await createProCheckoutSession({
      request,
      metaEventId: body.metaEventId,
      currency: body.currency,
    });

    return NextResponse.json({ url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start checkout";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
