"use client";

import { useCallback, useEffect, useState } from "react";

import {
  buildPricingResponse,
  normalizeSupportedCurrency,
  type PricingResponse,
  type SupportedCurrency,
} from "@/lib/pricing/regions";

const PRICING_CURRENCY_STORAGE_KEY = "refresh-kiwi:pricing-currency";

export function usePricing() {
  const [pricing, setPricing] = useState<PricingResponse>(() =>
    buildPricingResponse(),
  );
  const [selectedCurrency, setSelectedCurrency] =
    useState<SupportedCurrency | null>(null);

  const loadPricing = useCallback(async (currency?: SupportedCurrency | null) => {
    const query = currency ? `?currency=${encodeURIComponent(currency)}` : "";
    const response = await fetch(`/api/pricing${query}`);

    if (!response.ok) {
      throw new Error("Failed to load pricing");
    }

    const payload = (await response.json()) as PricingResponse;
    setPricing(payload);
  }, []);

  useEffect(() => {
    const storedCurrency =
      typeof window === "undefined"
        ? null
        : normalizeSupportedCurrency(
            window.localStorage.getItem(PRICING_CURRENCY_STORAGE_KEY),
          );

    setSelectedCurrency(storedCurrency);
    void loadPricing(storedCurrency).catch(() => {
      setPricing(buildPricingResponse({ currency: storedCurrency }));
    });
  }, [loadPricing]);

  const selectPricingCurrency = useCallback(
    (currency: SupportedCurrency) => {
      setSelectedCurrency(currency);
      window.localStorage.setItem(PRICING_CURRENCY_STORAGE_KEY, currency);
      void loadPricing(currency).catch(() => {
        setPricing(buildPricingResponse({ currency }));
      });
    },
    [loadPricing],
  );

  return { pricing, selectedCurrency, selectPricingCurrency };
}
