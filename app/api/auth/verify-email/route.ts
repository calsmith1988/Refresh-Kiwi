import { NextResponse } from "next/server";

import { toAuthUserResponse, verifyEmail } from "@/lib/auth/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string };

    if (!body.token) {
      return NextResponse.json(
        { error: "Verification token is required" },
        { status: 400 },
      );
    }

    const user = await verifyEmail(body.token);

    return NextResponse.json({ user: toAuthUserResponse(user) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to verify email";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
