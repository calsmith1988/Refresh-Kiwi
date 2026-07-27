/**
 * Client-side marketing attribution capture. UTM params and the external
 * referrer only exist on the first page view, so they're captured once per
 * browser session and attached to generation requests later in the visit.
 */

const STORAGE_KEY = "rk_attribution";

export type StoredAttribution = {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  referrer: string | null;
};

export function captureAttribution(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (window.sessionStorage.getItem(STORAGE_KEY)) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const referrer = document.referrer;
    const externalReferrer =
      referrer && !referrer.startsWith(window.location.origin)
        ? referrer
        : null;

    const attribution: StoredAttribution = {
      utmSource: params.get("utm_source"),
      utmMedium: params.get("utm_medium"),
      utmCampaign: params.get("utm_campaign"),
      referrer: externalReferrer,
    };

    if (Object.values(attribution).some((value) => value)) {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
    }
  } catch {
    // Session storage can be unavailable (private mode); attribution is
    // best-effort.
  }
}

export function getStoredAttribution(): StoredAttribution | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);

    return raw ? (JSON.parse(raw) as StoredAttribution) : null;
  } catch {
    return null;
  }
}
