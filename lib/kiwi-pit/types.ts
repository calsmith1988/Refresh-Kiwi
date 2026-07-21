import type { Body, Engine } from "matter-js";

export const KIWI_RADIUS = 12.5;
export const KIWI_DISPLAY_SIZE = 25;
/**
 * Render-only overdraw. The sprite PNG has transparent padding, so the visible
 * kiwi is smaller than its physics circle and rested kiwis look gappy. Drawing
 * slightly larger than the collision diameter closes the gap without touching
 * the physics bodies.
 */
export const KIWI_SPRITE_SCALE = 1.22;
/** Per-kiwi size variation. 1.0 keeps the current size; never shrinks below it. */
export const KIWI_MIN_SCALE = 1.0;
export const KIWI_MAX_SCALE = 1.4;
export const FILL_DURATION_MS = 300;
export const DEMO_DURATION_MS = 120_000;
export const SPAWN_INTERVAL_MS = 70;
/**
 * Approx. screen pixels each settled kiwi occupies (disc area / packing
 * density). Used to size the pile to the viewport so it can fill the whole
 * screen instead of stopping partway up.
 */
export const KIWI_FOOTPRINT_PX = 800;
/** Hard safety caps so huge monitors don't melt the physics engine. */
export const MAX_BODIES_CAP_DESKTOP = 2600;
export const MAX_BODIES_CAP_MOBILE = 1000;
/** Target time for the pile to reach the top of the viewport. */
export const PILE_FILL_TARGET_MS = 100_000;
export const LANDING_SPEED_THRESHOLD = 1.5;

/**
 * Pressure only starts once the top of the landed pile has reached this
 * fraction of the viewport height (0 = top of screen). Body-count alone was
 * too early and made pops start mid-screen.
 */
export const PRESSURE_TOP_Y_RATIO = 0.14;
/** Still require this fraction of capacity so a sparse tall stack doesn't pop. */
export const PRESSURE_MIN_FILL_RATIO = 0.72;
/**
 * Pop slower than spawn so upper kiwis have time to fall into gaps — otherwise
 * the bottom hollows out and the pop front marches upward.
 */
export const POP_RATE_OF_SPAWN = 0.45;
/** Only landed kiwis in the bottom this fraction of the *viewport* may splat. */
export const POP_FLOOR_BAND_RATIO = 0.14;
/** How long the squash → splat → fade animation lasts. */
export const POP_DURATION_MS = 380;
/** Wake sleeping neighbours within this multiple of the popped kiwi's radius. */
export const POP_WAKE_RADIUS_MULT = 3.6;
/** Cap simultaneous mid-splat visuals so the bottom never empties out. */
export const MAX_CONCURRENT_POPS = 6;

export interface KiwiMeta {
  landed: boolean;
  greenColor: string;
  fillProgress: number;
  fillStartTime: number | null;
  tintedSprite: HTMLCanvasElement | null;
  scale: number;
  /** True while the squash/burst animation is playing (body already removed). */
  popping: boolean;
  popStartTime: number | null;
}

/** Detached visual for a kiwi that has left the physics world mid-pop. */
export interface PoppingKiwi {
  body: Body;
  meta: KiwiMeta;
  x: number;
  y: number;
  angle: number;
}

export interface KiwiPitWorld {
  engine: Engine;
  floor: Body;
  leftWall: Body;
  rightWall: Body;
  bodies: Body[];
  pool: Body[];
  /** Bodies mid-pop animation — drawn but not in the Matter world. */
  popping: PoppingKiwi[];
  meta: WeakMap<Body, KiwiMeta>;
  width: number;
  height: number;
}

export function createDefaultMeta(): KiwiMeta {
  return {
    landed: false,
    greenColor: "",
    fillProgress: 0,
    fillStartTime: null,
    tintedSprite: null,
    scale: 1,
    popping: false,
    popStartTime: null,
  };
}
