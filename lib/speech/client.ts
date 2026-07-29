"use client";

/**
 * GA4 funnel for voice input: opened -> transcribed -> submitted (with
 * permission_denied and error as the drop-off reasons). The hypothesis this
 * exists to test: voice-sourced briefs are longer than typed ones and convert
 * to claimed sites at a higher rate.
 */
export function trackVoiceEvent(
  eventName:
    | "voice_opened"
    | "voice_permission_denied"
    | "voice_transcribed"
    | "voice_error"
    | "voice_submitted",
  params?: Record<string, string | number | boolean>,
): void {
  try {
    window.gtag?.("event", eventName, params);
  } catch {
    // Analytics must never break the input flow.
  }
}
