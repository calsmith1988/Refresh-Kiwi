import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { type LegalAnswers, validateLegalAnswers } from "@/lib/legal/draft";
import { enqueueBackgroundTask } from "@/lib/worker/queue";
import {
  getOwnedWebsite,
  listPagesForJob,
  toPageResponse,
  userHasProPlan,
} from "@/lib/websites/service";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

const { jobs } = schema;

type PageGenerationBody = {
  type?: "business" | "legal";
  answers?: unknown;
};

interface RouteContext {
  params: Promise<{ websiteId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in to generate additional pages" },
      { status: 401 },
    );
  }

  const hasPro = await userHasProPlan(user.id);

  if (!hasPro) {
    return NextResponse.json(
      { error: "Upgrade to Pro to generate additional pages." },
      { status: 402 },
    );
  }

  const { websiteId } = await context.params;
  const website = await getOwnedWebsite({ websiteId, userId: user.id });
  const rawBody = await request.json().catch(() => ({}));
  const body =
    rawBody && typeof rawBody === "object"
      ? (rawBody as PageGenerationBody)
      : {};
  const generationType = body.type === "legal" ? "legal" : "business";
  let legalAnswers: LegalAnswers | null = null;

  try {
    legalAnswers =
      generationType === "legal" ? validateLegalAnswers(body.answers) : null;
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

  if (!website) {
    return NextResponse.json({ error: "Website not found" }, { status: 404 });
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
    payload: legalAnswers
      ? {
          websiteId: website.id,
          type: "legal",
          answers: legalAnswers as unknown as Record<string, unknown>,
        }
      : { websiteId: website.id, type: "business" },
  });

  const pages = await listPagesForJob(job.id);

  return NextResponse.json({
    queued: true,
    message:
      generationType === "legal"
        ? "Legal page generation started."
        : "Additional page generation started.",
    pages: pages.map(toPageResponse),
  });
}
