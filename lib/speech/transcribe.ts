const OPENAI_TRANSCRIPTIONS_URL =
  "https://api.openai.com/v1/audio/transcriptions";

/**
 * Mini transcription model: the transcript is consumed by the build agent,
 * which is unbothered by the odd mis-heard word, so the cheapest model that
 * handles accents well is the right trade.
 */
const DEFAULT_TRANSCRIBE_MODEL = "gpt-4o-mini-transcribe";

/** Voice input rides on the OpenAI key the app already uses for visuals. */
export function isVoiceInputEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export async function transcribeAudio(audio: File): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("Voice input is not set up yet - OPENAI_API_KEY is missing.");
  }

  const model =
    process.env.OPENAI_TRANSCRIBE_MODEL?.trim() || DEFAULT_TRANSCRIBE_MODEL;

  const body = new FormData();
  body.append("file", audio, audio.name || "recording.webm");
  body.append("model", model);
  // The audience is NZ/UK small-business owners; pinning the language stops
  // short clips from being mis-detected.
  body.append("language", "en");

  const response = await fetch(OPENAI_TRANSCRIPTIONS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body,
  });

  const payload = (await response.json().catch(() => ({}))) as {
    text?: string;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(
      `Transcription failed: ${payload.error?.message ?? "OpenAI request failed"}`,
    );
  }

  return payload.text?.trim() ?? "";
}
