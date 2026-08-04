"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import KiwiCatchGame, {
  TARGET_SCORE,
  type RoundResult,
  type WinSaveState,
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

export type RewardOutcome = "won" | "lost";

interface BuildRewardPanelProps {
  jobId: string;
  jobToken: string | null;
  /** Live build elapsed time, shown in the status strip above the game. */
  buildElapsedMs: number;
  onBack: () => void;
  /** True while the finished-website reveal should wait for the round. */
  onRoundActiveChange: (active: boolean) => void;
  /** Latest round outcome, so the progress screen can react to it. A win is final. */
  onOutcome: (outcome: RewardOutcome) => void;
}

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * Thin frame around Kiwi Catch: a tappable build-status strip on top, the game
 * below. All game phases (instructions, countdown, play, result) happen inside
 * the game's own canvas frame so switching to the game never feels like
 * leaving the build.
 */
export default function BuildRewardPanel({
  jobId,
  jobToken,
  buildElapsedMs,
  onBack,
  onRoundActiveChange,
  onOutcome,
}: BuildRewardPanelProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [winState, setWinState] = useState<WinSaveState>("idle");
  const [holdingReveal, setHoldingReveal] = useState(false);
  const graceTimerRef = useRef<number | null>(null);
  const wonRef = useRef(false);
  const onRoundActiveChangeRef = useRef(onRoundActiveChange);
  const onOutcomeRef = useRef(onOutcome);

  onRoundActiveChangeRef.current = onRoundActiveChange;
  onOutcomeRef.current = onOutcome;

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

    // Throws on failure so the game stays on its current screen; the message
    // renders below the game.
    try {
      await requestRewardGameStart({ jobId, jobToken });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "We couldn't start the game.",
      );
      throw error;
    }

    clearGrace();
    setWinState("idle");
    setHoldingReveal(true);
  }, [clearGrace, jobId, jobToken]);

  const submitWin = useCallback(async () => {
    setWinState("saving");
    setErrorMessage(null);

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

  // Fired mid-round the moment the target score is banked: the win is saved
  // immediately rather than at the buzzer, so bonus play is risk-free.
  const handleTargetReached = useCallback(() => {
    wonRef.current = true;
    trackRewardEvent("reward_game_won", { score: TARGET_SCORE });
    onOutcomeRef.current("won");
    void submitWin();
  }, [submitWin]);

  const handleRoundEnd = useCallback(
    (result: RoundResult) => {
      beginGrace();

      if (!result.won && !wonRef.current) {
        trackRewardEvent("reward_game_lost", { score: result.score });
        onOutcomeRef.current("lost");
      }
    },
    [beginGrace],
  );

  return (
    <div className="preview-pop text-left">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex min-w-0 items-center gap-2 rounded-full border border-kiwi-green/60 bg-kiwi-green/15 px-4 py-2 text-sm font-semibold transition hover:border-kiwi-green"
        >
          <span
            aria-hidden
            className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-kiwi-green"
          />
          <span className="truncate">
            Still building your website —{" "}
            <span className="tabular-nums">{formatElapsed(buildElapsedMs)}</span>
            <span className="text-black/40"> / ~2 min</span>
          </span>
        </button>
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 text-xs font-semibold text-black/45 underline decoration-black/20 underline-offset-4 transition hover:text-black"
        >
          Back
        </button>
      </div>

      <div className="mt-4">
        <KiwiCatchGame
          onRequestStart={startRound}
          onTargetReached={handleTargetReached}
          onRoundEnd={handleRoundEnd}
          onBack={onBack}
          winSaveState={winState}
          onRetrySave={() => void submitWin()}
        />
      </div>

      {errorMessage ? (
        <p className="mt-4 text-xs leading-5 text-[#B4451F]">{errorMessage}</p>
      ) : null}
    </div>
  );
}
