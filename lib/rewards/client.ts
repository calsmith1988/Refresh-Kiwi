/**
 * Browser-side helpers for the build-time Kiwi Catch reward.
 *
 * A win usually happens before the player has an account, so the claim token
 * lives in localStorage next to the active job and is handed to the claim call
 * once they sign up.
 */

const REWARD_STORAGE_KEY = "refresh-kiwi:reward";

export interface StoredReward {
  token: string;
  jobId: string;
  kind: string;
  expiresAt: string;
}

/**
 * GA4 funnel for the game: opened -> won/lost -> attached. This is what the
 * win rate and the 25-kiwi target get tuned against. Redemption isn't tracked
 * here — it happens server-side in the Stripe webhook.
 */
export function trackRewardEvent(
  eventName:
    | "reward_game_opened"
    | "reward_game_won"
    | "reward_game_lost"
    | "reward_attached",
  params?: Record<string, string | number | boolean>,
): void {
  try {
    window.gtag?.("event", eventName, params);
  } catch {
    // Analytics must never break the game.
  }
}

function jobHeaders(jobToken: string | null): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(jobToken ? { "x-job-token": jobToken } : {}),
  };
}

export function readStoredReward(): StoredReward | null {
  try {
    const raw = window.localStorage.getItem(REWARD_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<StoredReward>;

    if (!parsed.token || !parsed.jobId || !parsed.expiresAt) {
      return null;
    }

    // A reward that outlived its deadline is worthless — don't keep offering it.
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
      clearStoredReward();

      return null;
    }

    return {
      token: parsed.token,
      jobId: parsed.jobId,
      kind: parsed.kind ?? "free_month_pro",
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

export function storeReward(reward: StoredReward): void {
  try {
    window.localStorage.setItem(REWARD_STORAGE_KEY, JSON.stringify(reward));
  } catch {
    // Storage unavailable (private mode etc.) — the win just can't be resumed.
  }
}

export function clearStoredReward(): void {
  try {
    window.localStorage.removeItem(REWARD_STORAGE_KEY);
  } catch {
    // Ignore.
  }
}

async function errorMessageFrom(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string };

    return payload.error || fallback;
  } catch {
    return fallback;
  }
}

/** Starts the server-side play clock. Must succeed before a round begins. */
export async function requestRewardGameStart(params: {
  jobId: string;
  jobToken: string | null;
}): Promise<void> {
  const response = await fetch("/api/rewards/game-start", {
    method: "POST",
    headers: jobHeaders(params.jobToken),
    body: JSON.stringify({ jobId: params.jobId }),
  });

  if (!response.ok) {
    throw new Error(
      await errorMessageFrom(response, "We couldn't start the game."),
    );
  }
}

/** Submits a won round and persists the claim token for the signup step. */
export async function claimRewardWin(params: {
  jobId: string;
  jobToken: string | null;
}): Promise<StoredReward> {
  const response = await fetch("/api/rewards/win", {
    method: "POST",
    headers: jobHeaders(params.jobToken),
    body: JSON.stringify({ jobId: params.jobId }),
  });

  if (!response.ok) {
    throw new Error(
      await errorMessageFrom(response, "We couldn't confirm your win."),
    );
  }

  const payload = (await response.json()) as {
    reward?: { token?: string; kind?: string; expiresAt?: string };
  };

  if (!payload.reward?.token || !payload.reward.expiresAt) {
    throw new Error("We couldn't confirm your win.");
  }

  const reward: StoredReward = {
    token: payload.reward.token,
    jobId: params.jobId,
    kind: payload.reward.kind ?? "free_month_pro",
    expiresAt: payload.reward.expiresAt,
  };

  storeReward(reward);

  return reward;
}
