import { NextResponse } from "next/server";

import { assertRateLimit, rateLimitKey } from "@/lib/auth/rateLimit";
import { rateLimitResponse } from "@/lib/auth/rateLimitResponse";
import { isVoiceInputEnabled, transcribeAudio } from "@/lib/speech/transcribe";

export const runtime = "nodejs";

/**
 * Two minutes of opus voice is around 2MB, so this cap is generous for real
 * use while keeping the endpoint useless as a free general-purpose
 * transcription API. The rate limit below is the other half of that defence.
 */
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

function looksLikeAudio(file: File): boolean {
  // Chrome records audio/webm, Firefox audio/ogg; Safari has shipped both
  // audio/mp4 and video/mp4 for audio-only streams over the years.
  return (
    file.type.startsWith("audio/") ||
    file.type === "video/mp4" ||
    file.type === "video/webm"
  );
}

export async function POST(request: Request) {
  if (!isVoiceInputEnabled()) {
    return NextResponse.json(
      { error: "Voice input isn't available right now." },
      { status: 503 },
    );
  }

  try {
    await assertRateLimit(rateLimitKey(request, "transcribe"), {
      limit: 8,
      windowMs: 10 * 60 * 1000,
      message:
        "That's a lot of recordings in a row — give it a few minutes and try again.",
    });

    let form: FormData;

    try {
      form = await request.formData();
    } catch {
      return NextResponse.json({ error: "Invalid form body" }, { status: 400 });
    }

    const audio = form.get("audio");

    if (!(audio instanceof File) || audio.size === 0) {
      return NextResponse.json(
        { error: "No recording received" },
        { status: 400 },
      );
    }

    if (!looksLikeAudio(audio)) {
      return NextResponse.json(
        { error: "That doesn't look like an audio recording" },
        { status: 400 },
      );
    }

    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: "That recording is too long — keep it under two minutes." },
        { status: 400 },
      );
    }

    const text = await transcribeAudio(audio);

    if (!text) {
      return NextResponse.json(
        {
          error:
            "We couldn't hear anything in that one — try again a little closer to the mic.",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({ text });
  } catch (error) {
    const limited = rateLimitResponse(error);

    if (limited) {
      return limited;
    }

    console.error("[refresh-kiwi] transcription failed", error);

    return NextResponse.json(
      {
        error:
          "We couldn't turn that recording into text. Try again, or just type it instead.",
      },
      { status: 500 },
    );
  }
}
