"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const CONSENT_STORAGE_KEY = "refresh_kiwi_cookie_consent";
const CONSENT_EVENT = "refresh-kiwi-cookie-consent";
const SETTINGS_EVENT = "refresh-kiwi-open-cookie-settings";

type CookieConsent = {
  analytics: boolean;
  decidedAt: string;
};

function readConsent(): CookieConsent | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);

    return stored ? (JSON.parse(stored) as CookieConsent) : null;
  } catch {
    return null;
  }
}

function saveConsent(analytics: boolean) {
  const consent: CookieConsent = {
    analytics,
    decidedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
  window.gtag?.("consent", "update", {
    analytics_storage: analytics ? "granted" : "denied",
  });
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

// Overloaded rather than declared per-file: TypeScript merges Window across
// the project, so two different gtag signatures would collide.
declare global {
  interface Window {
    gtag?: {
      (
        command: "consent",
        action: "update",
        params: { analytics_storage: "granted" | "denied" },
      ): void;
      (
        command: "event",
        eventName: string,
        params?: Record<string, string | number | boolean>,
      ): void;
    };
  }
}

export default function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  useEffect(() => {
    const existing = readConsent();

    if (existing) {
      setAnalyticsEnabled(existing.analytics);
      return;
    }

    setIsVisible(true);
  }, []);

  useEffect(() => {
    function openSettings() {
      const existing = readConsent();
      setAnalyticsEnabled(existing?.analytics ?? false);
      setIsVisible(true);
    }

    window.addEventListener(SETTINGS_EVENT, openSettings);

    return () => {
      window.removeEventListener(SETTINGS_EVENT, openSettings);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  function applyChoice(analytics: boolean) {
    saveConsent(analytics);
    setAnalyticsEnabled(analytics);
    setIsVisible(false);
  }

  return (
    <div className="fixed inset-x-0 bottom-4 z-[100] px-5 sm:px-8">
      <div className="mx-auto w-full max-w-6xl rounded-3xl border border-black/10 bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-fraunces text-2xl font-semibold tracking-tight">
              Cookies on Refresh Kiwi
            </h2>
            <p className="mt-2 text-sm leading-6 text-black/60">
              We use essential cookies to run the site. With your permission, we
              also use Google Analytics, Microsoft Clarity, and Meta Pixel to
              understand what people read, improve the service, and measure ads
              or campaigns.
            </p>
            <label className="mt-4 flex items-start gap-3 text-sm text-black/70">
              <input
                type="checkbox"
                checked={analyticsEnabled}
                onChange={(event) => setAnalyticsEnabled(event.target.checked)}
                className="mt-1"
              />
              <span>Allow analytics cookies</span>
            </label>
            <p className="mt-3 text-xs leading-5 text-black/45">
              Read more in our{" "}
              <Link href="/cookie-policy" className="underline underline-offset-4">
                Cookie Policy
              </Link>
              .
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:min-w-40">
            <button
              type="button"
              onClick={() => applyChoice(true)}
              className="rounded-full bg-kiwi-green px-5 py-3 text-sm font-bold transition hover:bg-kiwi-green-hover"
            >
              Accept analytics
            </button>
            <button
              type="button"
              onClick={() => applyChoice(analyticsEnabled)}
              className="rounded-full border border-black/10 px-5 py-3 text-sm font-bold transition hover:border-black/25"
            >
              Save choice
            </button>
            <button
              type="button"
              onClick={() => applyChoice(false)}
              className="text-sm font-medium text-black/55 underline underline-offset-4"
            >
              Reject analytics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
