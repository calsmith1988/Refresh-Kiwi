const ALPHA_THRESHOLD = 12;

export type KiwiSprite = HTMLImageElement | HTMLCanvasElement;

function readAlphaSamples(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const { data } = ctx.getImageData(0, 0, width, height);
  const cornerIndexes = [
    0,
    width - 1,
    (height - 1) * width,
    (height - 1) * width + (width - 1),
  ];

  for (const index of cornerIndexes) {
    if (data[index * 4 + 3] < 20) {
      return true;
    }
  }

  for (let i = 3; i < data.length; i += 64) {
    if (data[i] < 20) {
      return true;
    }
  }

  return false;
}

function stripOpaqueBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (r <= ALPHA_THRESHOLD && g <= ALPHA_THRESHOLD && b <= ALPHA_THRESHOLD) {
      data[i + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Uses the PNG directly when it already has transparency; otherwise strips
 * near-black background pixels once (no erosion or clipping).
 */
export function prepareSprite(image: HTMLImageElement): KiwiSprite {
  const width = image.naturalWidth;
  const height = image.naturalHeight;

  const probe = document.createElement("canvas");
  probe.width = width;
  probe.height = height;

  const probeCtx = probe.getContext("2d");
  if (!probeCtx) {
    return image;
  }

  probeCtx.drawImage(image, 0, 0);

  if (readAlphaSamples(probeCtx, width, height)) {
    return image;
  }

  stripOpaqueBackground(probeCtx, width, height);
  return probe;
}
