/**
 * Cloudflare Turnstile verification for the first anonymous generation call.
 * Each /api/refresh or /api/fresh spawns a paid Cursor agent, so we gate
 * anonymous callers behind a human-verification challenge.
 *
 * The gate is inert until TURNSTILE_SECRET_KEY is configured, so the app runs
 * unchanged locally and in any environment that hasn't set up Turnstile yet.
 * Signed-in users are never challenged (they're already rate-limited by id).
 */
const VERIFY_ENDPOINT =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function isTurnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());
}

export type TurnstileResult =
  | { ok: true }
  | { ok: false; message: string };

export async function verifyTurnstileToken(
  token: string | null,
  clientIp: string | null,
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();

  if (!secret) {
    return { ok: true };
  }

  if (!token) {
    return {
      ok: false,
      message: "Please complete the verification challenge and try again.",
    };
  }

  try {
    const body = new URLSearchParams({ secret, response: token });

    if (clientIp) {
      body.set("remoteip", clientIp);
    }

    const response = await fetch(VERIFY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10_000),
    });

    const outcome = (await response.json()) as { success?: boolean };

    if (outcome.success) {
      return { ok: true };
    }

    return {
      ok: false,
      message: "Verification failed. Please try again.",
    };
  } catch {
    // Fail closed: if we can't verify, don't spend an agent on an anonymous call.
    return {
      ok: false,
      message: "We couldn't verify your request just now. Please try again.",
    };
  }
}
