import { eq } from "drizzle-orm";

import {
  isCursorStartupError,
  runAdditionalPagesPhase,
  runHomepagePhase,
} from "@/lib/cursor/agent";
import { getDb, schema } from "@/lib/db";
import { syncPreviewFromAgent } from "@/lib/preview/sync";
import type { JobStatus } from "@/lib/jobs/types";

const { jobs } = schema;

async function updateJob(
  jobId: string,
  values: Partial<typeof jobs.$inferInsert>,
) {
  const db = getDb();

  await db
    .update(jobs)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(jobs.id, jobId));
}

export async function processRefreshJob(jobId: string): Promise<void> {
  const db = getDb();

  const [job] = await db
    .select()
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);

  if (!job || job.status !== "queued") {
    return;
  }

  try {
    await updateJob(jobId, { status: "analyzing" });
    await updateJob(jobId, { status: "building_homepage" });

    const homepage = await runHomepagePhase({
      sourceUrl: job.sourceUrl,
      slug: job.slug,
    });

    await updateJob(jobId, {
      homepageAgentId: homepage.agentId,
      homepageRunId: homepage.runId,
    });

    await syncPreviewFromAgent(homepage.agentId, job.slug);

    await updateJob(jobId, {
      status: "homepage_ready",
      pagesAgentId: homepage.agentId,
    });

    await updateJob(jobId, { status: "building_pages" });

    const pages = await runAdditionalPagesPhase({
      sourceUrl: job.sourceUrl,
      slug: job.slug,
      agentId: homepage.agentId,
    });

    await updateJob(jobId, {
      pagesAgentId: pages.agentId,
      pagesRunId: pages.runId,
    });

    await syncPreviewFromAgent(pages.agentId, job.slug);

    await updateJob(jobId, { status: "complete" });
  } catch (error) {
    const message = isCursorStartupError(error)
      ? `Cursor agent failed to start: ${error.message}`
      : error instanceof Error
        ? error.message
        : "Unknown error";

    await updateJob(jobId, {
      status: "failed" as JobStatus,
      errorMessage: message,
    });
  }
}
