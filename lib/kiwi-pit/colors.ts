export const KIWI_PRIMARY_GREEN = "#C0EA70";

// HSL approximates of the brand green — used to generate landing shades
const BRAND_HUE = 78;
const BRAND_SATURATION = 74;
const BRAND_LIGHTNESS = 68;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function pickGreenShade(): string {
  const hue = BRAND_HUE + (Math.random() - 0.5) * 28;
  const saturation = BRAND_SATURATION + (Math.random() - 0.5) * 32;
  const lightness = BRAND_LIGHTNESS + (Math.random() - 0.5) * 40;

  return `hsl(${clamp(hue, 58, 98)}, ${clamp(saturation, 38, 92)}%, ${clamp(lightness, 26, 84)}%)`;
}
