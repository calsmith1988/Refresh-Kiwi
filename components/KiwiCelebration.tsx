"use client";

import { useEffect, useRef } from "react";

// Same green brand mark as the hero background kiwis — not the grey pit slice.
const KIWI_SPRITE_PATH = "/refresh-kiwi-favicon-v2.png";

// Brand palette: kiwi greens, ink, white, and the warm accent.
const CONFETTI_COLORS = ["#c5e66a", "#8bbf4d", "#141811", "#ffffff", "#f6c453"];

const GRAVITY_KIWI = 2400;
const GRAVITY_CONFETTI = 1100;
const CONFETTI_DRAG = 1.4;
const CONFETTI_PER_KIWI = 34;
const MAX_DURATION_MS = 5000;

type FallingKiwi = {
  x: number;
  y: number;
  vy: number;
  size: number;
  rotation: number;
  spin: number;
  /** Screen y where this kiwi bursts. */
  popY: number;
  /** Delay before it starts falling, seconds. */
  delay: number;
  popped: boolean;
};

type ConfettiPiece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  spin: number;
  color: string;
  shape: "rect" | "circle";
  age: number;
  lifetime: number;
};

function random(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function spawnKiwis(width: number, height: number): FallingKiwi[] {
  const count = Math.max(4, Math.min(7, Math.floor(width / 200)));
  const lane = width / count;

  return Array.from({ length: count }, (_, i) => {
    const size = random(64, 112);
    return {
      // One kiwi per horizontal lane so they spread across the screen.
      x: lane * i + random(lane * 0.25, lane * 0.75),
      y: -size,
      vy: random(60, 240),
      size,
      rotation: random(0, Math.PI * 2),
      spin: random(-3.4, 3.4),
      popY: height * random(0.28, 0.62),
      delay: random(0, 0.85),
      popped: false,
    };
  });
}

function burstConfetti(kiwi: FallingKiwi): ConfettiPiece[] {
  return Array.from({ length: CONFETTI_PER_KIWI }, () => {
    const angle = random(0, Math.PI * 2);
    // Bias the burst upward so pieces arc before fluttering down.
    const speed = random(160, 620);

    return {
      x: kiwi.x,
      y: kiwi.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - random(120, 320),
      size: random(5, 11),
      rotation: random(0, Math.PI * 2),
      spin: random(-9, 9),
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      shape: Math.random() < 0.7 ? ("rect" as const) : ("circle" as const),
      age: 0,
      lifetime: random(1.1, 1.9),
    };
  });
}

export default function KiwiCelebration({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onDoneRef = useRef(onDone);

  onDoneRef.current = onDone;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const timer = window.setTimeout(() => onDoneRef.current(), 0);
      return () => window.clearTimeout(timer);
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) {
      return;
    }

    let width = window.innerWidth;
    let height = window.innerHeight;

    const setCanvasSize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    setCanvasSize();
    window.addEventListener("resize", setCanvasSize);

    let sprite: HTMLImageElement | null = null;
    const image = new Image();
    image.src = KIWI_SPRITE_PATH;
    image.onload = () => {
      sprite = image;
    };

    const kiwis = spawnKiwis(width, height);
    const confetti: ConfettiPiece[] = [];

    let rafId: number | null = null;
    let lastTime = performance.now();
    const startedAt = lastTime;
    let finished = false;

    const finish = () => {
      if (finished) {
        return;
      }
      finished = true;
      onDoneRef.current();
    };

    const render = (time: number) => {
      // Clamp dt so a background-tab pause doesn't teleport everything.
      const dt = Math.min((time - lastTime) / 1000, 1 / 30);
      lastTime = time;
      const elapsed = (time - startedAt) / 1000;

      ctx.clearRect(0, 0, width, height);

      let alive = false;

      for (const kiwi of kiwis) {
        if (kiwi.popped || elapsed < kiwi.delay) {
          if (!kiwi.popped) {
            alive = true;
          }
          continue;
        }

        kiwi.vy += GRAVITY_KIWI * dt;
        kiwi.y += kiwi.vy * dt;
        kiwi.rotation += kiwi.spin * dt;

        if (kiwi.y >= kiwi.popY) {
          kiwi.popped = true;
          confetti.push(...burstConfetti(kiwi));
          continue;
        }

        alive = true;

        if (sprite) {
          ctx.save();
          ctx.translate(kiwi.x, kiwi.y);
          ctx.rotate(kiwi.rotation);
          ctx.drawImage(
            sprite,
            -kiwi.size / 2,
            -kiwi.size / 2,
            kiwi.size,
            kiwi.size,
          );
          ctx.restore();
        }
      }

      for (const piece of confetti) {
        piece.age += dt;
        if (piece.age >= piece.lifetime) {
          continue;
        }

        alive = true;
        const drag = Math.max(0, 1 - CONFETTI_DRAG * dt);
        piece.vx *= drag;
        piece.vy = piece.vy * drag + GRAVITY_CONFETTI * dt;
        piece.x += piece.vx * dt;
        piece.y += piece.vy * dt;
        piece.rotation += piece.spin * dt;

        // Fade out over the last 0.4s of each piece's life.
        const remaining = piece.lifetime - piece.age;
        ctx.globalAlpha = Math.min(1, remaining / 0.4);
        ctx.fillStyle = piece.color;
        ctx.save();
        ctx.translate(piece.x, piece.y);
        ctx.rotate(piece.rotation);

        if (piece.shape === "rect") {
          ctx.fillRect(
            -piece.size / 2,
            -piece.size / 4,
            piece.size,
            piece.size / 2,
          );
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, piece.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
        ctx.globalAlpha = 1;
      }

      if (!alive || time - startedAt > MAX_DURATION_MS) {
        finish();
        return;
      }

      rafId = window.requestAnimationFrame(render);
    };

    rafId = window.requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", setCanvasSize);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[90]"
    />
  );
}
