"use client";

export type MetaBrowserEventName =
  | "ViewContent"
  | "Lead"
  | "InitiateCheckout"
  | "Subscribe";

type MetaPixelFunction = (
  ...args: unknown[]
) => void;

declare global {
  interface Window {
    fbq?: MetaPixelFunction;
  }
}

export function createMetaEventId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}.${crypto.randomUUID()}`;
  }

  return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2)}`;
}

export function trackMetaBrowserEvent(params: {
  eventName: MetaBrowserEventName;
  eventId: string;
  customData?: Record<string, string | number | boolean>;
}) {
  window.fbq?.("track", params.eventName, params.customData, {
    eventID: params.eventId,
  });
}
