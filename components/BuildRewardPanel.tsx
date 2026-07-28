"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import KiwiCatchGame, {
  TARGET_SCORE,
  type RoundResult,
} from "@/components/KiwiCatchGame";
import {
  claimRewardWin,
  requestRewardGameStart,
  trackRewardEvent,
} from "@/lib/rewards/client";

/**
 * How long the reveal keeps waiting after a round ends, so the outcome lands
 * and a losing player has a moment to hit "play again" before their finished
 * website takes over the screen.
 */
const OUTCOME_GRACE_MS = 8_000;

type Phase = "intro" | "playing" | "won" | "lost";
type WinState = "saving" | "saved" | "error";

interface BuildRewardPanelProps {
  jobId: string;
  jobToken: string | null;
  onBack: () => void;
  /** True while the finished-website reveal should wait for the round. */
  onRoundActiveChange: (active: boolean) => void;
}

export default function BuildRewardPanel({
  jobId,
  jobToken,
  onBack,
  onRoundActiveChange,
}: BuildRewardPanelProps) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [roundKey, setRoundKey] = useState(0);
  const [score, setScore] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [winState, setWinState] = useState<WinState>("saving");
  const [holdingReveal, setHoldingReveal] = useState(false);
  const graceTimerRef = useRef<number | null>(null);
  const onRoundActiveChangeRef = useRef(onRoundActiveChange);

  onRoundActiveChangeRef.current = onRoundActiveChange;

  useEffect(() => {
    onRoundActiveChangeRef.current(holdingReveal);
  }, [holdingReveal]);

  // The panel only mounts when the CTA is clicked, so this is the "interested"
  // step of the funnel.
  useEffect(() => {
    trackRewardEvent("reward_game_opened");
  }, []);

  useEffect(
    () => () => {
      if (graceTimerRef.current !== null) {
        window.clearTimeout(graceTimerRef.current);
      }

      onRoundActiveChangeRef.current(false);
    },
    [],
  );

  const clearGrace = useCallback(() => {
    if (graceTimerRef.current !== null) {
      window.clearTimeout(graceTimerRef.current);
      graceTimerRef.current = null;
    }
  }, []);

  const beginGrace = useCallback(() => {
    clearGrace();
    graceTimerRef.current = window.setTimeout(() => {
      graceTimerRef.current = null;
      setHoldingReveal(false);
    }, OUTCOME_GRACE_MS);
  }, [clearGrace]);

  const startRound = useCallback(async () => {
    setErrorMessage(null);
    setIsStarting(true);

    try {
      await requestRewardGameStart({ jobId, jobToken });
      clearGrace();
      setScore(0);
      setRoundKey((key) => key + 1);
      setPhase("playing");
      setHoldingReveal(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "We couldn't start the game.",
      );
    } finally {
      setIsStarting(false);
    }
  }, [clearGrace, jobId, jobToken]);

  const submitWin = useCallback(async () => {
    setWinState("saving");

    try {
      await claimRewardWin({ jobId, jobToken });
      setWinState("saved");
    } catch (error) {
      setWinState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "We couldn't confirm your win.",
      );
    }
  }, [jobId, jobToken]);

  const handleRoundEnd = useCallback(
    (result: RoundResult) => {
      setScore(result.score);
      beginGrace();

      if (!result.won) {
        trackRewardEvent("reward_game_lost", { score: result.score });
        setPhase("lost");

        return;
      }

      trackRewardEvent("reward_game_won", { score: result.score });
      setPhase("won");
      void submitWin();
    },
    [beginGrace, submitWin],
  );

  return (
    <div className="preview-pop text-left">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-kiwi-green px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.12em]">
          One-time offer
        </span>
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-semibold text-black/45 underline decoration-black/20 underline-offset-4 transition hover:text-black"
        >
          Back to progress
        </button>
      </div>

      {phase === "intro" ? (
        <>
          <h2 className="mt-4 font-fraunces text-[clamp(1.35rem,5vw,1.9rem)] font-semibold leading-tight tracking-tight">
            Win your first month free
          </h2>
          <p className="mt-3 text-sm leading-6 text-black/60">
            Catch {TARGET_SCORE} kiwis in 45 seconds while we finish building
            your website. Win and your first month of Kiwi Pro is on us — golden
            kiwis count double, and rotten brown ones cost you one.
          </p>
          <button
            type="button"
            onClick={() => void startRound()}
            disabled={isStarting}
            className="mt-6 w-full rounded-full bg-kiwi-green px-6 py-3 text-sm font-bold transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isStarting ? "Getting the punnet…" : "Play Kiwi Catch"}
          </button>
        </>
      ) : null}

      {phase === "playing" ? (
        <div className="mt-4">
          <KiwiCatchGame key={roundKey} onRoundEnd={handleRoundEnd} />
        </div>
      ) : null}

      {phase === "won" ? (
        <>
          <h2 className="mt-4 font-fraunces text-[clamp(1.35rem,5vw,1.9rem)] font-semibold leading-tight tracking-tight">
            You won a free month 🥝
          </h2>
          <p className="mt-3 text-sm leading-6 text-black/60">
            {score} kiwis caught. Your first month of Kiwi Pro is free —
            it&apos;s saved to this website, so save your site to lock it in.
          </p>
          {winState === "error" ? (
            <button
              type="button"
              onClick={() => void submitWin()}
              className="mt-5 w-full rounded-full border border-black/15 bg-white px-6 py-3 text-sm font-semibold transition hover:border-black/30"
            >
              Try saving your free month again
            </button>
          ) : null}
        </>
      ) : null}

      {phase === "lost" ? (
        <>
          <h2 className="mt-4 font-fraunces text-[clamp(1.35rem,5vw,1.9rem)] font-semibold leading-tight tracking-tight">
            So close — {score} of {TARGET_SCORE}
          </h2>
          <p className="mt-3 text-sm leading-6 text-black/60">
            Another go? The offer stands until your website is ready.
          </p>
          <button
            type="button"
            onClick={() => void startRound()}
            disabled={isStarting}
            className="mt-6 w-full rounded-full bg-kiwi-green px-6 py-3 text-sm font-bold transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isStarting ? "Getting the punnet…" : "Play again"}
          </button>
        </>
      ) : null}

      {errorMessage ? (
        <p className="mt-4 text-xs leading-5 text-[#B4451F]">{errorMessage}</p>
      ) : null}
    </div>
  );
}
