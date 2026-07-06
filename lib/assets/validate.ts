/**
 * Content-based image validation. The declared MIME type on an upload is
 * attacker-controlled, so we sniff the actual bytes and confirm they match a
 * supported image format before storing/serving. This blocks disguised
 * payloads (e.g. an HTML/JS file uploaded as image/png).
 */

export type SniffedImageType =
  | "image/png"
  | "image/jpeg"
  | "image/gif"
  | "image/webp"
  | "image/avif"
  | "image/x-icon"
  | "image/svg+xml";

function isSvg(buffer: Buffer): boolean {
  // Look past a UTF-8 BOM / leading whitespace for "<svg" or an XML prolog.
  const head = buffer
    .subarray(0, 1024)
    .toString("utf8")
    .replace(/^\uFEFF/, "")
    .trimStart()
    .toLowerCase();

  if (head.startsWith("<svg")) {
    return true;
  }

  return head.startsWith("<?xml") && head.includes("<svg");
}

export function sniffImageType(buffer: Buffer): SniffedImageType | null {
  if (buffer.length < 12) {
    return isSvg(buffer) ? "image/svg+xml" : null;
  }

  if (
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "image/png";
  }

  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    return "image/jpeg";
  }

  const ascii4 = buffer.subarray(0, 4).toString("ascii");

  if (ascii4 === "GIF8") {
    return "image/gif";
  }

  if (
    ascii4 === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  // ICO / CUR: 00 00 01 00 (icon) or 00 00 02 00 (cursor).
  if (
    buffer[0] === 0x00 &&
    buffer[1] === 0x00 &&
    (buffer[2] === 0x01 || buffer[2] === 0x02) &&
    buffer[3] === 0x00
  ) {
    return "image/x-icon";
  }

  // AVIF / HEIF: "ftyp" box at offset 4 with an avif/heic/mif1 brand.
  if (buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buffer.subarray(8, 12).toString("ascii").toLowerCase();

    if (
      brand.startsWith("avif") ||
      brand.startsWith("avis") ||
      brand.startsWith("mif1") ||
      brand.startsWith("heic") ||
      brand.startsWith("heix")
    ) {
      return "image/avif";
    }
  }

  return isSvg(buffer) ? "image/svg+xml" : null;
}

/**
 * Confirms the bytes are a real, supported image. Returns the sniffed type on
 * success (callers can trust this over the declared MIME type). SVG is treated
 * as supported here but must be served with script execution neutralised — see
 * svgSecurityHeaders / the preview serving layer.
 */
export function validateImageBuffer(buffer: Buffer): SniffedImageType | null {
  return sniffImageType(buffer);
}

/**
 * An SVG served as image/svg+xml renders as a document when opened directly,
 * and any <script>/on* handlers inside it run in the serving origin — a
 * stored-XSS vector for user- or source-site-supplied SVGs. The CSP sandbox
 * (without allow-scripts) neutralises script execution, and nosniff stops the
 * browser reinterpreting the type. Apply to any SVG response.
 */
export function isSvgContentType(contentType: string): boolean {
  return contentType.split(";")[0].trim().toLowerCase() === "image/svg+xml";
}

export function svgSecurityHeaders(): Record<string, string> {
  return {
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    "X-Content-Type-Options": "nosniff",
  };
}
