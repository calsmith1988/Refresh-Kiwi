import { eq } from "drizzle-orm";

import {
  isCursorStartupError,
  runHomepagePhase,
} from "@/lib/cursor/agent";
import { getDb, schema } from "@/lib/db";
import { syncPreviewFromAgent } from "@/lib/preview/sync";
import { createWebsiteFromJob } from "@/lib/websites/service";
import type { JobStatus } from "@/lib/jobs/types";

const { jobs } = schema;

function elapsedSeconds(startedAt: number): string {
  return ((Date.now() - startedAt) / 1000).toFixed(1);
}

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
    const jobStartedAt = Date.now();
    await updateJob(jobId, { status: "analyzing" });
    await updateJob(jobId, { status: "building_homepage" });

    console.info(`[refresh-kiwi] job ${jobId} starting homepage phase slug=${job.slug}`);

    const homepageStartedAt = Date.now();
    const homepage = await runHomepagePhase(
      {
        sourceUrl: job.sourceUrl,
        slug: job.slug,
      },
      async (started) => {
        await updateJob(jobId, {
          homepageAgentId: started.agentId,
          homepageRunId: started.runId,
        });
      },
    );

    console.info(
      `[refresh-kiwi] job ${jobId} homepage phase finished in ${elapsedSeconds(homepageStartedAt)}s slug=${job.slug}`,
    );

    const syncStartedAt = Date.now();
    await syncPreviewFromAgent(homepage.agentId, job.slug);

    console.info(
      `[refresh-kiwi] job ${jobId} preview sync finished in ${elapsedSeconds(syncStartedAt)}s slug=${job.slug}`,
    );

    await updateJob(jobId, {
      status: "homepage_ready",
    });

    await createWebsiteFromJob(jobId);

    console.info(
      `[refresh-kiwi] job ${jobId} homepage ready in ${elapsedSeconds(jobStartedAt)}s slug=${job.slug}`,
    );
  } catch (error) {
    const technicalMessage = isCursorStartupError(error)
      ? `Cursor agent failed to start: ${error.message}`
      : error instanceof Error
        ? error.message
        : "Unknown error";

    console.error(`[refresh-kiwi] job ${jobId} failed: ${technicalMessage}`);

    // Users only ever see this friendly message; the technical detail above
    // stays in the server logs.
    await updateJob(jobId, {
      status: "failed" as JobStatus,
      errorMessage:
        "We couldn't finish refreshing your website this time. It's not you — some sites are tricky to read.",
    });
  }
}
