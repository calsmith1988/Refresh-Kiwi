import type { LocalizedImage } from "@/lib/assets/localize";

export const IMAGE_PLACEMENT_LABELS: Record<string, string> = {
  auto: "Let Refresh Kiwi choose the best place for these assets.",
  hero: "Place these assets in the hero section.",
  gallery: "Place these assets in a gallery or portfolio section.",
  services: "Place these assets in the services section.",
  about: "Place these assets in the about section.",
  header_logo: "Use the first provided asset as the header logo or brand mark.",
};

function placementInstruction(placement: string): string {
  return IMAGE_PLACEMENT_LABELS[placement] ?? IMAGE_PLACEMENT_LABELS.auto;
}

export function buildImagePlacementPrompt(params: {
  assets: LocalizedImage[];
  placement: string;
  note: string | null;
}) {
  const listedAssets = params.assets
    .map(
      (asset, index) =>
        `${index + 1}. ${asset.role ?? "image"}: ${asset.url} (${asset.contentType})`,
    )
    .join("\n");

  return [
    "Add these provided website assets to the existing site design.",
    "",
    listedAssets,
    "",
    placementInstruction(params.placement),
    "Keep the result consistent with the current design system, responsive on mobile, and avoid removing existing important content.",
    params.note ? `Extra user instruction: ${params.note}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}
