import type { Body } from "matter-js";

import type { KiwiSprite } from "./prepareSprite";
import {
  FILL_DURATION_MS,
  KIWI_DISPLAY_SIZE,
  type KiwiMeta,
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

export function drawKiwi(
  ctx: CanvasRenderingContext2D,
  body: Body,
  meta: KiwiMeta,
  sprite: KiwiSprite,
) {
  const size = KIWI_DISPLAY_SIZE * (meta.scale || 1);
  const half = size / 2;

  ctx.save();
  ctx.translate(body.position.x, body.position.y);
  ctx.rotate(body.angle);

  if (!meta.landed) {
    ctx.globalAlpha = 0.35;
    ctx.drawImage(sprite, -half, -half, size, size);
  } else {
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

  ctx.restore();
  ctx.globalAlpha = 1;
}
