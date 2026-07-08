import { NextResponse } from "next/server";

import { resolveCountryCodeFromRequest } from "@/lib/pricing/geo";
import { buildPricingResponse } from "@/lib/pricing/regions";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const countryCode = resolveCountryCodeFromRequest(request);
  const currency = url.searchParams.get("currency");

  return NextResponse.json(buildPricingResponse({ countryCode, currency }));
}
