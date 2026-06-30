import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { STATUS_MESSAGES, type JobStatus } from "@/lib/jobs/types";
import { getRenderDnsTarget } from "@/lib/render/domains";
import { homepageScreenshotPath } from "@/lib/screenshots/paths";
import {
  getLatestEditRequestsForUser,
  listPagesForJob,
  listOwnedWebsites,
  toPageResponse,
  toWebsiteResponse,
} from "@/lib/websites/service";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

const { jobs, websites: websiteRecords } = schema;
const ACTIVE_REFRESH_STATUSES = new Set<JobStatus>([
  "queued",
  "analyzing",
  "building_homepage",
  "homepage_ready",
]);

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to view websites" }, { status: 401 });
  }

  const [websites, latestEditRequests, userWebsiteJobs] = await Promise.all([
    listOwnedWebsites(user.id),
    getLatestEditRequestsForUser(user.id),
    getDb()
      .select({ jobId: websiteRecords.jobId })
      .from(websiteRecords)
      .where(eq(websiteRecords.userId, user.id)),
  ]);
  const websiteJobIds = new Set(userWebsiteJobs.map((website) => website.jobId));

  const [pagesEntries, jobEntries, userJobs] = await Promise.all([
    Promise.all(
      websites.map(async (website) => {
        const pages = await listPagesForJob(website.jobId);

        return [website.jobId, pages] as const;
      }),
    ),
    Promise.all(
      websites.map(async (website) => {
        const [job] = await getDb()
          .select({ id: jobs.id, status: jobs.status })
          .from(jobs)
          .where(eq(jobs.id, website.jobId))
          .limit(1);

        return [website.jobId, job?.status ?? null] as const;
      }),
    ),
    getDb()
      .select({
        id: jobs.id,
        sourceUrl: jobs.sourceUrl,
        generationMode: jobs.generationMode,
        creationPrompt: jobs.creationPrompt,
        slug: jobs.slug,
        brandName: jobs.brandName,
        status: jobs.status,
        errorMessage: jobs.errorMessage,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
      })
      .from(jobs)
      .where(eq(jobs.userId, user.id)),
  ]);
  const pagesByJob = new Map(pagesEntries);
  const statusByJob = new Map(jobEntries);
  const activeRefreshJobs = userJobs.filter(
    (job) => !websiteJobIds.has(job.id) && ACTIVE_REFRESH_STATUSES.has(job.status),
  );

  return NextResponse.json({
    activeRefreshJobs: activeRefreshJobs.map((job) => ({
      id: job.id,
      sourceUrl: job.generationMode === "fresh" ? null : job.sourceUrl,
      generationMode: job.generationMode,
      creationPrompt: job.creationPrompt,
      slug: job.slug,
      brandName: job.brandName,
      status: job.status,
      statusMessage: STATUS_MESSAGES[job.status],
      errorMessage: job.errorMessage,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    })),
    websites: websites.map((website) => {
      const latestEditRequest = latestEditRequests.get(website.id);
      const pages = pagesByJob.get(website.jobId) ?? [];

      return {
        ...toWebsiteResponse(website),
        jobStatus: statusByJob.get(website.jobId),
        homepageScreenshotUrl: homepageScreenshotPath(website.slug),
        customDomainDnsTarget: getRenderDnsTarget(),
        pages: pages.map(toPageResponse),
        latestEditRequest: latestEditRequest
          ? {
              id: latestEditRequest.id,
              prompt: latestEditRequest.prompt,
              status: latestEditRequest.status,
              errorMessage: latestEditRequest.errorMessage,
              createdAt: latestEditRequest.createdAt.toISOString(),
              updatedAt: latestEditRequest.updatedAt.toISOString(),
            }
          : null,
      };
    }),
  });
}
