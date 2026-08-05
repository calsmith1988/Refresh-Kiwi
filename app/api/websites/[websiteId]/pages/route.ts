import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { type LegalAnswers, validateLegalAnswers } from "@/lib/legal/draft";
import { enqueueBackgroundTask } from "@/lib/worker/queue";
import {
  getOwnedWebsite,
  hasWebsiteProFeatures,
  listPagesForJob,
  toPageResponse,
  userHasProPlan,
} from "@/lib/websites/service";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

const { jobs } = schema;

type PageGenerationBody = {
  type?: "business" | "legal" | "custom";
  answers?: unknown;
  title?: unknown;
  brief?: unknown;
};

interface RouteContext {
  params: Promise<{ websiteId: string }>;
}

const CUSTOM_PAGE_TITLE_MAX_LENGTH = 80;
const CUSTOM_PAGE_BRIEF_MAX_LENGTH = 2000;

function readRequiredString(
  value: unknown,
  fieldName: string,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} is required.`);
  }

  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`${fieldName} is required.`);
  }

  if (trimmed.length > maxLength) {
    throw new Error(`${fieldName} must be ${maxLength} characters or fewer.`);
  }

  return trimmed;
}

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in to generate additional pages" },
      { status: 401 },
    );
  }

  const { websiteId } = await context.params;
  const website = await getOwnedWebsite({ websiteId, userId: user.id });

  if (!website) {
    return NextResponse.json({ error: "Website not found" }, { status: 404 });
  }

  const hasPro = hasWebsiteProFeatures({
    isComplimentary: website.isComplimentary,
    userIsPro: await userHasProPlan(user.id),
  });

  if (!hasPro) {
    return NextResponse.json(
      { error: "Upgrade to Pro to generate additional pages." },
      { status: 402 },
    );
  }

  const rawBody = await request.json().catch(() => ({}));
  const body =
    rawBody && typeof rawBody === "object"
      ? (rawBody as PageGenerationBody)
      : {};
  const generationType =
    body.type === "legal" || body.type === "custom" ? body.type : "business";
  let legalAnswers: LegalAnswers | null = null;
  let customPage: { title: string; brief: string } | null = null;

  try {
    legalAnswers =
      generationType === "legal" ? validateLegalAnswers(body.answers) : null;
    customPage =
      generationType === "custom"
        ? {
            title: readRequiredString(
              body.title,
              "Page name",
              CUSTOM_PAGE_TITLE_MAX_LENGTH,
            ),
            brief: readRequiredString(
              body.brief,
              "Page description",
              CUSTOM_PAGE_BRIEF_MAX_LENGTH,
            ),
          }
        : null;
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Check the legal page answers and try again.",
      },
      { status: 400 },
    );
  }

  if (website.status === "archived") {
    return NextResponse.json(
      { error: "Archived websites cannot generate pages." },
      { status: 400 },
    );
  }

  const [job] = await getDb()
    .select()
    .from(jobs)
    .where(eq(jobs.id, website.jobId))
    .limit(1);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.status === "building_pages") {
    const pages = await listPagesForJob(job.id);

    return NextResponse.json({
      queued: true,
      message: "Additional pages are already being generated.",
      pages: pages.map(toPageResponse),
    });
  }

  await getDb()
    .update(jobs)
    .set({ status: "building_pages", errorMessage: null, updatedAt: new Date() })
    .where(eq(jobs.id, job.id));

  await enqueueBackgroundTask({
    type: "additional-pages",
    payload:
      generationType === "legal" && legalAnswers
        ? {
            websiteId: website.id,
            type: "legal",
            answers: legalAnswers as unknown as Record<string, unknown>,
          }
        : generationType === "custom" && customPage
          ? {
              websiteId: website.id,
              type: "custom",
              title: customPage.title,
              brief: customPage.brief,
            }
          : { websiteId: website.id, type: "business" },
  });

  const pages = await listPagesForJob(job.id);

  return NextResponse.json({
    queued: true,
    message:
      generationType === "legal"
        ? "Legal page generation started."
        : generationType === "custom"
          ? "New page generation started."
        : "Additional page generation started.",
    pages: pages.map(toPageResponse),
  });
}
