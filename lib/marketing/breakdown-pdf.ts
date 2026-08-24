import type { CalculatorInputs, CalculatorResult } from "@/lib/marketing/website-cost-calculator";
import {
  ADD_ON_REFERENCE,
  calculatorDisclaimer,
  calculatorPdfTitle,
  formatGbpAddOn,
  formatGbpRange,
  KIWI_PRO_MONTHLY_GBP,
  ONGOING_AGENCY_CARE_RANGE,
  ONGOING_DIY_RANGE,
  PAGE_BAND_REFERENCE,
  pageBandLabel,
} from "@/lib/marketing/website-cost-calculator";

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function escapePdfText(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function wrapPdfLines(text: string, maxLength = 88): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;

    if (candidate.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function buildContentStream(lines: string[]): string {
  let y = 760;
  const commands: string[] = ["BT", "/F1 12 Tf", "50 760 Td"];

  for (const line of lines) {
    if (y !== 760) {
      commands.push("0 -16 Td");
    }

    commands.push(`(${escapePdfText(line)}) Tj`);
    y -= 16;
  }

  commands.push("ET");
  return commands.join("\n");
}

export function buildWebsiteCostBreakdownPdfBytes(params: {
  inputs: CalculatorInputs;
  result: CalculatorResult;
}): Uint8Array {
  const bodyLines = [
    calculatorPdfTitle,
    "",
    "1. How to read this",
    calculatorDisclaimer,
    "",
    "2. Your band",
    `You picked: ${pageBandLabel(params.inputs.pages)}.`,
    `Typical range for what you picked: ${formatGbpRange(params.result.total)}.`,
    "Locked page-count ranges:",
    ...PAGE_BAND_REFERENCE.map(
      (band) => `  ${band.label} pages: ${formatGbpRange(band.range)}`,
    ),
    "",
    "3. The extras that inflate the invoice",
    ...ADD_ON_REFERENCE.map(
      (addOn) => `  ${addOn.label}: ${formatGbpAddOn(addOn.range)}`,
    ),
    "",
    "4. The monthly bit people forget",
    `  DIY builders: ${formatGbpRange(ONGOING_DIY_RANGE)}/month`,
    `  Agency care: ${formatGbpRange(ONGOING_AGENCY_CARE_RANGE)}/month`,
    "",
    "5. Refresh Kiwi at £8 a month",
    `  £${KIWI_PRO_MONTHLY_GBP}/month (US$11 / CA$15 / AU$17). Hosting + unlimited plain-English or voice edits. One plan.`,
    "  Start from a URL, a Google listing, or a description.",
    "  Refreshing a URL does not touch the live site.",
    "",
    "6. When £8 is the wrong tool",
    "  CMS, theme store, cart-first shop.",
    "",
    "Try Refresh Kiwi free: https://refresh.kiwi",
  ];

  const wrappedLines = bodyLines.flatMap((line) =>
    line ? wrapPdfLines(line) : [""],
  );
  const stream = buildContentStream(wrappedLines);
  const streamLength = byteLength(stream);

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
    `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${stream}\nendstream\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (const object of objects) {
    offsets.push(byteLength(pdf));
    pdf += object;
  }

  const xrefOffset = byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  if (typeof btoa === "function") {
    return btoa(binary);
  }

  return Buffer.from(bytes).toString("base64");
}

export function breakdownPdfBase64(params: {
  inputs: CalculatorInputs;
  result: CalculatorResult;
}): string {
  return bytesToBase64(buildWebsiteCostBreakdownPdfBytes(params));
}

export function downloadWebsiteCostBreakdownPdf(params: {
  inputs: CalculatorInputs;
  result: CalculatorResult;
  filename?: string;
}) {
  const bytes = new Uint8Array(buildWebsiteCostBreakdownPdfBytes(params));
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download =
    params.filename ?? "what-a-uk-website-usually-costs-refresh-kiwi.pdf";
  anchor.click();
  URL.revokeObjectURL(url);
}
