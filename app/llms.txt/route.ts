import { NextResponse } from "next/server";

import { llmsTxtBody } from "@/lib/seo/llms";

export function GET() {
  return new NextResponse(llmsTxtBody, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
