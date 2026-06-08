import Matter from "matter-js";

import {
  createDefaultMeta,
  KIWI_MAX_SCALE,
  KIWI_MIN_SCALE,
  KIWI_RADIUS,
  type KiwiPitWorld,
} from "./types";

const { Bodies, Body, World } = Matter;

/** Tracks the geometric scale currently applied to each (pooled) body. */
const bodyScale = new WeakMap<Matter.Body, number>();

function pickScale(): number {
  // Bias toward the base size so only some kiwis are noticeably larger.
  const t = Math.pow(Math.random(), 1.6);
  return KIWI_MIN_SCALE + t * (KIWI_MAX_SCALE - KIWI_MIN_SCALE);
}

function createKiwiBody(x: number, scale: number): Matter.Body {
  return Bodies.circle(x, -KIWI_RADIUS * 2 * scale, KIWI_RADIUS * scale, {
    label: "kiwi",
    restitution: 0.12,
    friction: 0.75,
    frictionAir: 0.035,
    slop: 0.02,
    density: 0.002,
  });
}

function acquireBody(world: KiwiPitWorld, x: number): Matter.Body {
  const scale = pickScale();
  const pooled = world.pool.pop();

  if (pooled) {
    const prevScale = bodyScale.get(pooled) ?? 1;
    if (Math.abs(prevScale - scale) > 0.001) {
      const factor = scale / prevScale;
      Body.scale(pooled, factor, factor);
    }
    bodyScale.set(pooled, scale);

    pooled.isSleeping = false;
    Body.setPosition(pooled, { x, y: -KIWI_RADIUS * 2 * scale });
    Body.setVelocity(pooled, { x: 0, y: 0 });
    Body.setAngularVelocity(pooled, (Math.random() - 0.5) * 0.12);
    Body.setAngle(pooled, Math.random() * Math.PI * 2);

    const meta = createDefaultMeta();
    meta.scale = scale;
    world.meta.set(pooled, meta);
    return pooled;
  }

  const body = createKiwiBody(x, scale);
  bodyScale.set(body, scale);

  const meta = createDefaultMeta();
  meta.scale = scale;
  world.meta.set(body, meta);
  return body;
}

export function spawnKiwi(
  world: KiwiPitWorld,
  maxBodies: number,
): Matter.Body | null {
  if (world.bodies.length >= maxBodies) {
    return null;
  }

  const padding = KIWI_RADIUS * KIWI_MAX_SCALE * 2;
  const x =
    padding + Math.random() * Math.max(world.width - padding * 2, padding);

  const body = acquireBody(world, x);
  World.add(world.engine.world, body);
  world.bodies.push(body);

  return body;
}
