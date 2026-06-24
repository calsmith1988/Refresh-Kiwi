const OPENAI_IMAGES_GENERATE_URL = "https://api.openai.com/v1/images/generations";
const GENERATE_TIMEOUT_MS = 120_000;

function buildGeneratePrompt(params: {
  prompt: string;
  role: "logo" | "image";
  brandName?: string | null;
}) {
  const brandContext = params.brandName
    ? ` for ${params.brandName.trim()}`
    : "";

  if (params.role === "logo") {
    return [
      `Create a clean, modern, text-free brand mark${brandContext}.`,
      "Do not include readable words, letters, numbers, slogans, watermarks, or mockup text.",
      "Make it suitable for a website header and favicon-style use: simple silhouette, strong shape, scalable, professional.",
      `Creative direction: ${params.prompt}`,
    ].join(" ");
  }

  return [
    `Create a premium website-ready visual${brandContext}.`,
    "No readable text, captions, watermarks, logos, UI chrome, or borders.",
    "Make it polished, realistic or tastefully illustrative as appropriate, with composition suitable for a modern small-business website.",
    `Creative direction: ${params.prompt}`,
  ].join(" ");
}

export async function generateWebsiteImage(params: {
  prompt: string;
  role: "logo" | "image";
  brandName?: string | null;
}): Promise<{ buffer: Buffer; contentType: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "AI image generation isn't set up yet — OPENAI_API_KEY is missing on the server.",
    );
  }

  const response = await fetch(OPENAI_IMAGES_GENERATE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-2",
      prompt: buildGeneratePrompt(params),
      quality: "low",
      size: "1024x1024",
      output_format: "png",
    }),
    signal: AbortSignal.timeout(GENERATE_TIMEOUT_MS),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error(
      `[refresh-kiwi] generate image: OpenAI request failed (${response.status}): ${body.slice(0, 500)}`,
    );
    throw new Error("The AI couldn't generate that image — please try again.");
  }

  const payload = (await response.json()) as {
    data?: Array<{ b64_json?: string }>;
  };
  const b64 = payload.data?.[0]?.b64_json;

  if (!b64) {
    throw new Error("The AI couldn't generate that image — please try again.");
  }

  return {
    buffer: Buffer.from(b64, "base64"),
    contentType: "image/png",
  };
}
