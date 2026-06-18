import { readFile } from "node:fs/promises";
import path from "node:path";

import { eq } from "drizzle-orm";

import { localizeWebsiteImages } from "@/lib/assets/localize";
import {
  isCursorStartupError,
  runAdditionalPagesPhase,
  runLegalPagesPhase,
} from "@/lib/cursor/agent";
import { getDb, schema } from "@/lib/db";
import { draftLegalPages, type LegalAnswers } from "@/lib/legal/draft";
import { previewDirectory } from "@/lib/preview/paths";
import { syncPreviewFromAgent } from "@/lib/preview/sync";
import { listPagesForJob, upsertPagesForJob } from "@/lib/websites/service";

const { jobs, websites } = schema;

type SiteJsonPage = {
  path?: string;
  title?: string;
  gated?: boolean;
};

type SiteJson = {
  pages?: SiteJsonPage[];
};

type PageGenerationOptions =
  | { type?: "business" }
  | { type: "legal"; answers: LegalAnswers };

const LEGAL_PAGE_PATTERN = /(privacy|cookie|cookies|terms|legal|gdpr)/i;

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

async function describeExistingLegalPages(jobId: string): Promise<string> {
  const existingPages = await listPagesForJob(jobId);
  const legalPages = existingPages.filter(
    (page) => LEGAL_PAGE_PATTERN.test(page.path) || LEGAL_PAGE_PATTERN.test(page.title),
  );

  if (legalPages.length === 0) {
    return "No legal pages are currently registered in this refreshed site. Still check the source website for legal links before creating starter pages.";
  }

  return `The refreshed site already has these likely legal pages registered: ${legalPages
    .map((page) => `${page.title} (${page.path})`)
    .join(", ")}. Preserve and restyle existing legal content where possible instead of recreating it blindly.`;
}

export async function processAdditionalPages(
  websiteId: string,
  options: PageGenerationOptions = { type: "business" },
): Promise<void> {
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

    const pagesRun =
      options.type === "legal"
        ? await runLegalPagesPhase(
            {
              sourceUrl: website.sourceUrl,
              slug: website.slug,
              agentId: job.homepageAgentId,
              legalDraft: await draftLegalPages(options.answers),
              existingLegalSummary: await describeExistingLegalPages(job.id),
            },
            async (started) => {
              await updateJob(job.id, {
                pagesAgentId: started.agentId,
                pagesRunId: started.runId,
              });
            },
          )
        : await runAdditionalPagesPhase(
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

    // New pages hotlink images from the source site; bring them in-house.
    await localizeWebsiteImages(website.slug);

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
