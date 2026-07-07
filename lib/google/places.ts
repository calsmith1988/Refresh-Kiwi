/**
 * Minimal Google Places API (New) client for the Google Business Profile
 * import flow. Raw fetch, no SDK — same convention as lib/storage/r2.ts.
 *
 * The feature is inert until GOOGLE_PLACES_API_KEY is configured. The key is
 * server-side only; the browser talks to our /api/places/* proxy routes.
 *
 * Billing note: autocomplete is the cheap SKU and safe to call per keystroke
 * (debounced client-side). Place Details with our field mask and photo media
 * requests are the expensive SKUs — only call them after the user explicitly
 * selects a listing.
 */

const PLACES_BASE_URL = "https://places.googleapis.com/v1";

const DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "nationalPhoneNumber",
  "internationalPhoneNumber",
  "websiteUri",
  "regularOpeningHours",
  "rating",
  "userRatingCount",
  "editorialSummary",
  "reviews",
  "photos",
  "googleMapsUri",
  "primaryTypeDisplayName",
  "types",
].join(",");

const GENERIC_CATEGORIES = new Set([
  "establishment",
  "manufacturer",
  "point of interest",
  "store",
]);

const CATEGORY_HINTS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\b(carpentry|carpenter|joinery|joiner)\b/i, label: "Carpentry" },
  { pattern: /\b(plumb|boiler|heating)\b/i, label: "Plumbing and heating" },
  { pattern: /\b(electric|electrical|electrician)\b/i, label: "Electrical" },
  { pattern: /\b(roof|roofer|roofing)\b/i, label: "Roofing" },
  { pattern: /\b(builder|building|construction|renovation)\b/i, label: "Building and renovation" },
  { pattern: /\b(landscap|garden|gardener)\b/i, label: "Landscaping" },
  { pattern: /\b(clean|cleaner|cleaning)\b/i, label: "Cleaning" },
  { pattern: /\b(salon|hair|beauty|barber)\b/i, label: "Hair and beauty" },
  { pattern: /\b(cafe|coffee|restaurant|bakery|bar)\b/i, label: "Hospitality" },
  { pattern: /\b(garage|mechanic|mot|auto|car repair)\b/i, label: "Garage and vehicle services" },
  { pattern: /\b(accountant|accounting|bookkeeping)\b/i, label: "Accountancy" },
];

function normalizeCategory(params: {
  googleCategory?: string;
  name?: string;
  description?: string;
  types?: string[];
}): string | null {
  const haystack = [
    params.name,
    params.description,
    params.googleCategory,
    ...(params.types ?? []),
  ]
    .filter(Boolean)
    .join(" ");
  const hinted = CATEGORY_HINTS.find((hint) => hint.pattern.test(haystack));

  if (hinted) {
    return hinted.label;
  }

  const category = params.googleCategory?.trim();

  if (!category || GENERIC_CATEGORIES.has(category.toLowerCase())) {
    return null;
  }

  return category;
}

const AUTOCOMPLETE_FIELD_MASK = [
  "suggestions.placePrediction.placeId",
  "suggestions.placePrediction.structuredFormat.mainText.text",
  "suggestions.placePrediction.structuredFormat.secondaryText.text",
  "suggestions.placePrediction.text.text",
].join(",");

export function isPlacesEnabled(): boolean {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY?.trim());
}

function getPlacesApiKey(): string {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("GOOGLE_PLACES_API_KEY is not configured");
  }

  return apiKey;
}

export type PlaceSuggestion = {
  placeId: string;
  name: string;
  address: string;
};

export type PlacePhoto = {
  /** Google photo resource name: places/{placeId}/photos/{photoId} */
  name: string;
  widthPx: number;
  heightPx: number;
};

export type PlaceReview = {
  rating: number;
  text: string;
  authorName: string;
};

export type PlaceDetails = {
  placeId: string;
  name: string;
  address: string;
  phone: string | null;
  websiteUri: string | null;
  googleMapsUri: string | null;
  category: string | null;
  openingHours: string[];
  rating: number | null;
  reviewCount: number | null;
  description: string | null;
  reviews: PlaceReview[];
  photos: PlacePhoto[];
};

type AutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
      text?: { text?: string };
    };
  }>;
};

