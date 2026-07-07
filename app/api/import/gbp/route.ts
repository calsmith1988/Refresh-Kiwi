import { NextResponse } from "next/server";

import { isSupportedImageType, MAX_UPLOAD_BYTES } from "@/lib/assets/localize";
import { optimizeImage } from "@/lib/assets/optimize";
import { seedWebsiteAssets, type SeedAssetInput } from "@/lib/assets/seed";
import { validateImageBuffer } from "@/lib/assets/validate";
import { assertRateLimit, rateLimitKey } from "@/lib/auth/rateLimit";
import { rateLimitResponse } from "@/lib/auth/rateLimitResponse";
import { getCurrentUser } from "@/lib/auth/session";
import { buildGoogleBusinessBrief } from "@/lib/google/brief";
import { downloadPhoto, getPlaceDetails, isPlacesEnabled } from "@/lib/google/places";
import {
  checkRefreshLimit,
  clientIpFromRequest,
} from "@/lib/jobs/rate-limit";
import { createGbpJob } from "@/lib/jobs/service";
import { createJobAccessToken } from "@/lib/jobs/token";
import { metaUserDataFromRequest, sendMetaEvent } from "@/lib/meta/events";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import { enqueueBackgroundTask } from "@/lib/worker/queue";
import { userHasProPlan } from "@/lib/websites/service";

export const runtime = "nodejs";

const MAX_SELECTED_PHOTOS = 8;

type GbpImportBody = {
  placeId?: string;
  selectedPhotoNames?: unknown;
  metaEventId?: string;
  turnstileToken?: string;
};

function selectedPhotoNames(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, MAX_SELECTED_PHOTOS);
}

async function photoToSeedAsset(photoName: string): Promise<SeedAssetInput | null> {
  const photo = await downloadPhoto(photoName, 1600);

  if (!photo) {
    return null;
  }

  if (photo.buffer.byteLength > MAX_UPLOAD_BYTES) {
    return null;
  }

  const sniffedType = validateImageBuffer(photo.buffer);

  if (!sniffedType || !isSupportedImageType(sniffedType)) {
    return null;
  }

  const optimized = await optimizeImage(photo.buffer, sniffedType);

  return {
    role: "image",
    buffer: optimized.buffer,
    contentType: optimized.contentType,
    originalName: `${photoName.split("/").at(-1) ?? "google-photo"}.jpg`,
  };
}

export async function POST(request: Request) {
  if (!isPlacesEnabled()) {
    return NextResponse.json({ error: "Google business import is not configured" }, { status: 404 });
  }

  let body: GbpImportBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const placeId = String(body.placeId ?? "").trim();

  if (!placeId) {
    return NextResponse.json({ error: "Choose a business listing first." }, { status: 400 });
  }

  try {
    const currentUser = await getCurrentUser();
    const clientIp = clientIpFromRequest(request);

    if (!currentUser) {
      const verification = await verifyTurnstileToken(
        body.turnstileToken ?? null,
        clientIp,
      );

      if (!verification.ok) {
        return NextResponse.json({ error: verification.message }, { status: 400 });
      }
    }

    await assertRateLimit(rateLimitKey(request, "gbp-import-create"), {
      limit: currentUser ? 10 : 3,
      windowMs: 10 * 60 * 1000,
      message: "Too many Google listing imports. Please wait a moment and try again.",
    });

    const limit = await checkRefreshLimit({
      userId: currentUser?.id ?? null,
      isPro: currentUser ? await userHasProPlan(currentUser.id) : false,
      clientIp,
    });

    if (!limit.ok) {
      return NextResponse.json({ error: limit.message }, { status: 429 });
    }

    const place = await getPlaceDetails(placeId);
    const allowedPhotoNames = new Set(place.photos.map((photo) => photo.name));
    const requestedPhotoNames = selectedPhotoNames(body.selectedPhotoNames).filter(
      (photoName) => allowedPhotoNames.has(photoName),
    );
    const seedAssets = (
      await Promise.all(requestedPhotoNames.map((photoName) => photoToSeedAsset(photoName)))
    ).filter((asset): asset is SeedAssetInput => Boolean(asset));

    const prompt = buildGoogleBusinessBrief(place);
    const job = await createGbpJob(
      { creationPrompt: prompt, businessName: place.name },
      currentUser?.id ?? null,
      clientIp,
    );

    if (seedAssets.length > 0) {
      await seedWebsiteAssets(job.slug, seedAssets);
    }

    const metaEventId = body.metaEventId || `lead.${job.id}`;

    await sendMetaEvent({
      eventName: "Lead",
      eventId: metaEventId,
      eventSourceUrl: request.headers.get("referer"),
      userData: metaUserDataFromRequest(request, { email: currentUser?.email }),
      customData: {
        content_name: "Google Business Profile website creation request",
        source_type: "google_business_profile",
        google_place_id: place.placeId,
      },
    });

    await enqueueBackgroundTask({
      type: "fresh-homepage",
      payload: {
        jobId: job.id,
        generateStarterVisuals: seedAssets.length === 0,
      },
    });

    return NextResponse.json(
      { ...job, accessToken: createJobAccessToken(job.id) },
      { status: 202 },
    );
  } catch (error) {
    const limited = rateLimitResponse(error);
    if (limited) {
      return limited;
    }

    const message =
      error instanceof Error
        ? error.message
        : "Failed to create a website from that Google listing";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
