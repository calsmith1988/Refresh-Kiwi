import { NextResponse } from "next/server";

import { signUp, toAuthUserResponse } from "@/lib/auth/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      name?: string;
    };

    const user = await signUp({
      email: body.email ?? "",
      password: body.password ?? "",
      name: body.name ?? null,
    });

    return NextResponse.json({ user: toAuthUserResponse(user) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signup failed";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
