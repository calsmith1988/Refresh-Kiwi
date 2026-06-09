import { NextResponse } from "next/server";

import { createProCheckoutSession } from "@/lib/stripe/service";

export const runtime = "nodejs";

export async function POST() {
  try {
    const url = await createProCheckoutSession();

    return NextResponse.json({ url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start checkout";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
