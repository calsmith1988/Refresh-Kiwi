import { NextResponse } from "next/server";

import { RateLimitError, rateLimitHeaders } from "@/lib/auth/rateLimit";

export function rateLimitResponse(error: unknown): NextResponse | null {
  if (!(error instanceof RateLimitError)) {
    return null;
  }

  return NextResponse.json(
    { error: error.message },
    {
      status: 429,
      headers: rateLimitHeaders(error),
    },
  );
}
