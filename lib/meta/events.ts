import { createHash } from "node:crypto";

import {
  getMetaConversionsApiAccessToken,
  getMetaPixelId,
  getMetaTestEventCode,
} from "@/lib/meta/config";
import { clientIpFromRequest } from "@/lib/security/client-ip";

export type MetaEventName =
  | "ViewContent"
  | "Lead"
  | "InitiateCheckout"
  | "Subscribe";

type MetaUserData = {
  email?: string | null;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
};

type SendMetaEventParams = {
  eventName: MetaEventName;
  eventId: string;
  eventSourceUrl?: string | null;
  userData?: MetaUserData;
  customData?: Record<string, string | number | boolean | null | undefined>;
};

function sha256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function cookieValue(request: Request, name: string): string | null {
  const cookie = request.headers.get("cookie");

  if (!cookie) {
    return null;
  }

  const match = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export function metaUserDataFromRequest(
  request: Request,
  params?: { email?: string | null },
): MetaUserData {
  return {
    email: params?.email ?? null,
    clientIpAddress: clientIpFromRequest(request),
    clientUserAgent: request.headers.get("user-agent"),
    fbp: cookieValue(request, "_fbp"),
    fbc: cookieValue(request, "_fbc"),
  };
}

function cleanCustomData(
  customData: SendMetaEventParams["customData"],
): Record<string, string | number | boolean> | undefined {
  if (!customData) {
    return undefined;
  }

  const entries = Object.entries(customData).filter((entry): entry is [
    string,
    string | number | boolean,
  ] => entry[1] !== null && entry[1] !== undefined);

  return entries.length ? Object.fromEntries(entries) : undefined;
}

function buildUserData(userData: MetaUserData | undefined) {
  if (!userData) {
    return undefined;
  }

  return {
    em: userData.email ? [sha256(userData.email)] : undefined,
    client_ip_address: userData.clientIpAddress ?? undefined,
    client_user_agent: userData.clientUserAgent ?? undefined,
    fbp: userData.fbp ?? undefined,
    fbc: userData.fbc ?? undefined,
  };
}

export async function sendMetaEvent(params: SendMetaEventParams): Promise<void> {
  const pixelId = getMetaPixelId();
  const accessToken = getMetaConversionsApiAccessToken();

  if (!pixelId || !accessToken) {
    return;
  }

  const payload = {
    data: [
      {
        event_name: params.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: params.eventId,
        action_source: "website",
        event_source_url: params.eventSourceUrl ?? undefined,
        user_data: buildUserData(params.userData),
        custom_data: cleanCustomData(params.customData),
      },
    ],
    test_event_code: getMetaTestEventCode() ?? undefined,
  };

  const response = await fetch(
    `https://graph.facebook.com/v20.0/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    console.error(
      `[refresh-kiwi] Meta CAPI ${params.eventName} failed (${response.status})`,
      await response.text(),
    );
  }
}
