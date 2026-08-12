import { NextResponse } from "next/server";

import { assertRateLimit, rateLimitKey } from "@/lib/auth/rateLimit";
import { rateLimitResponse } from "@/lib/auth/rateLimitResponse";
import {
  autocompleteBusinesses,
  isPlacesEnabled,
} from "@/lib/google/places";

export const runtime = "nodejs";

type PlacesSearchBody = {
  query?: string;
};

export async function POST(request: Request) {
  if (!isPlacesEnabled()) {
    return NextResponse.json({ error: "Google business search is not configured" }, { status: 404 });
  }

  let body: PlacesSearchBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const query = String(body.query ?? "").trim();

  if (query.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  if (query.length > 80) {
    return NextResponse.json(
      { error: "Keep the business search under 80 characters." },
      { status: 400 },
    );
  }

  try {
    // Autocomplete fires one request per typing pause, so one visitor
    // revising a search (adding their town, fixing typos) can produce dozens
    // of requests in a couple of minutes — the old 30-per-10-minutes cap
    // locked out legitimate users mid-search. 30/minute keeps real typing
    // flowing while still capping runaway clients and Places API spend.
    await assertRateLimit(rateLimitKey(request, "places-search"), {
      limit: 30,
      windowMs: 60 * 1000,
      message: "Too many business searches. Please wait a moment and try again.",
    });

    const suggestions = await autocompleteBusinesses(query);

    return NextResponse.json({ suggestions });
  } catch (error) {
    const limited = rateLimitResponse(error);
    if (limited) {
      return limited;
    }

    const message =
      error instanceof Error ? error.message : "Failed to search Google businesses";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
