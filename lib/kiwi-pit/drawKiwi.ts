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
 * Splat against the floor: squash flat, spread sideways, fade out.
 * Anchored to the bottom of the sprite so it reads as pressure from above,
 * not a balloon popping toward the camera.
 */
export function drawPoppingKiwi(
  ctx: CanvasRenderingContext2D,
  entry: PoppingKiwi,
  sprite: KiwiSprite,
  now: number,
) {
  const { meta, x, y } = entry;
  const started = meta.popStartTime ?? now;
  const t = Math.min(1, Math.max(0, (now - started) / POP_DURATION_MS));
  const baseSize = KIWI_DISPLAY_SIZE * (meta.scale || 1) * KIWI_SPRITE_SCALE;
  const half = baseSize / 2;

  let scaleX = 1;
  let scaleY = 1;
  let alpha = 1;

  if (t < 0.35) {
    // Compress under the pile — wide and flat.
    const s = easeOutCubic(t / 0.35);
    scaleX = 1 + 0.85 * s;
    scaleY = 1 - 0.72 * s;
  } else if (t < 0.65) {
    // Finish the splat: pancake further, start fading.
    const s = easeOutCubic((t - 0.35) / 0.3);
    scaleX = 1.85 + 0.55 * s;
    scaleY = 0.28 * (1 - 0.55 * s);
    alpha = 1 - 0.35 * s;
  } else {
    // Dissolve while staying flat on the floor.
    const s = (t - 0.65) / 0.35;
    const e = easeOutCubic(s);
    scaleX = 2.4 + 0.35 * e;
    scaleY = 0.12 * (1 - e);
    alpha = 0.65 * (1 - e);
  }

  // Keep the bottom edge planted so it looks like it's hitting the floor.
  const groundY = y + half;

  ctx.save();
  ctx.translate(x, groundY);
  // Flatten upright against the floor — ignore body spin so it doesn't look
  // like a spinning balloon.
  ctx.scale(scaleX, Math.max(scaleY, 0.04));
  ctx.translate(0, -half);
  ctx.globalAlpha = Math.max(0, alpha);
  drawKiwiSprite(ctx, meta, sprite, baseSize);
  ctx.restore();

  // Juice flecks spray sideways along the floor during the splat.
  if (t > 0.3 && t < 0.9) {
    const fleckT = (t - 0.3) / 0.6;
    const fleckAlpha = (1 - fleckT) * 0.5;
    const fleckColor = meta.greenColor || "#C5E66A";
    const sides = [-1, 1] as const;

    ctx.save();
    ctx.translate(x, groundY - 2);
    ctx.globalAlpha = fleckAlpha;

    for (const side of sides) {
      for (let i = 0; i < 2; i += 1) {
        const dist = 10 + fleckT * (18 + i * 10);
        const r = 1.4 + (1 - fleckT) * 2;
        ctx.beginPath();
        ctx.fillStyle = fleckColor;
        ctx.arc(
          side * dist,
          -fleckT * (2 + i),
          r,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }

    ctx.restore();
  }

  ctx.globalAlpha = 1;
}
