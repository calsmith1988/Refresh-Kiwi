import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import {
  getLatestEditRequestsForUser,
  listPagesForJob,
  listOwnedWebsites,
  toPageResponse,
  toWebsiteResponse,
} from "@/lib/websites/service";
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

const { jobs } = schema;

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to view websites" }, { status: 401 });
  }

  const [websites, latestEditRequests] = await Promise.all([
    listOwnedWebsites(user.id),
    getLatestEditRequestsForUser(user.id),
  ]);

  const [pagesEntries, jobEntries] = await Promise.all([
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
  ]);
  const pagesByJob = new Map(pagesEntries);
  const statusByJob = new Map(jobEntries);

  return NextResponse.json({
    websites: websites.map((website) => {
      const latestEditRequest = latestEditRequests.get(website.id);
      const pages = pagesByJob.get(website.jobId) ?? [];

      return {
        ...toWebsiteResponse(website),
        jobStatus: statusByJob.get(website.jobId),
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
