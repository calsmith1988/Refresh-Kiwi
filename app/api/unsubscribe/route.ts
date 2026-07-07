import { NextResponse } from "next/server";

import { unsubscribeMarketingEmails } from "@/lib/email/unsubscribe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { token?: string };

  let unsubscribed = false;

  try {
    unsubscribed = Boolean(body.token) &&
      (await unsubscribeMarketingEmails(body.token!));
  } catch (error) {
    console.error("[unsubscribe] failed", error);
  }

  if (!unsubscribed) {
    return NextResponse.json(
      { error: "Unsubscribe link is invalid" },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
