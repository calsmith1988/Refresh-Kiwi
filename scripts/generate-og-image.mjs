/**
 * Builds the 1200x630 homepage Open Graph image in public/.
 * Run: node scripts/generate-og-image.mjs
 */
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const logoPath = join(root, "public/assets/kiwi-slice-v2.png");
const outputPath = join(root, "public/refresh-kiwi-og.png");

const width = 1200;
const height = 630;

const backgroundSvg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#faf8f1"/>
      <stop offset="55%" stop-color="#f2f8df"/>
      <stop offset="100%" stop-color="#c5e66a"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <circle cx="1040" cy="110" r="180" fill="#c5e66a" opacity="0.35"/>
  <circle cx="160" cy="520" r="140" fill="#c5e66a" opacity="0.28"/>
  <text x="96" y="250" fill="#141811" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif" font-size="72" font-weight="700">Refresh Kiwi</text>
  <text x="96" y="330" fill="#141811" opacity="0.72" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif" font-size="40" font-weight="500">Same website, fresher skin</text>
  <text x="96" y="430" fill="#141811" opacity="0.62" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif" font-size="30" font-weight="500">See your new site in about 2 minutes — free to try</text>
</svg>`;

const logo = sharp(readFileSync(logoPath)).resize(220, 220, { fit: "contain" });

await sharp(Buffer.from(backgroundSvg))
  .composite([{ input: await logo.toBuffer(), top: 360, left: 860 }])
  .png()
  .toFile(outputPath);

console.log(`Wrote ${outputPath}`);
