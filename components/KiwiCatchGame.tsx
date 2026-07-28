"use client";

import { useEffect, useRef, useState } from "react";

import { prepareSprite } from "@/lib/kiwi-pit/prepareSprite";
import type { KiwiSprite } from "@/lib/kiwi-pit/prepareSprite";

const KIWI_SPRITE_PATH = "/assets/kiwi-slice-v2.png";

/**
 * The round is a fixed length and the win is only settled when the clock runs
 * out. That guarantees a minimum time investment (the whole point — the game
 * exists to make a 2-3 minute build disappear), and it keeps every round
 * comfortably past the server's minimum play time in lib/rewards/service.ts.
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
 * Spawn tightens across the round so it ends on a rush. Roughly 60+ kiwis fall
 * in 45s against a target of 25, so catching well under half still wins —
 * generous on purpose (this is a marketing giveaway, not a lottery).
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
const INK = "#141811";

export interface RoundResult {
  score: number;
  won: boolean;
}

interface FallingKiwi {
  x: number;
  y: number;
  previousY: number;
  /** Pixels per millisecond. */
  speed: number;
  size: number;
  rotation: number;
  spin: number;
  golden: boolean;
}

interface ScorePop {
  x: number;
  y: number;
  value: number;
  startedAt: number;
}

interface KiwiCatchGameProps {
  onRoundEnd: (result: RoundResult) => void;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
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

/**
 * Kiwi Catch. Deliberately not built on the matter-js kiwi pit: kinematic
 * falling gives exact control over fall time and spawn rate (so difficulty is
 * tunable) and makes catch detection a single line crossing test. It shares the
 * pit's sprite pipeline so it still looks like the rest of the site.
 */
export default function KiwiCatchGame({ onRoundEnd }: KiwiCatchGameProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spriteRef = useRef<KiwiSprite | null>(null);
  const onRoundEndRef = useRef(onRoundEnd);
  const [hud, setHud] = useState({
    score: 0,
    remainingMs: ROUND_MS,
    countdownSeconds: Math.ceil(COUNTDOWN_MS / 1000),
  });

  onRoundEndRef.current = onRoundEnd;

  useEffect(() => {
    const image = new Image();
    image.src = KIWI_SPRITE_PATH;
    image.onload = () => {
      spriteRef.current = prepareSprite(image);
    };
  }, []);

  useEffect(() => {
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
      const golden = Math.random() < GOLDEN_CHANCE;
      const size = golden ? GOLDEN_SIZE : KIWI_SIZE;
      const fallMs = reducedMotion
        ? REDUCED_MOTION_FALL_MS
        : golden
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
        golden,
      });
    };

    const finish = () => {
      if (finished) {
        return;
      }

      finished = true;
      setHud({ score: currentScore, remainingMs: 0, countdownSeconds: 0 });
      onRoundEndRef.current({
        score: currentScore,
        won: currentScore >= TARGET_SCORE,
      });
    };

    const drawKiwiAt = (kiwi: FallingKiwi) => {
      const sprite = spriteRef.current;

      ctx.save();
      ctx.translate(kiwi.x, kiwi.y);

      if (kiwi.golden) {
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, kiwi.size * 0.85);
        glow.addColorStop(0, "rgba(242, 193, 78, 0.55)");
        glow.addColorStop(1, "rgba(242, 193, 78, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, kiwi.size * 0.85, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.rotate(kiwi.rotation);

      if (sprite) {
        const half = kiwi.size / 2;
        ctx.drawImage(sprite, -half, -half, kiwi.size, kiwi.size);
      } else {
        // Sprite still loading — a plain disc keeps the round playable.
        ctx.fillStyle = kiwi.golden ? GOLD : BRAND_GREEN;
        ctx.beginPath();
        ctx.arc(0, 0, kiwi.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    };

    const drawBasket = () => {
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
    };

    const drawScorePops = (now: number) => {
      for (const pop of scorePops) {
        const t = Math.min(1, (now - pop.startedAt) / SCORE_POP_MS);

        ctx.save();
        ctx.globalAlpha = 1 - t;
        ctx.fillStyle = DEEP_GREEN;
        ctx.font = "700 15px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`+${pop.value}`, pop.x, pop.y - 26 * t);
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
      drawBasket();

      if (showCountdown) {
        ctx.save();
        ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = INK;
        ctx.textAlign = "center";
        ctx.font = "700 15px system-ui, sans-serif";
        ctx.fillText("Catch the kiwis in the punnet", width / 2, height / 2 - 34);
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
            currentScore += kiwi.golden ? GOLDEN_POINTS : 1;
            scorePops.push({
              x: kiwi.x,
              y: catchLineY,
              value: kiwi.golden ? GOLDEN_POINTS : 1,
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

      if (raf !== null) {
        window.cancelAnimationFrame(raf);
      }
    };
  }, []);

  const progress = Math.min(100, (hud.score / TARGET_SCORE) * 100);
  const reachedTarget = hud.score >= TARGET_SCORE;
  const secondsLeft = Math.ceil(hud.remainingMs / 1000);
  const isCountingIn = hud.countdownSeconds > 0;

  return (
    <div ref={wrapRef} className="w-full">
      <div className="flex items-center justify-between gap-3 text-sm font-semibold">
        <span className="tabular-nums">
          {hud.score}
          <span className="text-black/40"> / {TARGET_SCORE} kiwis</span>
        </span>
        <span
          className={`tabular-nums ${
            !isCountingIn && secondsLeft <= 10 ? "text-[#B4451F]" : "text-black/40"
          }`}
        >
          {isCountingIn
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
            reachedTarget ? "bg-[#6F9B24]" : "bg-kiwi-green"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="application"
        aria-label="Kiwi Catch — move the punnet to catch falling kiwis"
        className="mt-3 w-full cursor-none rounded-2xl border border-black/10 outline-none focus-visible:ring-2 focus-visible:ring-kiwi-green"
        style={{ touchAction: "none" }}
      />

      <p className="mt-2 text-xs text-black/45">
        {reachedTarget
          ? "Target reached — keep catching until the clock runs out."
          : "Drag or move your mouse to slide the punnet. Golden kiwis are worth two."}
      </p>
    </div>
  );
}
