/**
 * Turns a freeform (often spoken) business brief into three focused image
 * prompts for gpt-image. A cheap text model does the subject understanding;
 * regex sanitisation is only the fallback when this call fails.
 */

type OpenAiResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

export type StarterImagePlan = {
  trade: string;
  hero: string;
  detail: string;
  atmosphere: string;
};

export type StarterImageDirection = keyof Pick<
  StarterImagePlan,
  "hero" | "detail" | "atmosphere"
>;

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_IMAGE_PROMPT_MODEL = "gpt-4o-mini";
const REWRITE_TIMEOUT_MS = 25_000;

/** Structured GBP/meta field lines only — never freeform paragraphs. */
const STRUCTURED_META_LINE =
  /^(place id|maps listing|google rating|opening hours|imported from a google|existing website listed|business name|phone number|address\/service area)\s*:/i;

function extractOutputText(payload: OpenAiResponse): string {
  if (payload.output_text?.trim()) {
    return payload.output_text.trim();
  }

  return (
    payload.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text ?? "")
      .join("\n")
      .trim() ?? ""
  );
}

function matchField(prompt: string, label: string): string | null {
  const match = prompt.match(new RegExp(`${label}:\\s*(.+)$`, "im"));

  return match?.[1]?.trim() || null;
}

/**
 * Last-resort scene description when the rewrite model is unavailable.
 * Strips only structured metadata lines and contact fragments — never drops
 * a whole spoken paragraph because it mentioned opening hours mid-sentence.
 */
export function imageSceneBriefFallback(prompt: string): string {
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
        line.length > 0 &&
        !line.startsWith("#") &&
        !STRUCTURED_META_LINE.test(line) &&
        !/^-\s*"/.test(line),
    )
    .join(" ")
    .replace(/https?:\/\/\S+|www\.\S+/gi, " ")
    .replace(/[\d\s()+-]{7,}/g, " ")
    .replace(/\s{2,}/g, " ")
    .slice(0, 600)
    .trim();

  return (
    scene ||
    "The everyday setting and craft of an independent local small business."
  );
}

function fallbackStarterImagePlan(brief: string): StarterImagePlan {
  const scene = imageSceneBriefFallback(brief);

  return {
    trade: "independent local small business",
    hero: `Homepage hero for this business: ${scene}. Single clear photographic composition with space for nearby website copy.`,
    detail: `Supporting detail image: texture, tools, materials, or close-up craft of this business — ${scene}. One focused subject, not a collage.`,
    atmosphere: `Lifestyle or atmosphere image for trust/about: natural, premium setting specific to this business — ${scene}. One scene only.`,
  };
}

function stripCodeFences(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);

  return (fenced?.[1] ?? text).trim();
}

function parseStarterImagePlan(text: string): StarterImagePlan | null {
  try {
    const parsed = JSON.parse(stripCodeFences(text)) as Partial<StarterImagePlan>;
    const trade = parsed.trade?.trim();
    const hero = parsed.hero?.trim();
    const detail = parsed.detail?.trim();
    const atmosphere = parsed.atmosphere?.trim();

    if (!trade || !hero || !detail || !atmosphere) {
      return null;
    }

    if (
      hero.length < 20 ||
      detail.length < 20 ||
      atmosphere.length < 20 ||
      hero.length > 900 ||
      detail.length > 900 ||
      atmosphere.length > 900
    ) {
      return null;
    }

    return { trade, hero, detail, atmosphere };
  } catch {
    return null;
  }
}

/**
 * Ask a cheap text model to turn the brief into three visual prompts the
 * image model can follow. Returns null on any failure so callers can fall back.
 */
export async function planStarterImagePrompts(
  brief: string,
): Promise<StarterImagePlan | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const trimmed = brief.trim();

  if (!apiKey || trimmed.length < 8) {
    return null;
  }

  const model =
    process.env.OPENAI_IMAGE_PROMPT_MODEL?.trim() || DEFAULT_IMAGE_PROMPT_MODEL;

  const input = `You write image-generation prompts for a small-business website builder.

Given the business brief below, return ONLY a JSON object with this exact shape:
{
  "trade": "short trade/category phrase",
  "hero": "one photographic hero-image prompt",
  "detail": "one photographic detail/services-image prompt",
  "atmosphere": "one photographic lifestyle/atmosphere-image prompt"
}

Rules:
- Use only facts implied by the brief. Do not invent staff faces, brand names as text in the scene, phone numbers, addresses, awards, or specific products the brief never mentioned.
- If the brief is thin, stay generic-to-the-trade (e.g. calm treatment room, soft clinical lighting for aesthetics) rather than inventing a glamorous story.
- Each of hero/detail/atmosphere must describe ONE simple photographic or naturalistic scene suitable for a modern website.
- Never ask for readable text, letters, numbers, logos, watermarks, UI, posters, infographics, collages, brand boards, or multiple unrelated scenes in one image.
- Prefer real-world settings, materials, tools, and results of the trade over abstract symbolism.
- Keep each prompt under 60 words.
- No markdown, no commentary — JSON only.

Business brief:
${trimmed.slice(0, 2500)}`;

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input,
      }),
      signal: AbortSignal.timeout(REWRITE_TIMEOUT_MS),
    });

    const payload = (await response.json().catch(() => ({}))) as
      | OpenAiResponse
      | { error?: { message?: string } };

    if (!response.ok) {
      const apiMessage =
        "error" in payload ? payload.error?.message : "OpenAI request failed";
      console.warn(
        `[refresh-kiwi] image prompt rewrite failed: ${apiMessage ?? response.status}`,
      );
      return null;
    }

    const text = extractOutputText(payload as OpenAiResponse);
    const plan = parseStarterImagePlan(text);

    if (!plan) {
      console.warn(
        "[refresh-kiwi] image prompt rewrite returned unusable JSON:",
        text.slice(0, 300),
      );
      return null;
    }

    console.info(
      `[refresh-kiwi] image prompt rewrite ok trade="${plan.trade}" model=${model}`,
    );

    return plan;
  } catch (error) {
    console.warn("[refresh-kiwi] image prompt rewrite error:", error);
    return null;
  }
}

/** Rewrite when possible; otherwise the fixed sanitiser fallback. */
export async function resolveStarterImagePlan(
  brief: string,
): Promise<StarterImagePlan> {
  const planned = await planStarterImagePrompts(brief);

  if (planned) {
    return planned;
  }

  console.info("[refresh-kiwi] image prompt rewrite falling back to sanitiser");
  return fallbackStarterImagePlan(brief);
}
