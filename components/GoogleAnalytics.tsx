"use client";

import Script from "next/script";

const CONSENT_STORAGE_KEY = "refresh_kiwi_cookie_consent";

type CookieConsent = {
  analytics: boolean;
};

function initialConsentState(): "granted" | "denied" {
  if (typeof window === "undefined") {
    return "denied";
  }

  try {
    const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);

    if (!stored) {
      return "denied";
    }

    const parsed = JSON.parse(stored) as Partial<CookieConsent>;

    return parsed.analytics === true ? "granted" : "denied";
  } catch {
    return "denied";
  }
}

export default function GoogleAnalytics({
  measurementId,
}: {
  measurementId?: string;
}) {
  if (!measurementId) {
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
          gtag('consent', 'default', {
            analytics_storage: '${initialConsentState()}',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied'
          });
          gtag('js', new Date());
          gtag('config', '${measurementId}', {
            anonymize_ip: true
          });
        `}
      </Script>
    </>
  );
}
