import { NextResponse } from "next/server";

import { assertRateLimit, rateLimitKey } from "@/lib/auth/rateLimit";
import { rateLimitResponse } from "@/lib/auth/rateLimitResponse";
import { sendWebsiteCostCalculatorBreakdownEmail } from "@/lib/email/service";
import {
  calculateWebsiteCost,
  type CalculatorAddOnKey,
  type CalculatorInputs,
  type PageBand,
} from "@/lib/marketing/website-cost-calculator";

export const runtime = "nodejs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAGE_BANDS = new Set<PageBand>(["1-5", "6-10", "11+"]);
const ADD_ON_KEYS = new Set<CalculatorAddOnKey>([
  "ecommerce",
  "booking",
  "copywriting",
  "photos",
]);
const MAX_PDF_BYTES = 512_000;

type BreakdownBody = {
  email?: unknown;
  inputs?: unknown;
  pdfBase64?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseBoolean(value: unknown): boolean {
  return value === true;
}

function parseInputs(value: unknown): CalculatorInputs | null {
  if (!isRecord(value)) {
    return null;
  }

  const pages = value.pages;

  if (typeof pages !== "string" || !PAGE_BANDS.has(pages as PageBand)) {
    return null;
  }

  const inputs: CalculatorInputs = {
    pages: pages as PageBand,
    ecommerce: false,
    booking: false,
    copywriting: false,
    photos: false,
  };

  for (const key of ADD_ON_KEYS) {
    inputs[key] = parseBoolean(value[key]);
  }

  return inputs;
}

function parsePdfBase64(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const normalized = value.trim();

  if (!/^[A-Za-z0-9+/=\r\n]+$/.test(normalized)) {
    return null;
  }

  try {
    const bytes = Buffer.from(normalized, "base64");

    if (!bytes.length || bytes.length > MAX_PDF_BYTES) {
      return null;
    }

    if (bytes.subarray(0, 5).toString("utf8") !== "%PDF-") {
      return null;
    }

    return normalized;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let body: BreakdownBody;

  try {
    const parsed = await request.json();

    if (!isRecord(parsed)) {
      return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
    }

    body = parsed;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  if (typeof body.email !== "string") {
    return NextResponse.json(
      { ok: false, error: "Enter a valid email address." },
      { status: 400 },
    );
  }

  const email = body.email.trim().toLowerCase();

  if (email.length > 200 || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json(
      { ok: false, error: "Enter a valid email address." },
      { status: 400 },
    );
  }

  const inputs = parseInputs(body.inputs);

  if (!inputs) {
    return NextResponse.json({ ok: false, error: "Invalid calculator inputs." }, { status: 400 });
  }

  const pdfBase64 = parsePdfBase64(body.pdfBase64);

  if (!pdfBase64) {
    return NextResponse.json({ ok: false, error: "Invalid PDF attachment." }, { status: 400 });
  }

  try {
    await assertRateLimit(rateLimitKey(request, "website-cost-calculator"), {
      limit: 5,
      windowMs: 10 * 60 * 1000,
      message: "Too many requests. Please wait a moment and try again.",
    });
  } catch (error) {
    const response = rateLimitResponse(error);

    if (response) {
      return response;
    }

    throw error;
  }

  const result = calculateWebsiteCost(inputs);
  const emailSent = await sendWebsiteCostCalculatorBreakdownEmail({
    to: email,
    inputs,
    result,
    pdfBase64,
  });

  console.info(
    `[refresh-kiwi] website-cost-calculator lead captured email=${email} pages=${inputs.pages} emailSent=${emailSent}`,
  );

  return NextResponse.json({ ok: true, emailSent });
}
