import { NextResponse } from "next/server";

import { unsubscribeMarketingEmails } from "@/lib/email/unsubscribe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { token?: string };

  if (!body.token || !(await unsubscribeMarketingEmails(body.token))) {
    return NextResponse.json(
      { error: "Unsubscribe link is invalid" },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
