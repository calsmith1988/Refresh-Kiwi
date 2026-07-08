import { DEFAULT_COUNTRY_CODE, normalizeCountryCode } from "@/lib/pricing/regions";

const COUNTRY_HEADERS = [
  "cf-ipcountry",
  "x-vercel-ip-country",
  "x-country-code",
  "x-client-country",
  "cloudfront-viewer-country",
  "x-appengine-country",
] as const;

const LANGUAGE_REGION_PATTERN = /^[a-z]{2,3}-([a-z]{2})$/i;

function countryFromAcceptLanguage(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const languages = value
    .split(",")
    .map((entry) => entry.trim().split(";")[0])
    .filter(Boolean);

  for (const language of languages) {
    const match = language.match(LANGUAGE_REGION_PATTERN);

    if (match?.[1]) {
      return normalizeCountryCode(match[1]);
    }
  }

  return null;
}

export function resolveCountryCodeFromHeaders(headers: Headers): string {
  for (const header of COUNTRY_HEADERS) {
    const value = headers.get(header);

    if (value) {
      return normalizeCountryCode(value);
    }
  }

  return (
    countryFromAcceptLanguage(headers.get("accept-language")) ?? DEFAULT_COUNTRY_CODE
  );
}

export function resolveCountryCodeFromRequest(request?: Request | null): string {
  return request ? resolveCountryCodeFromHeaders(request.headers) : DEFAULT_COUNTRY_CODE;
}
