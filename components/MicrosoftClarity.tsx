"use client";

import Clarity from "@microsoft/clarity";
import { useEffect, useRef } from "react";

const CONSENT_STORAGE_KEY = "refresh_kiwi_cookie_consent";
const CONSENT_EVENT = "refresh-kiwi-cookie-consent";

type CookieConsent = {
  analytics: boolean;
};

function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    const parsed = stored
      ? (JSON.parse(stored) as Partial<CookieConsent>)
      : null;

    return parsed?.analytics === true;
  } catch {
    return false;
  }
}

export default function MicrosoftClarity({
  projectId,
}: {
  projectId?: string | null;
}) {
  const initialized = useRef(false);

  useEffect(() => {
    const id = projectId?.trim() ?? "";

    if (!id) {
      return;
    }

    const clarityId: string = id;

    function applyConsent() {
      const granted = hasAnalyticsConsent();

      if (granted) {
        if (!initialized.current) {
          Clarity.init(clarityId);
          initialized.current = true;
        }

        Clarity.consentV2({
          ad_Storage: "denied",
          analytics_Storage: "granted",
        });
        return;
      }

      if (initialized.current) {
        Clarity.consentV2({
          ad_Storage: "denied",
          analytics_Storage: "denied",
        });
      }
    }

    applyConsent();
    window.addEventListener(CONSENT_EVENT, applyConsent);

    return () => {
      window.removeEventListener(CONSENT_EVENT, applyConsent);
    };
  }, [projectId]);

  return null;
}
