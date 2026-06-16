export function getMetaPixelId(): string | null {
  return process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || null;
}

export function getMetaConversionsApiAccessToken(): string | null {
  return process.env.META_CONVERSIONS_API_ACCESS_TOKEN?.trim() || null;
}

export function getMetaTestEventCode(): string | null {
  return process.env.META_TEST_EVENT_CODE?.trim() || null;
}
