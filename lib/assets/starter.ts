import { generateWebsiteImage } from "@/lib/assets/generate";
import { optimizeImage } from "@/lib/assets/optimize";
import type { SeedAssetInput } from "@/lib/assets/seed";

/** GBP-brief meta lines the image model would happily render as poster text. */
const RENDERABLE_TEXT_LINE = /(place id|maps listing|google rating|opening hours|imported from a google|existing website listed|business name:|phone number:|address\/service area:|^-?\s*")/i;

function matchField(prompt: string, label: string): string | null {
  const match = prompt.match(new RegExp(`${label}:\\s*(.+)$`, "im"));

  return match?.[1]?.trim() || null;
}

/**
 * gpt-image renders any concrete copy it is given — names, phone numbers,
 * review quotes — as poster/brand-board text no matter how firmly the prompt
 * forbids text. So the image prompt gets a short scene description derived
 * from the creation prompt, never the full brief.
 */
function imageSceneBrief(prompt: string): string {
  const category = matchField(prompt, "Category/trade");
  const summary = matchField(prompt, "Google summary");

  if (category || summary) {
    return [
      category
        ? `The subject is the day-to-day work, tools, materials, and results of a ${category.toLowerCase()} small business.`
        : null,
      summary,
    ]
      .filter(Boolean)
      .join(" ");
  }

  const scene = prompt
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 && !line.startsWith("#") && !RENDERABLE_TEXT_LINE.test(line),
    )
    .join(" ")
    // Contact fragments inside otherwise useful sentences get blanked, not
    // dropped, so short one-paragraph fresh prompts keep their subject.
    .replace(/https?:\/\/\S+|www\.\S+/gi, " ")
    .replace(/[\d\s()+-]{7,}/g, " ")
    .replace(/\s{2,}/g, " ")
    .slice(0, 600)
    .trim();

  return scene || "The everyday setting and craft of an independent local small business.";
}

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
  const scene = imageSceneBrief(prompt);
  const generated = await Promise.allSettled(
    STARTER_VISUAL_DIRECTIONS.map(async (direction) => {
      const image = await generateWebsiteImage({
        prompt: [
          direction.prompt,
          "Make it a single simple photographic/naturalistic image, not an editorial graphic, poster, infographic, icon set, diagram, collage, brand board, or UI mockup.",
          "No readable text, letters, numbers, icons, symbols, logos, UI chrome, watermarks, borders, contact details, or multiple unrelated scenes.",
          scene,
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

