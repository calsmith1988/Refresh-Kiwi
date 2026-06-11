import { eq } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";
import { previewPublicPath } from "@/lib/preview/paths";
import { resolveUniqueSlug, slugFromUrl } from "@/lib/jobs/slug";
import { STATUS_MESSAGES, type JobResponse, type JobStatus } from "@/lib/jobs/types";

const { jobs, websites } = schema;

const PREVIEW_READY_STATUSES = new Set<JobStatus>([
  "homepage_ready",
  "building_pages",
  "complete",
]);

function toJobResponse(
  job: typeof jobs.$inferSelect,
  website: typeof websites.$inferSelect | null = null,
): JobResponse {
  // A deleted (archived) or expired website no longer has a viewable preview,
  // even though the underlying job finished successfully.
  const websiteBlocked =
    website?.status === "archived" || website?.status === "expired";
  const previewUrl =
    PREVIEW_READY_STATUSES.has(job.status) && !websiteBlocked
      ? previewPublicPath(job.slug)
      : null;

  return {
    id: job.id,
    sourceUrl: job.sourceUrl,
    slug: job.slug,
    websiteId: website?.id ?? null,
    brandName: job.brandName,
    status: job.status,
    statusMessage: STATUS_MESSAGES[job.status],
    websiteStatus: website?.status ?? null,
    previewUrl,
    expiresAt: website?.expiresAt.toISOString() ?? null,
    freeEditsRemaining: website
      ? Math.max(0, website.freeEditsLimit - website.freeEditsUsed)
      : null,
    isClaimed: Boolean(website?.userId),
    errorMessage: job.errorMessage,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

export async function createRefreshJob(
  sourceUrl: string,
  userId?: string | null,
): Promise<JobResponse> {
  const db = getDb();
  const baseSlug = slugFromUrl(sourceUrl);

  const slug = await resolveUniqueSlug(baseSlug, async (candidate) => {
    const existing = await db
      .select({ id: jobs.id })
      .from(jobs)
      .where(eq(jobs.slug, candidate))
      .limit(1);

    return existing.length > 0;
  });

  const [job] = await db
    .insert(jobs)
    .values({
      sourceUrl,
      slug,
      userId: userId ?? null,
      status: "queued",
    })
    .returning();

  return toJobResponse(job);
}

export async function failJob(jobId: string, errorMessage: string): Promise<void> {
  const db = getDb();

  await db
    .update(jobs)
    .set({
      status: "failed",
      errorMessage,
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, jobId));
}

export async function getJob(jobId: string): Promise<JobResponse | null> {
  const db = getDb();

  const [job] = await db
    .select()
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);

  if (!job) {
    return null;
  }

  const [website] = await db
    .select()
    .from(websites)
    .where(eq(websites.jobId, jobId))
    .limit(1);

  return toJobResponse(job, website ?? null);
}
