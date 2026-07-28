import { and, eq, gt, inArray, isNotNull } from "drizzle-orm";

import { createRawToken, hashToken } from "@/lib/auth/tokens";
import { getDb, schema } from "@/lib/db";
import type { JobStatus } from "@/lib/jobs/types";
import { previewExpiresAt } from "@/lib/websites/service";

const { jobs, rewards, users, websites } = schema;

export const FREE_MONTH_REWARD_KIND = "free_month_pro";

/** Months of Pro granted by a won reward, applied as a Stripe trial. */
export const FREE_MONTH_TRIAL_DAYS = 30;

/**
 * A Kiwi Catch round lasts 45 seconds. Requiring 40 seconds of server-measured
 * play means a client that skips the game and POSTs straight to the win
 * endpoint is rejected, without penalising anyone who genuinely played.
 */
export const MIN_PLAY_MS = 40_000;

/** Statuses where a build is still in flight, so the game is worth offering. */
const GAME_START_STATUSES = new Set<JobStatus>([
  "queued",
  "analyzing",
  "building_homepage",
]);

const CLAIMED_STATUSES = ["attached", "redeemed"] as const;

export class RewardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RewardError";
  }
}

export interface IssuedReward {
  token: string;
  kind: string;
  expiresAt: string;
}

export interface RedeemableReward {
  id: string;
  kind: string;
  expiresAt: string;
}

/**
 * The reward dies with the preview it was won on, so the offer and the preview
 * share one deadline. The website row doesn't exist until the homepage is
 * ready, so mid-build wins fall back to a fresh 7-day window (the build is only
 * a couple of minutes old, so the two agree in practice).
 */
async function rewardExpiryForJob(jobId: string): Promise<Date> {
  const [website] = await getDb()
    .select({ expiresAt: websites.expiresAt })
    .from(websites)
    .where(eq(websites.jobId, jobId))
    .limit(1);

  return website?.expiresAt ?? previewExpiresAt();
}

/**
 * Called when a round starts. Replays deliberately reuse the original row so
 * play time accumulates across attempts instead of restarting the clock.
 */
export async function startRewardGame(jobId: string): Promise<void> {
  const db = getDb();
  const [job] = await db
    .select({ status: jobs.status })
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);

  if (!job) {
    throw new RewardError("Job not found");
  }

  if (!GAME_START_STATUSES.has(job.status)) {
    throw new RewardError("This build has already finished");
  }

  await db
    .insert(rewards)
    .values({
      jobId,
      kind: FREE_MONTH_REWARD_KIND,
      status: "playing",
      gameStartedAt: new Date(),
    })
    .onConflictDoNothing({ target: rewards.jobId });
}

/**
 * Called when a round is won. Re-issues a fresh claim token if the win is
 * replayed (e.g. the winner cleared storage before signing up) — still one
 * reward per build, but the holder of the job token isn't locked out of it.
 */
export async function issueRewardForJob(jobId: string): Promise<IssuedReward> {
  const db = getDb();
  const [reward] = await db
    .select()
    .from(rewards)
    .where(eq(rewards.jobId, jobId))
    .limit(1);

  if (!reward) {
    throw new RewardError("Start the game before claiming a free month");
  }

  if (reward.status === "attached" || reward.status === "redeemed") {
    throw new RewardError("This free month has already been claimed");
  }

  if (Date.now() - reward.gameStartedAt.getTime() < MIN_PLAY_MS) {
    throw new RewardError("Finish the round to win your free month");
  }

  const token = createRawToken();
  const expiresAt = reward.expiresAt ?? (await rewardExpiryForJob(jobId));
  const now = new Date();

  await db
    .update(rewards)
    .set({
      status: "issued",
      tokenHash: hashToken(token),
      issuedAt: reward.issuedAt ?? now,
      expiresAt,
      updatedAt: now,
    })
    .where(eq(rewards.id, reward.id));

  return {
    token,
    kind: reward.kind,
    expiresAt: expiresAt.toISOString(),
  };
}

