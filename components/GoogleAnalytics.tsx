"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

const CONSENT_STORAGE_KEY = "refresh_kiwi_cookie_consent";

type CookieConsent = {
  analytics: boolean;
};

function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);

    if (!stored) {
      return false;
    }

    const parsed = JSON.parse(stored) as Partial<CookieConsent>;

    return parsed.analytics === true;
  } catch {
    return false;
  }
}

export default function GoogleAnalytics({
  measurementId,
}: {
  measurementId?: string;
}) {
  const [canLoadAnalytics, setCanLoadAnalytics] = useState(false);

  useEffect(() => {
    setCanLoadAnalytics(hasAnalyticsConsent());

    function handleConsentChange() {
      setCanLoadAnalytics(hasAnalyticsConsent());
    }

    window.addEventListener("refresh-kiwi-cookie-consent", handleConsentChange);

    return () => {
      window.removeEventListener(
        "refresh-kiwi-cookie-consent",
        handleConsentChange,
      );
    };
  }, []);

  if (!measurementId || !canLoadAnalytics) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}');
        `}
      </Script>
    </>
  );
}
