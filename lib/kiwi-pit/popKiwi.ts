import Matter from "matter-js";

import {
  createDefaultMeta,
  MAX_CONCURRENT_POPS,
  POP_DURATION_MS,
  POP_FLOOR_BAND_RATIO,
  POP_RATE_OF_SPAWN,
  POP_WAKE_RADIUS_MULT,
  PRESSURE_MIN_FILL_RATIO,
  PRESSURE_TOP_MIN_COUNT,
  PRESSURE_TOP_Y_RATIO,
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

/**
 * Wake immediate neighbours AND the full column of kiwis above the popped
 * one. Sleeping bodies don't notice their support vanishing, so without the
 * column wake the stack hangs in mid-air over a white gap instead of falling.
 */
function wakeAbove(world: KiwiPitWorld, x: number, y: number, radius: number) {
  const wakeR2 = radius * radius;
  const columnHalfWidth = radius;

  for (const body of world.bodies) {
    if (body.label !== "kiwi" || !body.isSleeping) {
      continue;
    }

    const dx = body.position.x - x;
    const dy = body.position.y - y;

    // Near the pop itself, in any direction.
    if (dx * dx + dy * dy <= wakeR2) {
      Sleeping.set(body, false);
      continue;
    }

    // Anywhere in the column above — these are the ones that must fall.
    if (body.position.y < y && Math.abs(dx) <= columnHalfWidth) {
      Sleeping.set(body, false);
    }
  }
}

/**
 * True once the landed pile has genuinely stacked to the top of the viewport.
 * Requires several landed kiwis near the top so a single stray body (e.g. one
 * marked landed mid-fall) can't trigger pressure while the screen is 75% full.
 */
export function pileReachesTop(world: KiwiPitWorld): boolean {
  const topLine = world.height * PRESSURE_TOP_Y_RATIO;
  let landedNearTop = 0;

  for (const body of world.bodies) {
    if (body.label !== "kiwi") {
      continue;
    }

    const meta = world.meta.get(body);
    if (!meta?.landed || meta.popping) {
      continue;
    }

    if (body.position.y <= topLine) {
      landedNearTop += 1;

      if (landedNearTop >= PRESSURE_TOP_MIN_COUNT) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Pick landed kiwis from an absolute band near the floor — never relative to
 * the pile height, so pops can't climb mid-screen as the bottom empties.
 */
function selectPopTargets(world: KiwiPitWorld, count: number): Matter.Body[] {
  if (count <= 0 || world.bodies.length === 0) {
    return [];
  }

  const bandTop = world.height * (1 - POP_FLOOR_BAND_RATIO);
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

  // Prefer lower kiwis, with light randomness so they don't vanish in a row.
  const bandHeight = Math.max(world.height - bandTop, 1);
  candidates.sort((a, b) => {
    const depthBias = b.position.y - a.position.y;
    return depthBias + (Math.random() - 0.5) * bandHeight * 0.4;
  });

  return candidates.slice(0, Math.min(count, candidates.length));
}

/**
 * Start splatting `count` floor-band kiwis: remove them from physics so the
 * pile can settle, keep a visual for the splat, and wake sleeping neighbours.
 */
export function startPops(world: KiwiPitWorld, count: number, now: number): number {
  const room = Math.max(0, MAX_CONCURRENT_POPS - world.popping.length);
  const targets = selectPopTargets(world, Math.min(count, room));

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

    wakeAbove(world, x, y, radius);

    world.popping.push({ body, meta, x, y, angle });
  }

  return targets.length;
}

/** Finish any splat animations whose duration has elapsed and return bodies to the pool. */
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
 * How many floor-band kiwis to splat this tick. Pressure engages when the
 * pile visually reaches the top of the screen, OR when the world hits its
 * body cap (on large screens the cap is reached before the pile can stack to
 * the top — without this the animation would deadlock frozen mid-screen).
 * Pops run slower than spawn so the stack keeps falling into the gaps.
 */
export function popsNeededThisTick(
  world: KiwiPitWorld,
  maxBodies: number,
  spawnPerTick: number,
): number {
  if (maxBodies <= 0 || spawnPerTick <= 0) {
    return 0;
  }

  const atCapacity = world.bodies.length >= maxBodies;
  const fill = world.bodies.length / maxBodies;
  const underPressure =
    atCapacity || (fill >= PRESSURE_MIN_FILL_RATIO && pileReachesTop(world));

  if (!underPressure) {
    return 0;
  }

  // Cap concurrent splats so we never hollow the floor band out.
  const room = Math.max(0, MAX_CONCURRENT_POPS - world.popping.length);
  if (room === 0) {
    return 0;
  }

  if (atCapacity) {
    // Need slots for new spawns, but only clear a couple at a time so the
    // layer above has time to drop into place.
    return Math.min(room, Math.max(1, Math.ceil(spawnPerTick * 0.6)));
  }

  return Math.min(room, Math.max(1, Math.ceil(spawnPerTick * POP_RATE_OF_SPAWN)));
}
