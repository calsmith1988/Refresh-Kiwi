import type { Body } from "matter-js";

import type { KiwiSprite } from "./prepareSprite";
import {
  FILL_DURATION_MS,
  KIWI_DISPLAY_SIZE,
  KIWI_SPRITE_SCALE,
  POP_DURATION_MS,
  type KiwiMeta,
  type PoppingKiwi,
} from "./types";

export function updateFillProgress(meta: KiwiMeta, now: number) {
  if (!meta.landed || meta.fillStartTime === null || meta.fillProgress >= 1) {
    return;
  }

  const elapsed = now - meta.fillStartTime;
  meta.fillProgress = Math.min(1, elapsed / FILL_DURATION_MS);
}

function spriteSize(sprite: KiwiSprite): { w: number; h: number } {
  if (sprite instanceof HTMLCanvasElement) {
    return { w: sprite.width, h: sprite.height };
  }
  return { w: sprite.naturalWidth, h: sprite.naturalHeight };
}

/**
 * Builds a green-tinted copy of the sprite that keeps the kiwi detail
 * (seeds, core) and, crucially, respects the source alpha so colour never
 * spills into the transparent corners. The final `destination-in` pass
 * re-applies the sprite mask after the colour fill.
 */
function createTintedSprite(
  sprite: KiwiSprite,
  color: string,
): HTMLCanvasElement {
  const { w, h } = spriteSize(sprite);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return canvas;
  }

  ctx.drawImage(sprite, 0, 0, w, h);
  ctx.globalCompositeOperation = "color";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(sprite, 0, 0, w, h);

  return canvas;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function drawKiwiSprite(
  ctx: CanvasRenderingContext2D,
  meta: KiwiMeta,
  sprite: KiwiSprite,
  size: number,
) {
  const half = size / 2;

  if (!meta.landed) {
    ctx.globalAlpha = 0.35;
    ctx.drawImage(sprite, -half, -half, size, size);
    return;
  }

  const ghostAlpha = 0.35 * (1 - meta.fillProgress * 0.75);

  if (ghostAlpha > 0.01) {
    ctx.globalAlpha = ghostAlpha;
    ctx.drawImage(sprite, -half, -half, size, size);
  }

  if (meta.fillProgress > 0.01 && meta.greenColor) {
    if (!meta.tintedSprite) {
      meta.tintedSprite = createTintedSprite(sprite, meta.greenColor);
    }

    ctx.globalAlpha = meta.fillProgress;
    ctx.drawImage(meta.tintedSprite, -half, -half, size, size);
  }
}

export function drawKiwi(
  ctx: CanvasRenderingContext2D,
  body: Body,
  meta: KiwiMeta,
  sprite: KiwiSprite,
) {
  const size = KIWI_DISPLAY_SIZE * (meta.scale || 1) * KIWI_SPRITE_SCALE;

  ctx.save();
  ctx.translate(body.position.x, body.position.y);
  ctx.rotate(body.angle);
  drawKiwiSprite(ctx, meta, sprite, size);
  ctx.restore();
  ctx.globalAlpha = 1;
}

/**
 * Squash → burst → fade for a kiwi that has left the physics world.
 * A few flecks radiate outward in the middle of the animation.
 */
export function drawPoppingKiwi(
  ctx: CanvasRenderingContext2D,
  entry: PoppingKiwi,
  sprite: KiwiSprite,
  now: number,
) {
  const { meta, x, y, angle } = entry;
  const started = meta.popStartTime ?? now;
  const t = Math.min(1, Math.max(0, (now - started) / POP_DURATION_MS));
  const baseSize = KIWI_DISPLAY_SIZE * (meta.scale || 1) * KIWI_SPRITE_SCALE;

  let scaleX = 1;
  let scaleY = 1;
  let alpha = 1;
  let lift = 0;

  if (t < 0.28) {
    // Squash under pressure.
    const s = easeOutCubic(t / 0.28);
    scaleX = 1 + 0.28 * s;
    scaleY = 1 - 0.32 * s;
  } else if (t < 0.55) {
    // Burst outward.
    const s = easeOutCubic((t - 0.28) / 0.27);
    scaleX = 1.28 + 0.35 * s;
    scaleY = 0.68 + 0.9 * s;
    alpha = 1 - 0.25 * s;
    lift = -6 * s;
  } else {
    // Fade away.
    const s = (t - 0.55) / 0.45;
    const e = easeOutCubic(s);
    scaleX = 1.63 * (1 + 0.2 * e);
    scaleY = 1.58 * (1 + 0.2 * e);
    alpha = (1 - 0.25) * (1 - e);
    lift = -6 - 10 * e;
  }

  ctx.save();
  ctx.translate(x, y + lift);
  ctx.rotate(angle);
  ctx.scale(scaleX, scaleY);
  ctx.globalAlpha = Math.max(0, alpha);
  drawKiwiSprite(ctx, meta, sprite, baseSize);
  ctx.restore();

  // Juice flecks during the burst window.
  if (t > 0.28 && t < 0.85) {
    const fleckT = (t - 0.28) / 0.57;
    const fleckAlpha = (1 - fleckT) * 0.55;
    const fleckColor = meta.greenColor || "#C5E66A";
    const fleckCount = 3;

    ctx.save();
    ctx.translate(x, y + lift);
    ctx.globalAlpha = fleckAlpha;

    for (let i = 0; i < fleckCount; i += 1) {
      const theta = angle + (i / fleckCount) * Math.PI * 2 + 0.4;
      const dist = 8 + fleckT * 22;
      const r = 1.6 + (1 - fleckT) * 2.2;
      ctx.beginPath();
      ctx.fillStyle = fleckColor;
      ctx.arc(
        Math.cos(theta) * dist,
        Math.sin(theta) * dist - fleckT * 4,
        r,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    ctx.restore();
  }

  ctx.globalAlpha = 1;
}
