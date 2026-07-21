import Matter from "matter-js";

import {
  createDefaultMeta,
  POP_BAND_RATIO,
  POP_DURATION_MS,
  POP_RATE_OF_SPAWN,
  POP_WAKE_RADIUS_MULT,
  PRESSURE_START_RATIO,
  type KiwiPitWorld,
} from "./types";

const { Sleeping, World } = Matter;

function releaseBody(world: KiwiPitWorld, body: Matter.Body) {
  Matter.Body.setPosition(body, { x: -500, y: -500 });
  Matter.Body.setVelocity(body, { x: 0, y: 0 });
  Matter.Body.setAngularVelocity(body, 0);
  Matter.Body.setAngle(body, 0);
  world.meta.set(body, createDefaultMeta());
  world.pool.push(body);
}

function wakeNeighbours(world: KiwiPitWorld, x: number, y: number, radius: number) {
  const wakeR2 = radius * radius;

  for (const body of world.bodies) {
    if (body.label !== "kiwi" || !body.isSleeping) {
      continue;
    }

    const dx = body.position.x - x;
    const dy = body.position.y - y;

    if (dx * dx + dy * dy <= wakeR2) {
      Sleeping.set(body, false);
    }
  }
}

/**
 * Pick landed kiwis from the bottom band of the pile. Weighted randomly so
 * pops don't march in a neat horizontal line.
 */
function selectPopTargets(world: KiwiPitWorld, count: number): Matter.Body[] {
  if (count <= 0 || world.bodies.length === 0) {
    return [];
  }

  let minY = Infinity;
  let maxY = -Infinity;

  for (const body of world.bodies) {
    if (body.label !== "kiwi") {
      continue;
    }

    const meta = world.meta.get(body);
    if (!meta?.landed || meta.popping) {
      continue;
    }

    minY = Math.min(minY, body.position.y);
    maxY = Math.max(maxY, body.position.y);
  }

  if (!Number.isFinite(minY) || !Number.isFinite(maxY)) {
    return [];
  }

  const pileHeight = Math.max(maxY - minY, 1);
  const bandTop = maxY - pileHeight * POP_BAND_RATIO;

  const candidates: Matter.Body[] = [];

  for (const body of world.bodies) {
    if (body.label !== "kiwi") {
      continue;
    }

    const meta = world.meta.get(body);
    if (!meta?.landed || meta.popping) {
      continue;
    }

    if (body.position.y >= bandTop) {
      candidates.push(body);
    }
  }

  if (candidates.length === 0) {
    return [];
  }

  // Prefer lower kiwis, with enough randomness to look organic.
  candidates.sort((a, b) => {
    const depthBias = b.position.y - a.position.y;
    return depthBias + (Math.random() - 0.5) * pileHeight * 0.35;
  });

  return candidates.slice(0, Math.min(count, candidates.length));
}

/**
 * Start popping `count` bottom-band kiwis: remove them from physics immediately
 * so the pile can settle, keep a visual for the burst animation, and wake
 * sleeping neighbours so nothing hangs in mid-air.
 */
export function startPops(world: KiwiPitWorld, count: number, now: number): number {
  const targets = selectPopTargets(world, count);

  for (const body of targets) {
    const meta = world.meta.get(body) ?? createDefaultMeta();
    meta.popping = true;
    meta.popStartTime = now;
    world.meta.set(body, meta);

    const x = body.position.x;
    const y = body.position.y;
    const angle = body.angle;
    const radius = (body.circleRadius ?? 12.5) * POP_WAKE_RADIUS_MULT;

    World.remove(world.engine.world, body);
    world.bodies = world.bodies.filter((entry) => entry !== body);

    wakeNeighbours(world, x, y, radius);

    world.popping.push({ body, meta, x, y, angle });
  }

  return targets.length;
}

/** Finish any pop animations whose duration has elapsed and return bodies to the pool. */
export function finishCompletedPops(world: KiwiPitWorld, now: number): number {
  if (world.popping.length === 0) {
    return 0;
  }

  let finished = 0;
  const remaining = [];

  for (const entry of world.popping) {
    const started = entry.meta.popStartTime ?? now;
    if (now - started >= POP_DURATION_MS) {
      releaseBody(world, entry.body);
      finished += 1;
    } else {
      remaining.push(entry);
    }
  }

  world.popping = remaining;
  return finished;
}

/**
 * How many kiwis to pop this tick given the current pile fill and spawn rate.
 * Slightly under spawn rate until full, then matches spawn so the fountain can
 * keep running indefinitely.
 */
export function popsNeededThisTick(
  world: KiwiPitWorld,
  maxBodies: number,
  spawnPerTick: number,
): number {
  if (maxBodies <= 0 || spawnPerTick <= 0) {
    return 0;
  }

  const fill = world.bodies.length / maxBodies;

  if (fill < PRESSURE_START_RATIO) {
    return 0;
  }

  if (world.bodies.length >= maxBodies) {
    return Math.max(1, spawnPerTick);
  }

  // Ramp from POP_RATE_OF_SPAWN toward 1.0 as we approach capacity.
  const pressureT =
    (fill - PRESSURE_START_RATIO) / Math.max(1 - PRESSURE_START_RATIO, 0.001);
  const rate = POP_RATE_OF_SPAWN + (1 - POP_RATE_OF_SPAWN) * Math.min(1, pressureT);

  return Math.max(1, Math.ceil(spawnPerTick * rate));
}
