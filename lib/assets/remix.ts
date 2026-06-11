/**
 * AI image remix via OpenAI's gpt-image-2 edits endpoint. The model is
 * instructed to recreate the source image as faithfully as possible; an
 * optional user note ("remove the text", "make it brighter") is applied as
 * the single deliberate change.
 */

const OPENAI_IMAGES_EDIT_URL = "https://api.openai.com/v1/images/edits";
const REMIX_TIMEOUT_MS = 120_000;

/** gpt-image-2 only accepts these input types */
const REMIXABLE_TYPES: Record<string, string> = {
  "image/png": "image.png",
  "image/jpeg": "image.jpg",
  "image/webp": "image.webp",
};

export function isRemixableImageType(contentType: string): boolean {
  return contentType in REMIXABLE_TYPES;
}

function buildRemixPrompt(note: string | null): string {
  const base =
    "Recreate this exact image as faithfully as possible. Match the subject, " +
    "composition, framing, colours, lighting, and overall style closely, " +
    "while making the result look clean, sharp, and professional.";

  if (note && note.trim()) {
    return (
      `${base} Apply exactly one deliberate change, keeping everything else ` +
      `as close to the original as possible: ${note.trim()}`
    );
  }

  return (
    `${base} Do not add, remove, or change any elements. Do not add text, ` +
    "watermarks, logos, or borders that are not in the original."
  );
}

export async function remixImage(params: {
  buffer: Buffer;
  contentType: string;
  note: string | null;
}): Promise<{ buffer: Buffer; contentType: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "AI remix isn't set up yet — OPENAI_API_KEY is missing on the server.",
    );
  }

  const fileName = REMIXABLE_TYPES[params.contentType];

  if (!fileName) {
    throw new Error("This image type can't be remixed — only PNG, JPG, and WebP work.");
  }

  const form = new FormData();
  form.append("model", "gpt-image-2");
  // Low quality is visually close to higher tiers for web-size photos but
  // costs a fraction per remix.
  form.append("quality", "low");
  form.append(
    "image",
    new File([new Uint8Array(params.buffer)], fileName, {
      type: params.contentType,
    }),
  );
  form.append("prompt", buildRemixPrompt(params.note));
  // Keep the output format aligned with the source so the asset's extension
  // and content type stay predictable.
  form.append("output_format", params.contentType === "image/png" ? "png" : params.contentType === "image/webp" ? "webp" : "jpeg");

  const response = await fetch(OPENAI_IMAGES_EDIT_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal: AbortSignal.timeout(REMIX_TIMEOUT_MS),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error(
      `[refresh-kiwi] remix: OpenAI request failed (${response.status}): ${body.slice(0, 500)}`,
    );
    throw new Error("The AI couldn't remix this image — please try again.");
  }

  const payload = (await response.json()) as {
    data?: Array<{ b64_json?: string }>;
  };
  const b64 = payload.data?.[0]?.b64_json;

  if (!b64) {
    throw new Error("The AI couldn't remix this image — please try again.");
  }

  return {
    buffer: Buffer.from(b64, "base64"),
    contentType: params.contentType,
  };
}
