export type JobAttribution = {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  referrer: string | null;
};

const MAX_FIELD_LENGTH = 200;
const MAX_REFERRER_LENGTH = 600;

function cleanField(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim().slice(0, maxLength);

  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Attribution is client-supplied and untrusted: keep only known fields,
 * trimmed and length-capped. Returns null when nothing useful was sent so
 * callers can skip the columns entirely.
 */
export function sanitizeAttribution(value: unknown): JobAttribution | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const attribution: JobAttribution = {
    utmSource: cleanField(raw.utmSource, MAX_FIELD_LENGTH),
    utmMedium: cleanField(raw.utmMedium, MAX_FIELD_LENGTH),
    utmCampaign: cleanField(raw.utmCampaign, MAX_FIELD_LENGTH),
    referrer: cleanField(raw.referrer, MAX_REFERRER_LENGTH),
  };

  const hasValue = Object.values(attribution).some((field) => field !== null);

  return hasValue ? attribution : null;
}
