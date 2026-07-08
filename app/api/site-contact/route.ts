import { NextResponse } from "next/server";

import { assertRateLimit, rateLimitKey } from "@/lib/auth/rateLimit";
import { rateLimitResponse } from "@/lib/auth/rateLimitResponse";
import { sendContactEnquiryEmail } from "@/lib/email/service";
import {
  getWebsiteContactTarget,
  normalizeCustomDomain,
} from "@/lib/websites/service";

export const runtime = "nodejs";

const APP_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "refresh.kiwi",
  "www.refresh.kiwi",
  "refresh-kiwi.onrender.com",
]);
const FRIENDLY_INACTIVE_MESSAGE =
  "This contact form will start working once the website goes live.";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/;

type ContactBody = {
  slug?: unknown;
  name?: unknown;
  email?: unknown;
  message?: unknown;
  website?: unknown;
};

type ContactValidation =
  | {
      ok: true;
      value: {
        slug: string;
        name: string;
        email: string;
        message: string;
      };
    }
  | { ok: false; error: string };

function isPlainText(value: unknown): value is string {
  return typeof value === "string";
}

function sanitizeSingleLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function normalizeHost(host: string): string {
  return host.split(":")[0]?.toLowerCase() ?? "";
}

function hostFromHeader(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    return normalizeHost(new URL(value).host);
  } catch {
    return null;
  }
}

function isAllowedOrigin(params: {
  request: Request;
  customDomain: string | null;
  customDomainStatus: string;
}): boolean {
  const host =
    hostFromHeader(params.request.headers.get("origin")) ??
    hostFromHeader(params.request.headers.get("referer"));

  if (!host) {
    return false;
  }

  if (APP_HOSTS.has(host)) {
    return true;
  }

  if (params.customDomainStatus !== "connected" || !params.customDomain) {
    return false;
  }

  try {
    return normalizeCustomDomain(host) === normalizeCustomDomain(params.customDomain);
  } catch {
    return false;
  }
}

function validateContactBody(body: ContactBody): ContactValidation {
  if (!isPlainText(body.slug) || !SLUG_PATTERN.test(body.slug.trim())) {
    return { ok: false, error: "Enter a valid website reference." };
  }

  if (!isPlainText(body.name)) {
    return { ok: false, error: "Enter your name." };
  }

  const name = sanitizeSingleLine(body.name);

  if (name.length < 1 || name.length > 100) {
    return { ok: false, error: "Enter your name." };
  }

  if (!isPlainText(body.email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const email = sanitizeSingleLine(body.email).toLowerCase();

  if (email.length > 200 || !EMAIL_PATTERN.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  if (!isPlainText(body.message)) {
    return { ok: false, error: "Enter a message." };
  }

  const message = body.message.trim();

  if (message.length < 10 || message.length > 2000) {
    return {
      ok: false,
      error: "Enter a message between 10 and 2,000 characters.",
    };
  }

  return {
    ok: true,
    value: {
      slug: body.slug.trim(),
      name,
      email,
      message,
    },
  };
}

export async function POST(request: Request) {
  let body: ContactBody;

  try {
    const parsed = await request.json();

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json(
        { ok: false, error: "Invalid request." },
        { status: 400 },
      );
    }

    body = parsed as ContactBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request." },
      { status: 400 },
    );
  }

  if (isPlainText(body.website) && body.website.trim()) {
    return NextResponse.json({ ok: true });
  }

  const validation = validateContactBody(body);

  if (!validation.ok) {
    return NextResponse.json(
      { ok: false, error: validation.error },
      { status: 400 },
    );
  }

  try {
    await assertRateLimit(rateLimitKey(request, "site-contact"), {
      limit: 5,
      windowMs: 10 * 60 * 1000,
      message: "Too many contact form submissions. Please wait a moment and try again.",
    });
  } catch (error) {
    const response = rateLimitResponse(error);

    if (response) {
      return response;
    }

    throw error;
  }

  const target = await getWebsiteContactTarget(validation.value.slug);

  if (!target) {
    return NextResponse.json(
      { ok: false, error: "Website not found." },
      { status: 404 },
    );
  }

  if (
    !isAllowedOrigin({
      request,
      customDomain: target.customDomain,
      customDomainStatus: target.customDomainStatus,
    })
  ) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  if (target.status !== "live" || !target.ownerIsPro || !target.ownerEmail) {
    return NextResponse.json({
      ok: false,
      error: FRIENDLY_INACTIVE_MESSAGE,
    });
  }

  try {
    await assertRateLimit(`site-contact-site:${validation.value.slug}`, {
      limit: 20,
      windowMs: 60 * 60 * 1000,
      message: "This website has received too many enquiries. Please try again later.",
    });
  } catch (error) {
    const response = rateLimitResponse(error);

    if (response) {
      return response;
    }

    throw error;
  }

  await sendContactEnquiryEmail({
    to: target.ownerEmail,
    siteName: target.brandName ?? target.slug,
    visitorName: validation.value.name,
    visitorEmail: validation.value.email,
    message: validation.value.message,
  });

  return NextResponse.json({ ok: true });
}
