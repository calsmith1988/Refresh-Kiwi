import sharp from "sharp";

/**
 * Web-optimises raster images before they're stored as site assets: resizes
 * anything larger than a desktop hero needs, converts PNG/JPEG to WebP
 * (transparency survives), and corrects EXIF rotation from phone cameras.
 *
 * SVG (vector), GIF (animation), ICO, and AVIF inputs pass through untouched
 * — the risk of mangling them outweighs the byte savings.
 */

const OPTIMIZABLE_TYPES = new Set(["image/png", "image/jpeg"]);
const MAX_DIMENSION = 1920;
const WEBP_QUALITY = 80;

// Decompression-bomb guard: a tiny PNG can decode to gigabytes of pixels.
// 50 megapixels comfortably covers real photos (8K is ~33MP).
const MAX_INPUT_PIXELS = 50_000_000;

export type OptimizedImage = {
  buffer: Buffer;
  contentType: string;
};

export async function optimizeImage(
  buffer: Buffer,
  contentType: string,
): Promise<OptimizedImage> {
  const original: OptimizedImage = { buffer, contentType };

  if (!OPTIMIZABLE_TYPES.has(contentType)) {
    return original;
  }

  try {
    const optimized = await sharp(buffer, {
      failOn: "none",
      limitInputPixels: MAX_INPUT_PIXELS,
    })
      .autoOrient()
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    // Tiny graphics occasionally encode larger as WebP — keep the original.
    if (optimized.byteLength >= buffer.byteLength) {
      return original;
    }

    return { buffer: optimized, contentType: "image/webp" };
  } catch (error) {
    console.warn(
      `[refresh-kiwi] optimise: falling back to original image:`,
      error,
    );
    return original;
  }
}
