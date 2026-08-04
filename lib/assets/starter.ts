import { generateWebsiteImage } from "@/lib/assets/generate";
import {
  resolveStarterImagePlan,
  type StarterImageDirection,
} from "@/lib/assets/image-prompts";
import { optimizeImage } from "@/lib/assets/optimize";
import type { SeedAssetInput } from "@/lib/assets/seed";

const STARTER_VISUAL_DIRECTIONS: readonly StarterImageDirection[] = [
  "hero",
  "detail",
  "atmosphere",
];

export async function generateStarterSeedAssets(
  prompt: string,
): Promise<SeedAssetInput[]> {
  const plan = await resolveStarterImagePlan(prompt);
  const generated = await Promise.allSettled(
    STARTER_VISUAL_DIRECTIONS.map(async (direction) => {
      const image = await generateWebsiteImage({
        prompt: [
          plan[direction],
          `This is for a ${plan.trade}.`,
          "Make it a single simple photographic/naturalistic image, not an editorial graphic, poster, infographic, icon set, diagram, collage, brand board, or UI mockup.",
          "No readable text, letters, numbers, icons, symbols, logos, UI chrome, watermarks, borders, contact details, or multiple unrelated scenes.",
        ].join(" "),
        role: "image",
      });
      const optimized = await optimizeImage(image.buffer, image.contentType);

      return {
        role: "image" as const,
        buffer: optimized.buffer,
        contentType: optimized.contentType,
        originalName: `ai-starter-${direction}.png`,
        source: "generated" as const,
      };
    }),
  );

  return generated.flatMap((result) => {
    if (result.status === "fulfilled") {
      return [result.value];
    }

    console.error(
      "[refresh-kiwi] fresh starter visual generation failed:",
      result.reason,
    );
    return [];
  });
}
