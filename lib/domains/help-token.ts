import { createHmac, timingSafeEqual } from "node:crypto";

type DomainHelpPayload = {
  websiteId: string;
  domain: string;
};

function getDomainHelpSecret(): string {
  const secret =
    process.env.DOMAIN_HELP_SECRET?.trim() ||
    process.env.EMAIL_UNSUBSCRIBE_SECRET?.trim();

  if (secret) {
    if (secret.length < 16) {
      throw new Error("DOMAIN_HELP_SECRET must be at least 16 characters");
    }

    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("DOMAIN_HELP_SECRET is not configured");
  }

  return "refresh-kiwi-local-domain-help";
}

function encodePayload(payload: DomainHelpPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function signatureForPayload(encodedPayload: string): string {
  return createHmac("sha256", getDomainHelpSecret())
    .update(encodedPayload)
    .digest("hex");
}

export function createDomainHelpToken(payload: DomainHelpPayload): string {
  const encodedPayload = encodePayload(payload);

  return `${encodedPayload}.${signatureForPayload(encodedPayload)}`;
}

export function verifyDomainHelpToken(token: string): DomainHelpPayload | null {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expected = signatureForPayload(encodedPayload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);

  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<DomainHelpPayload>;

    if (!payload.websiteId || !payload.domain) {
      return null;
    }

    return {
      websiteId: payload.websiteId,
      domain: payload.domain,
    };
  } catch {
    return null;
  }
}
