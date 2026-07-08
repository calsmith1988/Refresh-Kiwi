export type SupportedCurrency = "GBP" | "USD" | "CAD" | "AUD";

export type PriceOption = {
  currency: SupportedCurrency;
  countryCode: string;
  label: string;
  monthlyPrice: string;
};

export type PricingResponse = {
  countryCode: string;
  currency: SupportedCurrency;
  freePrice: string;
  proPrice: string;
  proPriceMonthly: string;
  proPriceShort: string;
  checkoutAllowed: boolean;
  checkoutUnavailableMessage: string | null;
  options: PriceOption[];
};

type PriceConfig = {
  currency: SupportedCurrency;
  countryCode: string;
  label: string;
  locale: string;
  symbol: string;
  monthlyMinorAmount: number;
};

export const DEFAULT_COUNTRY_CODE = "GB";
export const DEFAULT_CURRENCY: SupportedCurrency = "GBP";
export const CHECKOUT_UNAVAILABLE_MESSAGE =
  "Refresh Kiwi Pro is not available in your region yet. We're launching in the UK, US, Canada, and Australia first.";

const PRICE_CONFIGS: Record<SupportedCurrency, PriceConfig> = {
  GBP: {
    currency: "GBP",
    countryCode: "GB",
    label: "GBP",
    locale: "en-GB",
    symbol: "£",
    monthlyMinorAmount: 800,
  },
  USD: {
    currency: "USD",
    countryCode: "US",
    label: "USD",
    locale: "en-US",
    symbol: "US$",
    monthlyMinorAmount: 1100,
  },
  CAD: {
    currency: "CAD",
    countryCode: "CA",
    label: "CAD",
    locale: "en-CA",
    symbol: "CA$",
    monthlyMinorAmount: 1500,
  },
  AUD: {
    currency: "AUD",
    countryCode: "AU",
    label: "AUD",
    locale: "en-AU",
    symbol: "AU$",
    monthlyMinorAmount: 1700,
  },
};

const COUNTRY_TO_CURRENCY: Record<string, SupportedCurrency> = {
  GB: "GBP",
  US: "USD",
  CA: "CAD",
  AU: "AUD",
};

const EU_AND_IRELAND_COUNTRY_CODES = new Set([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
]);

export const SUPPORTED_PRICE_OPTIONS: PriceOption[] = Object.values(
  PRICE_CONFIGS,
).map((config) => ({
  currency: config.currency,
  countryCode: config.countryCode,
  label: config.label,
  monthlyPrice: formatMonthlyPrice(config.currency),
}));

export function normalizeCountryCode(countryCode?: string | null): string {
  const normalized = countryCode?.trim().toUpperCase() ?? "";

  return /^[A-Z]{2}$/.test(normalized) ? normalized : DEFAULT_COUNTRY_CODE;
}

export function normalizeSupportedCurrency(
  currency?: string | null,
): SupportedCurrency | null {
  const normalized = currency?.trim().toUpperCase();

  return normalized && normalized in PRICE_CONFIGS
    ? (normalized as SupportedCurrency)
    : null;
}

export function isBlockedCheckoutCountry(countryCode?: string | null): boolean {
  return EU_AND_IRELAND_COUNTRY_CODES.has(normalizeCountryCode(countryCode));
}

export function getCurrencyForCountry(
  countryCode?: string | null,
): SupportedCurrency {
  return COUNTRY_TO_CURRENCY[normalizeCountryCode(countryCode)] ?? DEFAULT_CURRENCY;
}

export function formatPrice(currency: SupportedCurrency, minorAmount: number): string {
  const config = PRICE_CONFIGS[currency];
  const majorAmount = minorAmount / 100;
  const number = new Intl.NumberFormat(config.locale, {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(majorAmount);

  return `${config.symbol}${number}`;
}

export function formatMonthlyPrice(currency: SupportedCurrency): string {
  return `${formatPrice(currency, PRICE_CONFIGS[currency].monthlyMinorAmount)}/month`;
}

export function formatShortMonthlyPrice(currency: SupportedCurrency): string {
  return `${formatPrice(currency, PRICE_CONFIGS[currency].monthlyMinorAmount)}/mo`;
}

export function formatFreePrice(currency: SupportedCurrency): string {
  return formatPrice(currency, 0);
}

export function getDefaultProPriceLabel(): string {
  return formatMonthlyPrice(DEFAULT_CURRENCY);
}

export function buildPricingResponse(params?: {
  countryCode?: string | null;
  currency?: string | null;
}): PricingResponse {
  const countryCode = normalizeCountryCode(params?.countryCode);
  const currency =
    normalizeSupportedCurrency(params?.currency) ?? getCurrencyForCountry(countryCode);
  const checkoutAllowed = !isBlockedCheckoutCountry(countryCode);

  return {
    countryCode,
    currency,
    freePrice: formatFreePrice(currency),
    proPrice: formatPrice(currency, PRICE_CONFIGS[currency].monthlyMinorAmount),
    proPriceMonthly: formatMonthlyPrice(currency),
    proPriceShort: formatShortMonthlyPrice(currency),
    checkoutAllowed,
    checkoutUnavailableMessage: checkoutAllowed
      ? null
      : CHECKOUT_UNAVAILABLE_MESSAGE,
    options: SUPPORTED_PRICE_OPTIONS,
  };
}
