import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { and, eq, isNull } from "drizzle-orm";

import { hashToken } from "@/lib/auth/tokens";
import { getDb, schema } from "@/lib/db";

const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;
const RECOVERY_CODE_COUNT = 10;
const RECOVERY_CODE_BYTES = 6;

const { twoFactorRecoveryCodes } = schema;

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);

    if (index === -1) {
      continue;
    }

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

function hotp(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = createHmac("sha1", key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

function safeCompare(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

export function createTwoFactorSecret(): string {
  return base32Encode(randomBytes(20));
}

export function buildTotpUri(params: {
  email: string;
  secret: string;
  issuer?: string;
}): string {
  const issuer = params.issuer ?? "Refresh Kiwi";
  const label = `${issuer}:${params.email}`;
  const query = new URLSearchParams({
    secret: params.secret,
    issuer,
    algorithm: "SHA1",
    digits: String(TOTP_DIGITS),
    period: String(TOTP_STEP_SECONDS),
  });

  return `otpauth://totp/${encodeURIComponent(label)}?${query.toString()}`;
}

/**
 * Returns the time-step counter the code matched against, or null if invalid.
 * Callers must persist the matched counter and reject any counter that is not
 * strictly greater than the last one used, so a code can never be replayed
 * within its validity window (RFC 6238 section 5.2).
 */
export function matchTotpCode(params: {
  secret: string;
  code: string;
  window?: number;
}): number | null {
  const code = params.code.replace(/\s+/g, "");

  if (!/^\d{6}$/.test(code)) {
    return null;
  }

  const currentCounter = Math.floor(Date.now() / 1000 / TOTP_STEP_SECONDS);
  const window = params.window ?? 1;

  for (let offset = -window; offset <= window; offset += 1) {
    const counter = currentCounter + offset;

    if (safeCompare(hotp(params.secret, counter), code)) {
      return counter;
    }
  }

  return null;
}

export function createRecoveryCodes(): string[] {
  return Array.from({ length: RECOVERY_CODE_COUNT }, () =>
    randomBytes(RECOVERY_CODE_BYTES).toString("hex").toUpperCase(),
  );
}

export async function replaceRecoveryCodes(params: {
  userId: string;
  codes: string[];
}) {
  const db = getDb();

  await db
    .delete(twoFactorRecoveryCodes)
    .where(eq(twoFactorRecoveryCodes.userId, params.userId));

  await db.insert(twoFactorRecoveryCodes).values(
    params.codes.map((code) => ({
      userId: params.userId,
      codeHash: hashToken(normalizeRecoveryCode(code)),
    })),
  );
}

export function normalizeRecoveryCode(code: string): string {
  return code.replace(/[^a-z0-9]/gi, "").toUpperCase();
}

export async function consumeRecoveryCode(params: {
  userId: string;
  code: string;
}): Promise<boolean> {
  const normalized = normalizeRecoveryCode(params.code);

  if (!normalized) {
    return false;
  }

  const db = getDb();
  const [storedCode] = await db
    .select()
    .from(twoFactorRecoveryCodes)
    .where(
      and(
        eq(twoFactorRecoveryCodes.userId, params.userId),
        eq(twoFactorRecoveryCodes.codeHash, hashToken(normalized)),
        isNull(twoFactorRecoveryCodes.usedAt),
      ),
    )
    .limit(1);

  if (!storedCode) {
    return false;
  }

  await db
    .update(twoFactorRecoveryCodes)
    .set({ usedAt: new Date() })
    .where(eq(twoFactorRecoveryCodes.id, storedCode.id));

  return true;
}
