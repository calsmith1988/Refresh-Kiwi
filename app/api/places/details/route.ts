import { NextResponse } from "next/server";

import { assertRateLimit, rateLimitKey } from "@/lib/auth/rateLimit";
import { rateLimitResponse } from "@/lib/auth/rateLimitResponse";
import { getPhotoUri, getPlaceDetails, isPlacesEnabled } from "@/lib/google/places";

export const runtime = "nodejs";

const MAX_PREVIEW_PHOTOS = 8;

type PlacesDetailsBody = {
  placeId?: string;
};

export async function POST(request: Request) {
  if (!isPlacesEnabled()) {
    return NextResponse.json({ error: "Google business search is not configured" }, { status: 404 });
  }

  let body: PlacesDetailsBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const placeId = String(body.placeId ?? "").trim();

  if (!placeId) {
    return NextResponse.json({ error: "Choose a business listing first." }, { status: 400 });
  }

  try {
    await assertRateLimit(rateLimitKey(request, "places-details"), {
      limit: 10,
      windowMs: 10 * 60 * 1000,
      message: "Too many listing lookups. Please wait a moment and try again.",
    });

    const place = await getPlaceDetails(placeId);
    const photos = await Promise.all(
      place.photos.slice(0, MAX_PREVIEW_PHOTOS).map(async (photo) => ({
        ...photo,
        uri: await getPhotoUri(photo.name, 720),
      })),
    );

    return NextResponse.json({
      place: {
        ...place,
        photos: photos.filter((photo) => photo.uri),
      },
    });
  } catch (error) {
    const limited = rateLimitResponse(error);
    if (limited) {
      return limited;
    }

    const message =
      error instanceof Error ? error.message : "Failed to load that Google listing";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
