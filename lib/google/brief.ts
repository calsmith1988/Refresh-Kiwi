import type { PlaceDetails } from "@/lib/google/places";

function formatLines(title: string, values: Array<string | null | undefined>): string {
  const lines = values.map((value) => value?.trim()).filter(Boolean);

  if (lines.length === 0) {
    return "";
  }

  return `## ${title}\n${lines.map((line) => `- ${line}`).join("\n")}`;
}

function formatOpeningHours(hours: string[]): string {
  if (hours.length === 0) {
    return "";
  }

  return `## Opening hours\n${hours.map((line) => `- ${line}`).join("\n")}`;
}

function formatReviews(place: PlaceDetails): string {
  const summary =
    place.rating && place.reviewCount
      ? `Google rating: ${place.rating.toFixed(1)} from ${place.reviewCount} reviews.`
      : "";
  const excerpts = place.reviews
    .filter((review) => review.text.trim().length > 0)
    .slice(0, 3)
    .map((review) => {
      const author = review.authorName.trim() || "Google reviewer";
      const rating = review.rating ? `${review.rating}/5` : "Google review";

      return `"${review.text.trim()}" - ${author} (${rating})`;
    });

  return formatLines("Social proof from Google", [summary, ...excerpts]);
}

export function buildGoogleBusinessBrief(place: PlaceDetails): string {
  const sections = [
    `Business name: ${place.name}`,
    formatLines("Source", [
      "Imported from a Google Business Profile listing selected by the user.",
      `Google Place ID: ${place.placeId}`,
      place.googleMapsUri ? `Google Maps listing: ${place.googleMapsUri}` : null,
      place.websiteUri ? `Existing website listed on Google: ${place.websiteUri}` : null,
    ]),
    formatLines("Business facts to use verbatim", [
      place.category ? `Category/trade: ${place.category}` : null,
      place.address ? `Address/service area: ${place.address}` : null,
      place.phone ? `Phone number: ${place.phone}` : null,
      place.description ? `Google summary: ${place.description}` : null,
    ]),
    formatOpeningHours(place.openingHours),
    formatReviews(place),
    `## Website generation instructions
- Build a polished small-business website from this Google Business Profile information and the provided photo assets.
- The provided starter image assets are photos selected from this business's Google listing. Use them prominently as real business imagery in the hero, gallery, service, proof, or about sections where they fit. Do not ignore them in favour of generated/abstract imagery.
- Include the business name, address/service area, phone number, opening hours, services/category, and Google social proof where available.
- Treat the Google reviews above as testimonial source material. Keep excerpts short and clearly framed as customer reviews.
- Do not invent contact details, awards, accreditations, prices, or legal/compliance claims.
- If the listing includes an existing website, do not crawl it. This import flow uses the Google listing and selected photos as the source of truth.`,
  ];

  return sections.filter(Boolean).join("\n\n");
}
