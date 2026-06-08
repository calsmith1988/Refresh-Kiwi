import { eq } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";
import { previewPublicPath } from "@/lib/preview/paths";
import { resolveUniqueSlug, slugFromUrl } from "@/lib/jobs/slug";
import { STATUS_MESSAGES, type JobResponse, type JobStatus } from "@/lib/jobs/types";

const { jobs } = schema;

const PREVIEW_READY_STATUSES = new Set<JobStatus>([
  "homepage_ready",
  "building_pages",
  "complete",
]);

function toJobResponse(job: typeof jobs.$inferSelect): JobResponse {
  const previewUrl = PREVIEW_READY_STATUSES.has(job.status)
    ? previewPublicPath(job.slug)
    : null;
  const normalizedPreviewUrl = previewUrl
    ? new URL(previewUrl, "https://refresh-kiwi.local").pathname
    : null;

  return {
    id: job.id,
    sourceUrl: job.sourceUrl,
    slug: job.slug,
    brandName: job.brandName,
    status: job.status,
    statusMessage: STATUS_MESSAGES[job.status],
    previewUrl: normalizedPreviewUrl,
    errorMessage: job.errorMessage,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

export async function createRefreshJob(sourceUrl: string): Promise<JobResponse> {
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

  return job ? toJobResponse(job) : null;
}
