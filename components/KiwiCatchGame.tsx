"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { prepareSprite } from "@/lib/kiwi-pit/prepareSprite";
import type { KiwiSprite } from "@/lib/kiwi-pit/prepareSprite";

const KIWI_SPRITE_PATH = "/assets/kiwi-slice-v2.png";

/**
 * The round runs its full length even after the target is hit: the win is
 * banked the moment the score crosses TARGET_SCORE and the rest becomes bonus
 * play. The game exists to make a 2-3 minute build disappear, so ending early
 * would defeat the point — but a "Collect" escape hatch appears once the win
 * is banked. Server-side minimum play time lives in lib/rewards/service.ts.
 */
export const ROUND_MS = 45_000;
export const TARGET_SCORE = 25;

/** Doubles as a buffer so the server clock is always started before play. */
const COUNTDOWN_MS = 3_000;

const STAGE_HEIGHT = 300;
const BASKET_WIDTH = 82;
const BASKET_HEIGHT = 22;
const BASKET_BOTTOM_GAP = 16;
const KIWI_SIZE = 34;
const GOLDEN_SIZE = 42;
const GOLDEN_CHANCE = 0.14;
const GOLDEN_POINTS = 2;
/**
 * Rotten kiwis are the whole difficulty curve: they cost a point if caught, so
 * the punnet can't just camp under the busiest column. Dodging costs time,
 * which is the real price — the point loss is mostly there to make the dodge
 * feel like it matters.
 */
const ROTTEN_CHANCE = 0.16;
const ROTTEN_POINTS = -1;
/**
 * Spawn tightens across the round so it ends on a rush. Roughly 60 kiwis fall
 * in 45s and about 52 of them are worth catching (~60 points if you took every
 * good one), against a target of 25 — still generous on purpose, this is a
 * marketing giveaway rather than a lottery.
 */
const SPAWN_START_MS = 900;
const SPAWN_END_MS = 520;
const FALL_MS = 1_900;
const GOLDEN_FALL_MS = 1_550;
const REDUCED_MOTION_FALL_MS = 2_700;
const KEYBOARD_STEP = 26;
const SCORE_POP_MS = 620;

const BRAND_GREEN = "#C5E66A";
const DEEP_GREEN = "#6F9B24";
const GOLD = "#F2C14E";
const ROT_BROWN = "#6B4423";
const PENALTY_RED = "#B4451F";
const INK = "#141811";

export interface RoundResult {
  score: number;
  won: boolean;
}

export type WinSaveState = "idle" | "saving" | "saved" | "error";

type KiwiKind = "normal" | "golden" | "rotten";

type Phase =
  | { kind: "ready" }
  | { kind: "running" }
  | { kind: "done"; result: RoundResult };

interface FallingKiwi {
  x: number;
  y: number;
  previousY: number;
  /** Pixels per millisecond. */
  speed: number;
  size: number;
  rotation: number;
  spin: number;
  kind: KiwiKind;
}

interface ScorePop {
  x: number;
  y: number;
  value: number;
  startedAt: number;
}

