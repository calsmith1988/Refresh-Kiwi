import { NextResponse } from "next/server";

import {
  isSupportedImageType,
  MAX_UPLOAD_BYTES,
} from "@/lib/assets/localize";
import { optimizeImage } from "@/lib/assets/optimize";
import { seedWebsiteAssets, type SeedAssetInput } from "@/lib/assets/seed";
import { assertRateLimit, rateLimitKey } from "@/lib/auth/rateLimit";
import { rateLimitResponse } from "@/lib/auth/rateLimitResponse";
import { getCurrentUser } from "@/lib/auth/session";
import {
  checkRefreshLimit,
  clientIpFromRequest,
} from "@/lib/jobs/rate-limit";
import { createFreshJob } from "@/lib/jobs/service";
import { metaUserDataFromRequest, sendMetaEvent } from "@/lib/meta/events";
import { enqueueBackgroundTask } from "@/lib/worker/queue";
import { userHasProPlan } from "@/lib/websites/service";

export const runtime = "nodejs";

const MIN_PROMPT_LENGTH = 20;
const MAX_PROMPT_LENGTH = 4_000;
const MAX_SUPPORTING_IMAGES = 8;
function wantsStarterVisuals(form: FormData): boolean {
  const value = String(form.get("generateStarterVisuals") ?? "").toLowerCase();

  return value === "1" || value === "true" || value === "on";
}

async function fileToSeedAsset(
  file: File,
  role: SeedAssetInput["role"],
): Promise<SeedAssetInput> {
  if (file.size === 0) {
    throw new Error("Uploaded images cannot be empty");
  }

  if (!isSupportedImageType(file.type)) {
    throw new Error("Use PNG, JPG, WebP, GIF, AVIF, or SVG images");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Each image must be under 15MB");
  }

  const optimized = await optimizeImage(
    Buffer.from(await file.arrayBuffer()),
    file.type,
  );

  return {
    role,
    buffer: optimized.buffer,
    contentType: optimized.contentType,
    originalName: file.name,
  };
}

export async function POST(request: Request) {
  let form: FormData;

  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form body" }, { status: 400 });
  }

  const prompt = String(form.get("prompt") ?? "").trim();

  if (prompt.length < MIN_PROMPT_LENGTH) {
    return NextResponse.json(
      { error: "Tell us a little more about the website you want to create." },
      { status: 400 },
    );
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json(
      { error: "Keep the brief under 4,000 characters for now." },
      { status: 400 },
    );
  }

  const imageEntries = form
    .getAll("images")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (imageEntries.length > MAX_SUPPORTING_IMAGES) {
    return NextResponse.json(
      { error: "Upload up to 8 supporting images for the first version." },
      { status: 400 },
    );
  }

  try {
    const seedAssets: SeedAssetInput[] = [];
    const logo = form.get("logo");
    const hasUploadedLogo = logo instanceof File && logo.size > 0;
    const shouldGenerateStarterVisuals =
      wantsStarterVisuals(form) && !hasUploadedLogo && imageEntries.length === 0;

    if (hasUploadedLogo) {
      seedAssets.push(await fileToSeedAsset(logo, "logo"));
    }

    for (const image of imageEntries) {
      seedAssets.push(await fileToSeedAsset(image, "image"));
    }

    const currentUser = await getCurrentUser();
    const clientIp = clientIpFromRequest(request);
    await assertRateLimit(rateLimitKey(request, "fresh-create"), {
      limit: currentUser ? 10 : 3,
      windowMs: 10 * 60 * 1000,
      message: "Too many creation attempts. Please wait a moment and try again.",
    });

    const limit = await checkRefreshLimit({
      userId: currentUser?.id ?? null,
      isPro: currentUser ? await userHasProPlan(currentUser.id) : false,
      clientIp,
    });

    if (!limit.ok) {
      return NextResponse.json({ error: limit.message }, { status: 429 });
    }

    const job = await createFreshJob(prompt, currentUser?.id ?? null, clientIp);
    if (seedAssets.length > 0) {
      await seedWebsiteAssets(job.slug, seedAssets);
    }

    const metaEventId = String(form.get("metaEventId") ?? "") || `lead.${job.id}`;

    await sendMetaEvent({
      eventName: "Lead",
      eventId: metaEventId,
      eventSourceUrl: request.headers.get("referer"),
      userData: metaUserDataFromRequest(request, { email: currentUser?.email }),
      customData: {
        content_name: "Fresh website creation request",
      },
    });

    await enqueueBackgroundTask({
      type: "fresh-homepage",
      payload: {
        jobId: job.id,
        generateStarterVisuals: shouldGenerateStarterVisuals,
      },
    });

    return NextResponse.json(job, { status: 202 });
  } catch (error) {
    const limited = rateLimitResponse(error);
    if (limited) {
      return limited;
    }

    const message =
      error instanceof Error ? error.message : "Failed to create fresh website";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
