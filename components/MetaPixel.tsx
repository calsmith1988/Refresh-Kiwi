"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const CONSENT_STORAGE_KEY = "refresh_kiwi_cookie_consent";
const CONSENT_EVENT = "refresh-kiwi-cookie-consent";

type CookieConsent = {
  analytics: boolean;
};

function hasMarketingConsent(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    const parsed = stored ? (JSON.parse(stored) as Partial<CookieConsent>) : null;

    return parsed?.analytics === true;
  } catch {
    return false;
  }
}

function shouldTrackViewContent(pathname: string): boolean {
  return pathname === "/" || pathname.startsWith("/blog");
}

export default function MetaPixel({ pixelId }: { pixelId?: string | null }) {
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);
  const initialPixelConsent =
    typeof window !== "undefined" && hasMarketingConsent() ? "grant" : "revoke";
  const applyConsent = useCallback(() => {
    window.fbq?.("consent", hasMarketingConsent() ? "grant" : "revoke");
  }, []);

  useEffect(() => {
    if (!pixelId || !isReady) {
      return;
    }

    applyConsent();
    window.addEventListener(CONSENT_EVENT, applyConsent);

    return () => window.removeEventListener(CONSENT_EVENT, applyConsent);
  }, [applyConsent, isReady, pixelId]);

  useEffect(() => {
    const fbq = window.fbq;

    if (!pixelId || !isReady || !fbq || !hasMarketingConsent()) {
      return;
    }

    fbq("track", "PageView");

    if (shouldTrackViewContent(pathname)) {
      fbq("track", "ViewContent", {
        content_name: pathname === "/" ? "Homepage" : "Blog content",
        content_category: pathname.startsWith("/blog") ? "Blog" : "Landing page",
      });
    }
  }, [isReady, pathname, pixelId]);

  if (!pixelId) {
    return null;
  }

  return (
    <Script
      id="meta-pixel"
      strategy="afterInteractive"
      onReady={() => {
        setIsReady(true);
        applyConsent();
      }}
    >
      {`
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('consent', '${initialPixelConsent}');
        fbq('init', '${pixelId}');
      `}
    </Script>
  );
}
