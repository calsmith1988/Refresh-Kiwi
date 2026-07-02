import { generateWebsiteImage } from "@/lib/assets/generate";
import { optimizeImage } from "@/lib/assets/optimize";
import type { SeedAssetInput } from "@/lib/assets/seed";

const STARTER_VISUAL_DIRECTIONS = [
  {
    name: "hero",
    prompt:
      "Create one focused hero visual for the homepage. Show the business, product, place, or service in a single clear composition with generous negative space for nearby website copy.",
  },
  {
    name: "detail",
    prompt:
      "Create one focused supporting detail image for a services or feature section. Emphasize texture, craft, product detail, tools, environment, or customer experience without making a collage.",
  },
  {
    name: "atmosphere",
    prompt:
      "Create one focused lifestyle or atmosphere image for a trust, about, or call-to-action section. Keep it natural, premium, and specific to the brief without combining multiple scenes.",
  },
] as const;

export async function generateStarterSeedAssets(
  prompt: string,
): Promise<SeedAssetInput[]> {
  const generated = await Promise.allSettled(
    STARTER_VISUAL_DIRECTIONS.map(async (direction) => {
      const image = await generateWebsiteImage({
        prompt: [
          direction.prompt,
          "No readable text, logos, UI chrome, watermarks, borders, contact details, or multiple unrelated scenes.",
          "Brief:",
          prompt,
        ].join(" "),
        role: "image",
      });
      const optimized = await optimizeImage(image.buffer, image.contentType);

      return {
        role: "image" as const,
        buffer: optimized.buffer,
        contentType: optimized.contentType,
        originalName: `ai-starter-${direction.name}.png`,
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

