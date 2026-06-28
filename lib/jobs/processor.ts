import { eq } from "drizzle-orm";

import { localizeWebsiteImages } from "@/lib/assets/localize";
import { seedWebsiteAssets, type SeedAssetInput } from "@/lib/assets/seed";
import {
  isCursorStartupError,
  runFreshHomepagePhase,
  runHomepagePhase,
} from "@/lib/cursor/agent";
import { getDb, schema } from "@/lib/db";
import { sendOnce } from "@/lib/email/events";
import { sendPreviewReadyEmail } from "@/lib/email/service";
import { syncPreviewFromAgent } from "@/lib/preview/sync";
import { tryCaptureHomepageScreenshot } from "@/lib/screenshots/homepage";
import { createWebsiteFromJob } from "@/lib/websites/service";
import type { JobStatus } from "@/lib/jobs/types";

const { jobs, users } = schema;

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

async function isJobStillActive(jobId: string): Promise<boolean> {
  const [job] = await getDb()
    .select({ status: jobs.status })
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);

  return Boolean(
    job &&
      job.status !== "failed" &&
      job.status !== "complete" &&
      job.status !== "homepage_ready",
  );
}

export async function processRefreshJob(jobId: string): Promise<void> {
  const db = getDb();

  const [job] = await db
    .select()
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);

  if (!job || job.status !== "queued" || job.generationMode !== "refresh") {
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
        sourceUrl: job.sourceUrl ?? "",
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

    if (!(await isJobStillActive(jobId))) {
      console.info(`[refresh-kiwi] job ${jobId} stopped before preview sync`);
      return;
    }

    const syncStartedAt = Date.now();
    await syncPreviewFromAgent(homepage.agentId, job.slug);

    console.info(
      `[refresh-kiwi] job ${jobId} preview sync finished in ${elapsedSeconds(syncStartedAt)}s slug=${job.slug}`,
    );

    if (!(await isJobStillActive(jobId))) {
      console.info(`[refresh-kiwi] job ${jobId} stopped after preview sync`);
      return;
    }

    await updateJob(jobId, {
      status: "homepage_ready",
    });

    const website = await createWebsiteFromJob(jobId);
    await tryCaptureHomepageScreenshot(job.slug);

    console.info(
      `[refresh-kiwi] job ${jobId} homepage ready in ${elapsedSeconds(jobStartedAt)}s slug=${job.slug}`,
    );

    // Signed-in users own their website immediately (no claim step), so
    // bring hotlinked images in-house now. Anonymous previews are localised
    // later, when the visitor signs up and claims the site.
    if (website.userId) {
      await localizeWebsiteImages(job.slug);
      const [user] = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, website.userId))
        .limit(1);

      if (user) {
        await sendOnce(
          {
            type: "preview_ready",
            userId: website.userId,
            websiteId: website.id,
          },
          () =>
            sendPreviewReadyEmail({
              to: user.email,
              brandName: website.brandName,
              previewUrl: `/preview/${website.slug}/index.html`,
            }),
        );
      }
    }
  } catch (error) {
    const technicalMessage = isCursorStartupError(error)
      ? `Cursor agent failed to start: ${error.message}`
      : error instanceof Error
        ? error.message
        : "Unknown error";

    console.error(`[refresh-kiwi] job ${jobId} failed: ${technicalMessage}`);

    // Users only ever see this friendly message; the technical detail above
    // stays in the server logs.
    const [currentJob] = await db
      .select({ errorMessage: jobs.errorMessage, status: jobs.status })
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (
      currentJob?.status === "failed" &&
      currentJob.errorMessage === "Refresh cancelled."
    ) {
      return;
    }

    await updateJob(jobId, {
      status: "failed" as JobStatus,
      errorMessage:
        "We couldn't finish refreshing your website this time. It's not you — some sites are tricky to read.",
    });
  }
}

export async function processFreshJob(
  jobId: string,
  seedAssetInputs: SeedAssetInput[] = [],
): Promise<void> {
  const db = getDb();

  const [job] = await db
    .select()
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);

  if (!job || job.status !== "queued" || job.generationMode !== "fresh") {
    return;
  }

  try {
    const jobStartedAt = Date.now();
    await updateJob(jobId, { status: "analyzing" });

    const seedAssets = await seedWebsiteAssets(job.slug, seedAssetInputs);

    if (!(await isJobStillActive(jobId))) {
      console.info(`[refresh-kiwi] fresh job ${jobId} stopped before homepage`);
      return;
    }

    await updateJob(jobId, { status: "building_homepage" });

    console.info(`[refresh-kiwi] fresh job ${jobId} starting homepage phase slug=${job.slug}`);

    const homepageStartedAt = Date.now();
    const homepage = await runFreshHomepagePhase(
      {
        creationPrompt: job.creationPrompt ?? "",
        slug: job.slug,
        seedAssets: seedAssets.map((asset) => ({
          role: asset.role,
          file: asset.file,
          url: asset.url,
          contentType: asset.contentType,
          bytes: asset.bytes,
        })),
      },
      async (started) => {
        await updateJob(jobId, {
          homepageAgentId: started.agentId,
          homepageRunId: started.runId,
        });
      },
    );

    console.info(
      `[refresh-kiwi] fresh job ${jobId} homepage phase finished in ${elapsedSeconds(homepageStartedAt)}s slug=${job.slug}`,
    );

    if (!(await isJobStillActive(jobId))) {
      console.info(`[refresh-kiwi] fresh job ${jobId} stopped before preview sync`);
      return;
    }

    const syncStartedAt = Date.now();
    await syncPreviewFromAgent(homepage.agentId, job.slug);

    console.info(
      `[refresh-kiwi] fresh job ${jobId} preview sync finished in ${elapsedSeconds(syncStartedAt)}s slug=${job.slug}`,
    );

    if (!(await isJobStillActive(jobId))) {
      console.info(`[refresh-kiwi] fresh job ${jobId} stopped after preview sync`);
      return;
    }

    await updateJob(jobId, {
      status: "homepage_ready",
    });

    const website = await createWebsiteFromJob(jobId);
    await tryCaptureHomepageScreenshot(job.slug);

    console.info(
      `[refresh-kiwi] fresh job ${jobId} homepage ready in ${elapsedSeconds(jobStartedAt)}s slug=${job.slug}`,
    );

    if (website.userId) {
      await localizeWebsiteImages(job.slug);
      const [user] = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, website.userId))
        .limit(1);

      if (user) {
        await sendOnce(
          {
            type: "preview_ready",
            userId: website.userId,
            websiteId: website.id,
          },
          () =>
            sendPreviewReadyEmail({
              to: user.email,
              brandName: website.brandName,
              previewUrl: `/preview/${website.slug}/index.html`,
            }),
        );
      }
    }
  } catch (error) {
    const technicalMessage = isCursorStartupError(error)
      ? `Cursor fresh agent failed to start: ${error.message}`
      : error instanceof Error
        ? error.message
        : "Unknown error";

    console.error(`[refresh-kiwi] fresh job ${jobId} failed: ${technicalMessage}`);

    await updateJob(jobId, {
      status: "failed" as JobStatus,
      errorMessage:
        "We couldn't finish creating your website this time. Try adding a little more detail and start again.",
    });
  }
}