interface KiwiCatchGameProps {
  /** Starts the server-side round clock. Throw to keep the game on its current screen. */
  onRequestStart: () => Promise<void>;
  /** Fired once per round, the moment the score first crosses TARGET_SCORE. */
  onTargetReached: () => void;
  onRoundEnd: (result: RoundResult) => void;
  onBack: () => void;
  winSaveState: WinSaveState;
  onRetrySave: () => void;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * The hazard is the same fruit gone bad: tinted from the loaded sprite so it
 * keeps the kiwi silhouette while reading as "don't catch this" instantly.
 */
function makeRottenSprite(sprite: KiwiSprite): KiwiSprite {
  const width = "naturalWidth" in sprite ? sprite.naturalWidth : sprite.width;
  const height = "naturalHeight" in sprite ? sprite.naturalHeight : sprite.height;

  if (!width || !height) {
    return sprite;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return sprite;
  }

  ctx.drawImage(sprite, 0, 0, width, height);
  // source-atop keeps the tint inside the fruit's own pixels.
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = "rgba(74, 48, 22, 0.72)";
  ctx.fillRect(0, 0, width, height);

  return canvas;
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawStage(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  basketX: number,
) {
  const backdrop = ctx.createLinearGradient(0, 0, 0, height);
  backdrop.addColorStop(0, "#ffffff");
  backdrop.addColorStop(1, "#f3f7e6");
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, width, height);

  const left = basketX - BASKET_WIDTH / 2;
  const top = height - BASKET_BOTTOM_GAP - BASKET_HEIGHT;

  ctx.save();
  roundedRectPath(ctx, left, top, BASKET_WIDTH, BASKET_HEIGHT, 9);
  ctx.fillStyle = BRAND_GREEN;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.stroke();

  // Punnet weave hint so it reads as a basket rather than a bar.
  ctx.strokeStyle = "rgba(20, 24, 17, 0.28)";
  ctx.lineWidth = 1.5;

  for (let i = 1; i < 4; i += 1) {
    const x = left + (BASKET_WIDTH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(x, top + 3);
    ctx.lineTo(x, top + BASKET_HEIGHT - 3);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Kiwi Catch. Deliberately not built on the matter-js kiwi pit: kinematic
 * falling gives exact control over fall time and spawn rate (so difficulty is
 * tunable) and makes catch detection a single line crossing test. It shares the
 * pit's sprite pipeline so it still looks like the rest of the site.
 *
 * The whole flow lives in this one frame: instructions overlay -> countdown ->
 * play -> result overlay. The build status strip above it stays visible the
 * entire time (rendered by BuildRewardPanel).
 */
export default function KiwiCatchGame({
  onRequestStart,
  onTargetReached,
  onRoundEnd,
  onBack,
  winSaveState,
  onRetrySave,
}: KiwiCatchGameProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spriteRef = useRef<KiwiSprite | null>(null);
  const rottenSpriteRef = useRef<KiwiSprite | null>(null);
  const onRoundEndRef = useRef(onRoundEnd);
  const onTargetReachedRef = useRef(onTargetReached);
  const finishEarlyRef = useRef<(() => void) | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "ready" });
  const [runId, setRunId] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [hud, setHud] = useState({
    score: 0,
    remainingMs: ROUND_MS,
    countdownSeconds: 0,
    banked: false,
  });

  onRoundEndRef.current = onRoundEnd;
  onTargetReachedRef.current = onTargetReached;

  useEffect(() => {
    const image = new Image();
    image.src = KIWI_SPRITE_PATH;
    image.onload = () => {
      const sprite = prepareSprite(image);
      spriteRef.current = sprite;
      rottenSpriteRef.current = makeRottenSprite(sprite);
    };
  }, []);

  const play = useCallback(async () => {
    setIsStarting(true);

    try {
      // The server round clock must be running before the countdown starts,
      // so a win can never be reported for a round the server didn't see.
      await onRequestStart();
      setHud({
        score: 0,
        remainingMs: ROUND_MS,
        countdownSeconds: Math.ceil(COUNTDOWN_MS / 1000),
        banked: false,
      });
      setPhase({ kind: "running" });
      setRunId((id) => id + 1);
      canvasRef.current?.focus({ preventScroll: true });
    } catch {
      // The parent surfaces the error message; stay on the current screen.
    } finally {
      setIsStarting(false);
    }
  }, [onRequestStart]);

  // Static stage behind the instructions / result overlays.
  useEffect(() => {
    if (phase.kind === "running") {
      return;
    }

    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!wrap || !canvas || !ctx) {
      return;
    }

    const render = () => {
      const width = Math.max(240, wrap.clientWidth);
      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(STAGE_HEIGHT * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${STAGE_HEIGHT}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawStage(ctx, width, STAGE_HEIGHT, width / 2);
    };

    render();
    window.addEventListener("resize", render);

    return () => window.removeEventListener("resize", render);
  }, [phase.kind]);

  useEffect(() => {
    if (runId === 0 || phase.kind !== "running") {
      return;
    }

    const wrap = wrapRef.current;
    const canvas = canvasRef.current;

    if (!wrap || !canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const reducedMotion = prefersReducedMotion();
    const kiwis: FallingKiwi[] = [];
    const scorePops: ScorePop[] = [];

    let width = Math.max(240, wrap.clientWidth);
    const height = STAGE_HEIGHT;
    let basketX = width / 2;
    let currentScore = 0;
    let spawnAccumulator = 0;
    let hudAccumulator = 0;
    let banked = false;
    let finished = false;
    let raf: number | null = null;

    const startedAt = performance.now();
    let lastFrame = startedAt;

    const applySize = () => {
      width = Math.max(240, wrap.clientWidth);

      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      basketX = Math.min(width - BASKET_WIDTH / 2, Math.max(BASKET_WIDTH / 2, basketX));
    };

    applySize();

    const catchLineY = height - BASKET_BOTTOM_GAP - BASKET_HEIGHT;

    const spawn = () => {
      const roll = Math.random();
      const kind: KiwiKind =
        roll < GOLDEN_CHANCE
          ? "golden"
          : roll < GOLDEN_CHANCE + ROTTEN_CHANCE
            ? "rotten"
            : "normal";
      const size = kind === "golden" ? GOLDEN_SIZE : KIWI_SIZE;
      // Rotten ones fall at the normal rate: a hazard you can't read in time
      // is unfair rather than difficult.
      const fallMs = reducedMotion
        ? REDUCED_MOTION_FALL_MS
        : kind === "golden"
          ? GOLDEN_FALL_MS
          : FALL_MS;
      const half = size / 2;

      kiwis.push({
        x: half + Math.random() * Math.max(1, width - size),
        y: -half,
        previousY: -half,
        speed: (height + size) / fallMs,
        size,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * (reducedMotion ? 0.0008 : 0.0035),
        kind,
      });
    };

    const finish = () => {
      if (finished) {
        return;
      }

      finished = true;
      finishEarlyRef.current = null;

      const result = {
        score: currentScore,
        won: banked || currentScore >= TARGET_SCORE,
      };

      setHud({
        score: currentScore,
        remainingMs: 0,
        countdownSeconds: 0,
        banked,
      });
      setPhase({ kind: "done", result });
      onRoundEndRef.current(result);
    };

    finishEarlyRef.current = finish;

    const drawKiwiAt = (kiwi: FallingKiwi) => {
      const rotten = kiwi.kind === "rotten";
      const sprite = rotten ? rottenSpriteRef.current : spriteRef.current;

      ctx.save();
      ctx.translate(kiwi.x, kiwi.y);

      // Opposite halos so the two specials are told apart by shape and
      // brightness, not only by colour.
      if (kiwi.kind === "golden") {
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, kiwi.size * 0.85);
        glow.addColorStop(0, "rgba(242, 193, 78, 0.55)");
        glow.addColorStop(1, "rgba(242, 193, 78, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, kiwi.size * 0.85, 0, Math.PI * 2);
        ctx.fill();
      } else if (rotten) {
        const haze = ctx.createRadialGradient(0, 0, 0, 0, 0, kiwi.size * 0.8);
        haze.addColorStop(0, "rgba(58, 38, 18, 0.45)");
        haze.addColorStop(1, "rgba(58, 38, 18, 0)");
        ctx.fillStyle = haze;
        ctx.beginPath();
        ctx.arc(0, 0, kiwi.size * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.rotate(kiwi.rotation);

      if (sprite) {
        const half = kiwi.size / 2;
        ctx.drawImage(sprite, -half, -half, kiwi.size, kiwi.size);
      } else {
        // Sprite still loading — a plain disc keeps the round playable.
        ctx.fillStyle = rotten
          ? ROT_BROWN
          : kiwi.kind === "golden"
            ? GOLD
            : BRAND_GREEN;
        ctx.beginPath();
        ctx.arc(0, 0, kiwi.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    };

    const drawScorePops = (now: number) => {
      for (const pop of scorePops) {
        const t = Math.min(1, (now - pop.startedAt) / SCORE_POP_MS);
        const gained = pop.value > 0;

        ctx.save();
        ctx.globalAlpha = 1 - t;
        ctx.fillStyle = gained ? DEEP_GREEN : PENALTY_RED;
        ctx.font = "700 15px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
          `${gained ? "+" : ""}${pop.value}`,
          pop.x,
          pop.y - 26 * t,
        );
        ctx.restore();
      }

      ctx.globalAlpha = 1;
    };

    const draw = (now: number, showCountdown: boolean) => {
      ctx.clearRect(0, 0, width, height);

      const backdrop = ctx.createLinearGradient(0, 0, 0, height);
      backdrop.addColorStop(0, "#ffffff");
      backdrop.addColorStop(1, "#f3f7e6");
      ctx.fillStyle = backdrop;
      ctx.fillRect(0, 0, width, height);

      for (const kiwi of kiwis) {
        drawKiwiAt(kiwi);
      }

      drawScorePops(now);

      // Basket redrawn from drawStage's pieces so play and idle frames match.
      const left = basketX - BASKET_WIDTH / 2;
      const top = height - BASKET_BOTTOM_GAP - BASKET_HEIGHT;

      ctx.save();
      roundedRectPath(ctx, left, top, BASKET_WIDTH, BASKET_HEIGHT, 9);
      ctx.fillStyle = BRAND_GREEN;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.strokeStyle = "rgba(20, 24, 17, 0.28)";
      ctx.lineWidth = 1.5;

      for (let i = 1; i < 4; i += 1) {
        const x = left + (BASKET_WIDTH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(x, top + 3);
        ctx.lineTo(x, top + BASKET_HEIGHT - 3);
        ctx.stroke();
      }

      ctx.restore();

      if (showCountdown) {
        ctx.save();
        ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = INK;
        ctx.textAlign = "center";
        ctx.font = "700 15px system-ui, sans-serif";
        ctx.fillText(
          "Catch the kiwis — dodge the rotten ones",
          width / 2,
          height / 2 - 34,
        );
        ctx.font = "700 52px system-ui, sans-serif";
        ctx.fillText(
          String(Math.max(1, Math.ceil((COUNTDOWN_MS - (now - startedAt)) / 1000))),
          width / 2,
          height / 2 + 22,
        );
        ctx.restore();
      }
    };

    const frame = (now: number) => {
      const delta = Math.min(48, now - lastFrame);
      lastFrame = now;

      const sinceStart = now - startedAt;
      const playing = sinceStart >= COUNTDOWN_MS;
      const playElapsed = sinceStart - COUNTDOWN_MS;

      if (playing && playElapsed >= ROUND_MS) {
        draw(now, false);
        finish();

        return;
      }

      if (playing) {
        const progress = Math.min(1, playElapsed / ROUND_MS);
        const interval =
          SPAWN_START_MS + (SPAWN_END_MS - SPAWN_START_MS) * progress;

        spawnAccumulator += delta;

        if (spawnAccumulator >= interval) {
          spawnAccumulator = 0;
          spawn();
        }

        for (let i = kiwis.length - 1; i >= 0; i -= 1) {
          const kiwi = kiwis[i];

          kiwi.previousY = kiwi.y;
          kiwi.y += kiwi.speed * delta;
          kiwi.rotation += kiwi.spin * delta;

          const crossedCatchLine =
            kiwi.previousY < catchLineY && kiwi.y >= catchLineY;
          const withinBasket =
            Math.abs(kiwi.x - basketX) <= BASKET_WIDTH / 2 + kiwi.size * 0.3;

          if (crossedCatchLine && withinBasket) {
            const value =
              kiwi.kind === "golden"
                ? GOLDEN_POINTS
                : kiwi.kind === "rotten"
                  ? ROTTEN_POINTS
                  : 1;

            // Floored at zero: a negative score reads as punishment, and the
            // round has to feel winnable right up to the buzzer.
            currentScore = Math.max(0, currentScore + value);

            // The win banks the moment the target is crossed — the rest of
            // the round is bonus play. The score can dip below the target
            // afterwards (rotten kiwis), but a banked win stays banked.
            if (!banked && currentScore >= TARGET_SCORE) {
              banked = true;
              onTargetReachedRef.current();
            }

            scorePops.push({
              x: kiwi.x,
              y: catchLineY,
              value,
              startedAt: now,
            });
            kiwis.splice(i, 1);
            continue;
          }

          if (kiwi.y - kiwi.size > height) {
            kiwis.splice(i, 1);
          }
        }

        for (let i = scorePops.length - 1; i >= 0; i -= 1) {
          if (now - scorePops[i].startedAt > SCORE_POP_MS) {
            scorePops.splice(i, 1);
          }
        }
      }

      draw(now, !playing);

      // Throttled so the React HUD doesn't re-render every frame.
      hudAccumulator += delta;

      if (hudAccumulator >= 100) {
        hudAccumulator = 0;
        setHud({
          score: currentScore,
          remainingMs: playing ? Math.max(0, ROUND_MS - playElapsed) : ROUND_MS,
          countdownSeconds: playing
            ? 0
            : Math.max(1, Math.ceil((COUNTDOWN_MS - sinceStart) / 1000)),
          banked,
        });
      }

      raf = window.requestAnimationFrame(frame);
    };

    raf = window.requestAnimationFrame(frame);

    const pointerX = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();

      return event.clientX - bounds.left;
    };

    const movePointer = (event: PointerEvent) => {
      event.preventDefault();
      basketX = Math.min(
        width - BASKET_WIDTH / 2,
        Math.max(BASKET_WIDTH / 2, pointerX(event)),
      );
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }

      event.preventDefault();
      const direction = event.key === "ArrowLeft" ? -1 : 1;
      basketX = Math.min(
        width - BASKET_WIDTH / 2,
        Math.max(BASKET_WIDTH / 2, basketX + direction * KEYBOARD_STEP),
      );
    };

    const onResize = () => applySize();

    canvas.addEventListener("pointermove", movePointer);
    canvas.addEventListener("pointerdown", movePointer);
    canvas.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);

    return () => {
      canvas.removeEventListener("pointermove", movePointer);
      canvas.removeEventListener("pointerdown", movePointer);
      canvas.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
      finishEarlyRef.current = null;

      if (raf !== null) {
        window.cancelAnimationFrame(raf);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  const progress = Math.min(100, (hud.score / TARGET_SCORE) * 100);
  const secondsLeft = Math.ceil(hud.remainingMs / 1000);
  const isCountingIn = hud.countdownSeconds > 0;
  const isRunning = phase.kind === "running";
  const won = phase.kind === "done" && phase.result.won;

  return (
    <div ref={wrapRef} className="w-full">
      <div className="flex items-center justify-between gap-3 text-sm font-semibold">
        <span className="tabular-nums">
          {hud.score}
          <span className="text-black/40"> / {TARGET_SCORE} kiwis</span>
        </span>
        {hud.banked && isRunning ? (
          <span className="rounded-full bg-kiwi-green px-2.5 py-0.5 text-xs font-bold">
            ✓ Free month won
          </span>
        ) : null}
        <span
          className={`tabular-nums ${
            isRunning && !isCountingIn && secondsLeft <= 10 && !hud.banked
              ? "text-[#B4451F]"
              : "text-black/40"
          }`}
        >
          {!isRunning
            ? `${Math.ceil(ROUND_MS / 1000)}s`
            : isCountingIn
              ? `Starts in ${hud.countdownSeconds}s`
              : `${secondsLeft}s left`}
        </span>
      </div>

      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={TARGET_SCORE}
        aria-valuenow={hud.score}
        aria-label="Kiwis caught"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-150 ${
            hud.banked ? "bg-[#F2C14E]" : "bg-kiwi-green"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="relative mt-3">
        <canvas
          ref={canvasRef}
          tabIndex={0}
          role="application"
          aria-label="Kiwi Catch — move the punnet to catch falling kiwis and avoid the rotten brown ones"
          className={`w-full rounded-2xl border border-black/10 outline-none focus-visible:ring-2 focus-visible:ring-kiwi-green ${
            isRunning ? "cursor-none" : ""
          }`}
          style={{ touchAction: "none" }}
        />

        {phase.kind === "ready" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-white/80 p-6 text-center backdrop-blur-[2px]">
            <h2 className="font-fraunces text-[clamp(1.25rem,4.5vw,1.7rem)] font-semibold leading-tight tracking-tight">
              Win your first month free
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-black/60">
              Catch {TARGET_SCORE} kiwis in {Math.ceil(ROUND_MS / 1000)} seconds.
              Golden ones count double — dodge the rotten brown ones.
            </p>
            <button
              type="button"
              onClick={() => void play()}
              disabled={isStarting}
              className="mt-5 rounded-full bg-kiwi-green px-8 py-3 text-sm font-bold transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isStarting ? "Getting the punnet…" : "Play"}
            </button>
          </div>
        ) : null}

        {phase.kind === "done" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-white/85 p-6 text-center backdrop-blur-[2px]">
            {won ? (
              <>
                <h2 className="font-fraunces text-[clamp(1.25rem,4.5vw,1.7rem)] font-semibold leading-tight tracking-tight">
                  You won a free month 🥝
                </h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-black/60">
                  {phase.result.score} kiwis caught.{" "}
                  {winSaveState === "saving"
                    ? "Locking in your free month…"
                    : winSaveState === "error"
                      ? "We couldn't confirm it just now — try again below."
                      : "Your first month of Kiwi Pro is saved to this website — save your site to lock it in."}
                </p>
                {winSaveState === "error" ? (
                  <button
                    type="button"
                    onClick={onRetrySave}
                    className="mt-5 rounded-full border border-black/15 bg-white px-6 py-3 text-sm font-semibold transition hover:border-black/30"
                  >
                    Try saving your free month again
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onBack}
                    className="mt-5 rounded-full bg-kiwi-green px-8 py-3 text-sm font-bold transition hover:brightness-95"
                  >
                    Back to your build
                  </button>
                )}
              </>
            ) : (
              <>
                <h2 className="font-fraunces text-[clamp(1.25rem,4.5vw,1.7rem)] font-semibold leading-tight tracking-tight">
                  So close — {phase.result.score} of {TARGET_SCORE}
                </h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-black/60">
                  Another go? The offer stands until your website is ready.
                </p>
                <div className="mt-5 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => void play()}
                    disabled={isStarting}
                    className="rounded-full bg-kiwi-green px-8 py-3 text-sm font-bold transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isStarting ? "Getting the punnet…" : "Play again"}
                  </button>
                  <button
                    type="button"
                    onClick={onBack}
                    className="text-sm font-semibold text-black/45 underline decoration-black/20 underline-offset-4 transition hover:text-black"
                  >
                    Back to build
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-xs text-black/45">
          {hud.banked && isRunning
            ? "Free month banked — bonus kiwis until the buzzer."
            : isRunning
              ? "Drag or move your mouse to slide the punnet."
              : "Golden kiwis are worth two, rotten brown ones cost you one."}
        </p>
        {hud.banked && isRunning ? (
          <button
            type="button"
            onClick={() => finishEarlyRef.current?.()}
            className="shrink-0 text-xs font-bold text-black underline decoration-black/25 underline-offset-2 transition hover:decoration-black"
          >
            Collect →
          </button>
        ) : null}
      </div>
    </div>
  );
}
