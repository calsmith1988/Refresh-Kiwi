import type { Body, Engine } from "matter-js";

export const KIWI_RADIUS = 12.5;
export const KIWI_DISPLAY_SIZE = 25;
/** Per-kiwi size variation. 1.0 keeps the current size; never shrinks below it. */
export const KIWI_MIN_SCALE = 1.0;
export const KIWI_MAX_SCALE = 1.4;
export const FILL_DURATION_MS = 300;
export const DEMO_DURATION_MS = 120_000;
export const SPAWN_INTERVAL_MS = 70;
export const MAX_BODIES_DESKTOP = 600;
export const MAX_BODIES_MOBILE = 300;
export const LANDING_SPEED_THRESHOLD = 1.5;

export interface KiwiMeta {
  landed: boolean;
  greenColor: string;
  fillProgress: number;
  fillStartTime: number | null;
  tintedSprite: HTMLCanvasElement | null;
  scale: number;
}

export interface KiwiPitWorld {
  engine: Engine;
  floor: Body;
  leftWall: Body;
  rightWall: Body;
  bodies: Body[];
  pool: Body[];
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
  };
}
