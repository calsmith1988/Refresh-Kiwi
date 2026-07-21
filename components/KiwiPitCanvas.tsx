"use client";

import Matter from "matter-js";
import { useEffect, useRef } from "react";

import { createWorld, resetWorld, resizeWorld } from "@/lib/kiwi-pit/createWorld";
import {
  drawKiwi,
  drawPoppingKiwi,
  updateFillProgress,
} from "@/lib/kiwi-pit/drawKiwi";
import { prepareSprite } from "@/lib/kiwi-pit/prepareSprite";
import type { KiwiSprite } from "@/lib/kiwi-pit/prepareSprite";
import { setupLandingDetection } from "@/lib/kiwi-pit/landing";
import {
  finishCompletedPops,
  popsNeededThisTick,
  startPops,
} from "@/lib/kiwi-pit/popKiwi";
import { spawnKiwi } from "@/lib/kiwi-pit/spawnKiwi";
import {
  createDefaultMeta,
  KIWI_FOOTPRINT_PX,
  MAX_BODIES_CAP_DESKTOP,
  MAX_BODIES_CAP_MOBILE,
  PILE_FILL_TARGET_MS,
  SPAWN_INTERVAL_MS,
  type KiwiPitWorld,
} from "@/lib/kiwi-pit/types";

const KIWI_SPRITE_PATH = "/assets/kiwi-slice-v2.png";

interface KiwiPitCanvasProps {
  active: boolean;
  onComplete?: () => void;
  /** When omitted, the animation runs until `active` becomes false. */
  durationMs?: number;
}

function getMaxBodies() {
  if (typeof window === "undefined") {
    return MAX_BODIES_CAP_DESKTOP;
  }

  // Size the pile to the viewport so kiwis can stack all the way to the top
  // of the screen, capped for physics performance.
  const target = Math.ceil(
    (window.innerWidth * window.innerHeight) / KIWI_FOOTPRINT_PX,
  );
  const cap =
    window.innerWidth < 768 ? MAX_BODIES_CAP_MOBILE : MAX_BODIES_CAP_DESKTOP;

  return Math.min(target, cap);
}

function getSpawnPerTick(maxBodies: number) {
  // Spawn enough kiwis per tick that the pile reaches the top in roughly
  // PILE_FILL_TARGET_MS regardless of screen size.
  const ticks = PILE_FILL_TARGET_MS / SPAWN_INTERVAL_MS;

  return Math.max(1, Math.ceil(maxBodies / ticks));
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function KiwiPitCanvas({
  active,
  onComplete,
  durationMs,
}: KiwiPitCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<KiwiPitWorld | null>(null);
  const spriteRef = useRef<KiwiSprite | null>(null);
  const activeRef = useRef(active);
  const rafRef = useRef<number | null>(null);
  const spawnTimerRef = useRef<number | null>(null);
  const completeTimerRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);

  activeRef.current = active;
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const image = new Image();
    image.src = KIWI_SPRITE_PATH;
    image.onload = () => {
      spriteRef.current = prepareSprite(image);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const setCanvasSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (!worldRef.current) {
        worldRef.current = createWorld(width, height);
      } else {
        resizeWorld(worldRef.current, width, height);
      }
    };

    setCanvasSize();

    const now = () => performance.now();
    const teardownLanding = setupLandingDetection(worldRef.current!, now);

    const render = () => {
      const world = worldRef.current;
      const sprite = spriteRef.current;

      if (!world || !sprite) {
        rafRef.current = window.requestAnimationFrame(render);
        return;
      }

      Matter.Engine.update(world.engine, 1000 / 60);
      ctx.clearRect(0, 0, world.width, world.height);

      const timestamp = now();

      for (const body of world.bodies) {
        const meta = world.meta.get(body) ?? createDefaultMeta();
        updateFillProgress(meta, timestamp);
        world.meta.set(body, meta);
        drawKiwi(ctx, body, meta, sprite);
      }

      for (const entry of world.popping) {
        drawPoppingKiwi(ctx, entry, sprite, timestamp);
      }

      rafRef.current = window.requestAnimationFrame(render);
    };

    rafRef.current = window.requestAnimationFrame(render);

    const onResize = () => setCanvasSize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      teardownLanding();

      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const clearSpawnTimer = () => {
      if (spawnTimerRef.current !== null) {
        window.clearInterval(spawnTimerRef.current);
        spawnTimerRef.current = null;
      }
    };

    const clearCompleteTimer = () => {
      if (completeTimerRef.current !== null) {
        window.clearTimeout(completeTimerRef.current);
        completeTimerRef.current = null;
      }
    };

    if (!active || prefersReducedMotion()) {
      clearSpawnTimer();
      clearCompleteTimer();
      return;
    }

    const world = worldRef.current;
    if (world) {
      resetWorld(world);
    }

    const maxBodies = getMaxBodies();
    const spawnPerTick = getSpawnPerTick(maxBodies);

    spawnTimerRef.current = window.setInterval(() => {
      const currentWorld = worldRef.current;
      if (!currentWorld || !activeRef.current) {
        return;
      }

      const timestamp = performance.now();
      finishCompletedPops(currentWorld, timestamp);

      // Once the pile is near the top, pop bottom kiwis under "pressure" so
      // new ones can keep falling until the website preview is ready.
      const toPop = popsNeededThisTick(currentWorld, maxBodies, spawnPerTick);
      if (toPop > 0) {
        startPops(currentWorld, toPop, timestamp);
      }

      for (let i = 0; i < spawnPerTick; i += 1) {
        spawnKiwi(currentWorld, maxBodies);
      }
    }, SPAWN_INTERVAL_MS);

    if (durationMs !== undefined) {
      completeTimerRef.current = window.setTimeout(() => {
        clearSpawnTimer();
        onCompleteRef.current?.();
      }, durationMs);
    }

    return () => {
      clearSpawnTimer();
      clearCompleteTimer();
    };
  }, [active, durationMs]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 -z-10 transition-opacity duration-500 ${
        active ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}
