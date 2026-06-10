import { readFile } from "node:fs/promises";
import path from "node:path";

import { eq } from "drizzle-orm";

import { isCursorStartupError, runAdditionalPagesPhase } from "@/lib/cursor/agent";
import { getDb, schema } from "@/lib/db";
import { previewDirectory } from "@/lib/preview/paths";
import { syncPreviewFromAgent } from "@/lib/preview/sync";
import { upsertPagesForJob } from "@/lib/websites/service";

const { jobs, websites } = schema;

type SiteJsonPage = {
  path?: string;
  title?: string;
  gated?: boolean;
};

type SiteJson = {
  pages?: SiteJsonPage[];
};

async function updateJob(
  jobId: string,
  values: Partial<typeof jobs.$inferInsert>,
) {
  await getDb()
    .update(jobs)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(jobs.id, jobId));
}

async function readGeneratedPages(slug: string) {
  const siteJsonPath = path.join(previewDirectory(slug), "site.json");
  const raw = await readFile(siteJsonPath, "utf8");
  const parsed = JSON.parse(raw) as SiteJson;

  return (parsed.pages ?? [])
    .filter((page) => page.path && page.title)
    .map((page) => ({
      path: page.path!,
      title: page.title!,
      gated: page.gated ?? false,
      status: "ready" as const,
    }));
}

export async function processAdditionalPages(websiteId: string): Promise<void> {
  const db = getDb();
  const [website] = await db
    .select()
    .from(websites)
    .where(eq(websites.id, websiteId))
    .limit(1);

  if (!website) {
    throw new Error("Website not found");
  }

  const [job] = await db
    .select()
    .from(jobs)
    .where(eq(jobs.id, website.jobId))
    .limit(1);

  if (!job) {
    throw new Error("Job not found");
  }

  try {
    await updateJob(job.id, { status: "building_pages" });

    const pagesRun = await runAdditionalPagesPhase(
      {
        sourceUrl: website.sourceUrl,
        slug: website.slug,
        agentId: job.homepageAgentId,
      },
      async (started) => {
        await updateJob(job.id, {
          pagesAgentId: started.agentId,
          pagesRunId: started.runId,
        });
      },
    );

    await syncPreviewFromAgent(pagesRun.agentId, website.slug);

    const generatedPages = await readGeneratedPages(website.slug);
    await upsertPagesForJob(website.jobId, generatedPages);

    await updateJob(job.id, { status: "complete" });
    await db
      .update(websites)
      .set({ updatedAt: new Date() })
      .where(eq(websites.id, website.id));
  } catch (error) {
    const message = isCursorStartupError(error)
      ? `Cursor agent failed to start: ${error.message}`
      : error instanceof Error
        ? error.message
        : "Unknown error";

    console.error(
      `[refresh-kiwi] additional pages failed websiteId=${websiteId}: ${message}`,
    );

    await updateJob(job.id, {
      status: "homepage_ready",
      errorMessage: message,
    });
  }
}
