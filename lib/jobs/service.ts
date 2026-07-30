import { eq } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";
import type { JobAttribution } from "@/lib/jobs/attribution";
import { previewPublicPath } from "@/lib/preview/paths";
import { normalizeSlug, resolveUniqueSlug, slugFromUrl } from "@/lib/jobs/slug";
import { STATUS_MESSAGES, type JobResponse, type JobStatus } from "@/lib/jobs/types";

const { jobs, websites } = schema;

const PREVIEW_READY_STATUSES = new Set<JobStatus>([
  "homepage_ready",
  "building_pages",
  "complete",
]);

function internalFreshSourceUrl(slug: string): string {
  return `https://refresh.kiwi/fresh/${slug}`;
}

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
    sourceUrl: job.generationMode === "fresh" ? null : job.sourceUrl,
    generationMode: job.generationMode,
    creationPrompt: job.creationPrompt,
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

async function uniqueJobSlug(baseSlug: string): Promise<string> {
  const db = getDb();

  return resolveUniqueSlug(baseSlug, async (candidate) => {
    // A new slug must not collide with an existing job slug or with a
    // subdomain another website has claimed on the sites domain.
    const [existingJob, existingSubdomain] = await Promise.all([
      db
        .select({ id: jobs.id })
        .from(jobs)
        .where(eq(jobs.slug, candidate))
        .limit(1),
      db
        .select({ id: websites.id })
        .from(websites)
        .where(eq(websites.subdomain, candidate))
        .limit(1),
    ]);

    return existingJob.length > 0 || existingSubdomain.length > 0;
  });
}

export function slugFromPrompt(prompt: string): string {
  const firstUsefulLine =
    prompt
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? "";
  const withoutLabel = firstUsefulLine.replace(
    /^(business|company|brand|name|website)\s*[:\-]\s*/i,
    "",
  );
  const firstSentence = withoutLabel.split(/[.!?]/)[0] ?? withoutLabel;
  const compact = firstSentence.split(/\s+/).slice(0, 5).join(" ");

  return normalizeSlug(compact) || "fresh-site";
}

function attributionValues(attribution?: JobAttribution | null) {
  return {
    utmSource: attribution?.utmSource ?? null,
    utmMedium: attribution?.utmMedium ?? null,
    utmCampaign: attribution?.utmCampaign ?? null,
    referrer: attribution?.referrer ?? null,
  };
}

export async function createRefreshJob(
  sourceUrl: string,
  userId?: string | null,
  clientIp?: string | null,
  attribution?: JobAttribution | null,
): Promise<JobResponse> {
  const db = getDb();
  const baseSlug = slugFromUrl(sourceUrl);
  const slug = await uniqueJobSlug(baseSlug);

  const [job] = await db
    .insert(jobs)
    .values({
      sourceUrl,
      generationMode: "refresh",
      slug,
      userId: userId ?? null,
      clientIp: clientIp ?? null,
      status: "queued",
      ...attributionValues(attribution),
    })
    .returning();

  return toJobResponse(job);
}

export async function createFreshJob(
  creationPrompt: string,
  userId?: string | null,
  clientIp?: string | null,
  attribution?: JobAttribution | null,
): Promise<JobResponse> {
  const db = getDb();
  const slug = await uniqueJobSlug(slugFromPrompt(creationPrompt));

  const [job] = await db
    .insert(jobs)
    .values({
      sourceUrl: internalFreshSourceUrl(slug),
      generationMode: "fresh",
      creationPrompt,
      slug,
      userId: userId ?? null,
      clientIp: clientIp ?? null,
      status: "queued",
      ...attributionValues(attribution),
    })
    .returning();

  return toJobResponse(job);
}

export async function createGbpJob(
  params: {
    creationPrompt: string;
    businessName: string;
  },
  userId?: string | null,
  clientIp?: string | null,
  attribution?: JobAttribution | null,
): Promise<JobResponse> {
  const db = getDb();
  const slug = await uniqueJobSlug(
    normalizeSlug(params.businessName) || slugFromPrompt(params.creationPrompt),
  );

  const [job] = await db
    .insert(jobs)
    .values({
      sourceUrl: internalFreshSourceUrl(slug),
      generationMode: "fresh",
      creationPrompt: params.creationPrompt,
      slug,
      brandName: params.businessName,
      userId: userId ?? null,
      clientIp: clientIp ?? null,
      status: "queued",
      ...attributionValues(attribution),
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

export async function cancelJob(jobId: string): Promise<JobResponse | null> {
  const db = getDb();
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);

  if (!job) {
    return null;
  }

  if (job.status === "complete" || job.status === "failed") {
    return getJob(jobId);
  }

  await db
    .update(jobs)
    .set({
      status: "failed",
      errorMessage: "Refresh cancelled.",
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, jobId));

  return getJob(jobId);
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