export async function autocompleteBusinesses(
  input: string,
): Promise<PlaceSuggestion[]> {
  const response = await fetch(`${PLACES_BASE_URL}/places:autocomplete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": getPlacesApiKey(),
      "X-Goog-FieldMask": AUTOCOMPLETE_FIELD_MASK,
    },
    body: JSON.stringify({
      input,
      // Small businesses in our target markets only.
      includedRegionCodes: ["gb", "us"],
      includePureServiceAreaBusinesses: true,
    }),
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      `Places autocomplete failed with status ${response.status}${
        message ? `: ${message}` : ""
      }`,
    );
  }

  const data = (await response.json()) as AutocompleteResponse;

  return (data.suggestions ?? [])
    .map((suggestion) => suggestion.placePrediction)
    .filter((prediction): prediction is NonNullable<typeof prediction> =>
      Boolean(prediction?.placeId),
    )
    .map((prediction) => ({
      placeId: prediction.placeId!,
      name:
        prediction.structuredFormat?.mainText?.text ??
        prediction.text?.text ??
        "",
      address: prediction.structuredFormat?.secondaryText?.text ?? "",
    }))
    .filter((suggestion) => suggestion.name.length > 0);
}

type PlaceDetailsResponse = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  primaryTypeDisplayName?: { text?: string };
  types?: string[];
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  rating?: number;
  userRatingCount?: number;
  editorialSummary?: { text?: string };
  reviews?: Array<{
    rating?: number;
    text?: { text?: string };
    authorAttribution?: { displayName?: string };
  }>;
  photos?: Array<{ name?: string; widthPx?: number; heightPx?: number }>;
};

export async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const response = await fetch(
    `${PLACES_BASE_URL}/places/${encodeURIComponent(placeId)}`,
    {
      headers: {
        "X-Goog-Api-Key": getPlacesApiKey(),
        "X-Goog-FieldMask": DETAILS_FIELD_MASK,
      },
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (response.status === 404) {
    throw new Error("We couldn't find that business listing on Google.");
  }

  if (!response.ok) {
    throw new Error(`Place details failed with status ${response.status}`);
  }

  const data = (await response.json()) as PlaceDetailsResponse;

  const name = data.displayName?.text ?? "";
  const description = data.editorialSummary?.text ?? null;

  return {
    placeId: data.id ?? placeId,
    name,
    address: data.formattedAddress ?? "",
    phone: data.nationalPhoneNumber ?? data.internationalPhoneNumber ?? null,
    websiteUri: data.websiteUri ?? null,
    googleMapsUri: data.googleMapsUri ?? null,
    category: normalizeCategory({
      googleCategory: data.primaryTypeDisplayName?.text,
      name,
      description: description ?? undefined,
      types: data.types,
    }),
    openingHours: data.regularOpeningHours?.weekdayDescriptions ?? [],
    rating: data.rating ?? null,
    reviewCount: data.userRatingCount ?? null,
    description,
    reviews: (data.reviews ?? [])
      .filter((review) => Boolean(review.text?.text))
      .map((review) => ({
        rating: review.rating ?? 0,
        text: review.text!.text!,
        authorName: review.authorAttribution?.displayName ?? "",
      })),
    photos: (data.photos ?? [])
      .filter((photo): photo is { name: string; widthPx?: number; heightPx?: number } =>
        Boolean(photo.name),
      )
      .map((photo) => ({
        name: photo.name,
        widthPx: photo.widthPx ?? 0,
        heightPx: photo.heightPx ?? 0,
      })),
  };
}

/**
 * Resolve a short-lived googleusercontent URL for displaying a photo in the
 * confirm card. The billing event happens here, so thumbnails should be
 * requested once per photo, not per render.
 */
export async function getPhotoUri(
  photoName: string,
  maxWidthPx: number,
): Promise<string | null> {
  const response = await fetch(
    `${PLACES_BASE_URL}/${photoName}/media?maxWidthPx=${maxWidthPx}&skipHttpRedirect=true`,
    {
      headers: { "X-Goog-Api-Key": getPlacesApiKey() },
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { photoUri?: string };

  return data.photoUri ?? null;
}

export type DownloadedPhoto = {
  buffer: Buffer;
  contentType: string;
};

/** Download photo bytes server-side for seeding as a starter asset. */
export async function downloadPhoto(
  photoName: string,
  maxWidthPx: number,
): Promise<DownloadedPhoto | null> {
  const response = await fetch(
    `${PLACES_BASE_URL}/${photoName}/media?maxWidthPx=${maxWidthPx}`,
    {
      headers: { "X-Goog-Api-Key": getPlacesApiKey() },
      signal: AbortSignal.timeout(20_000),
    },
  );

  if (!response.ok) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  const buffer = Buffer.from(await response.arrayBuffer());

  if (buffer.byteLength === 0) {
    return null;
  }

  return { buffer, contentType };
}