/**
 * Binds a won reward to the account that just claimed the site. This is the
 * real eligibility gate (the client-side CTA check is only cosmetic).
 *
 * Returns null instead of throwing whenever the reward can't be attached —
 * claiming a website must never fail because of an ineligible bonus.
 */
export async function attachRewardToUser(params: {
  token: string;
  userId: string;
  jobId?: string;
}): Promise<RedeemableReward | null> {
  const db = getDb();

  try {
    const [reward] = await db
      .select()
      .from(rewards)
      .where(
        and(
          eq(rewards.tokenHash, hashToken(params.token)),
          eq(rewards.status, "issued"),
          gt(rewards.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!reward || (params.jobId && reward.jobId !== params.jobId)) {
      return null;
    }

    const [user] = await db
      .select({
        plan: users.plan,
        subscriptionStatus: users.subscriptionStatus,
        stripeSubscriptionId: users.stripeSubscriptionId,
      })
      .from(users)
      .where(eq(users.id, params.userId))
      .limit(1);

    // Free month is for customers who have never subscribed. Anyone on Pro, or
    // mid-subscription in any state, keeps their existing billing untouched.
    if (
      !user ||
      user.plan !== "free" ||
      user.subscriptionStatus !== "none" ||
      user.stripeSubscriptionId
    ) {
      return null;
    }

    const [alreadyClaimed] = await db
      .select({ id: rewards.id })
      .from(rewards)
      .where(
        and(
          eq(rewards.userId, params.userId),
          inArray(rewards.status, [...CLAIMED_STATUSES]),
        ),
      )
      .limit(1);

    if (alreadyClaimed) {
      return null;
    }

    const now = new Date();
    const [attached] = await db
      .update(rewards)
      .set({
        userId: params.userId,
        status: "attached",
        attachedAt: now,
        updatedAt: now,
      })
      .where(and(eq(rewards.id, reward.id), eq(rewards.status, "issued")))
      .returning();

    if (!attached?.expiresAt) {
      return null;
    }

    return {
      id: attached.id,
      kind: attached.kind,
      expiresAt: attached.expiresAt.toISOString(),
    };
  } catch (error) {
    // Most likely the rewards_user_claimed_idx unique index rejecting a second
    // free month for this user (concurrent claims). Never fail the claim.
    console.warn("[refresh-kiwi] could not attach reward", error);

    return null;
  }
}

/** The reward to apply at checkout, if this user has an unspent one. */
export async function getRedeemableRewardForUser(
  userId: string,
): Promise<RedeemableReward | null> {
  const [reward] = await getDb()
    .select({
      id: rewards.id,
      kind: rewards.kind,
      expiresAt: rewards.expiresAt,
    })
    .from(rewards)
    .where(
      and(
        eq(rewards.userId, userId),
        eq(rewards.status, "attached"),
        eq(rewards.kind, FREE_MONTH_REWARD_KIND),
        isNotNull(rewards.expiresAt),
        gt(rewards.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!reward?.expiresAt) {
    return null;
  }

  return {
    id: reward.id,
    kind: reward.kind,
    expiresAt: reward.expiresAt.toISOString(),
  };
}

/**
 * Fail-safe variant for critical paths. A won free month is always a bonus,
 * never a prerequisite — if the lookup fails, checkout should still take the
 * customer's money and the dashboard should still load.
 */
export async function findRedeemableRewardForUser(
  userId: string,
): Promise<RedeemableReward | null> {
  try {
    return await getRedeemableRewardForUser(userId);
  } catch (error) {
    console.error("[refresh-kiwi] reward lookup failed", error);

    return null;
  }
}

/** Called from the Stripe webhook once the trial subscription exists. */
export async function markRewardRedeemed(rewardId: string): Promise<void> {
  const now = new Date();

  await getDb()
    .update(rewards)
    .set({ status: "redeemed", redeemedAt: now, updatedAt: now })
    .where(and(eq(rewards.id, rewardId), eq(rewards.status, "attached")));
}
