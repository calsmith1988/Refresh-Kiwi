import { eq } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";
import { previewPublicPath } from "@/lib/preview/paths";
import { resolveUniqueSlug, slugFromUrl } from "@/lib/jobs/slug";
import { STATUS_MESSAGES, type JobResponse } from "@/lib/jobs/types";

const { jobs } = schema;

function toJobResponse(job: typeof jobs.$inferSelect): JobResponse {
  const previewUrl =
    job.status === "homepage_ready" || job.status === "complete"
      ? previewPublicPath(job.slug)
      : null;

  return {
    id: job.id,
    sourceUrl: job.sourceUrl,
    slug: job.slug,
    brandName: job.brandName,
    status: job.status,
    statusMessage: STATUS_MESSAGES[job.status],
    previewUrl,
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

export async function getJob(jobId: string): Promise<JobResponse | null> {
  const db = getDb();

  const [job] = await db
    .select()
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);

  return job ? toJobResponse(job) : null;
}
