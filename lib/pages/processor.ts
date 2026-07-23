import { readFile } from "node:fs/promises";
import path from "node:path";

import { eq } from "drizzle-orm";

import { localizeWebsiteImages } from "@/lib/assets/localize";
import {
  isCursorStartupError,
  runAdditionalPagesPhase,
  runCustomPagePhase,
  runLegalPagesPhase,
} from "@/lib/cursor/agent";
import { getDb, schema } from "@/lib/db";
import { draftLegalPages, type LegalAnswers } from "@/lib/legal/draft";
import { discoverLegalPagesFromSource } from "@/lib/legal/source";
import { previewDirectory } from "@/lib/preview/paths";
import { syncPreviewFromAgent } from "@/lib/preview/sync";
import { tryCaptureHomepageScreenshot } from "@/lib/screenshots/homepage";
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
  | { type: "legal"; answers: LegalAnswers }
  | { type: "custom"; title: string; brief: string };

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
    const generationType =
      options.type === "legal" || options.type === "custom"
        ? options.type
        : "business";
    await updateJob(job.id, { status: "building_pages" });
    console.info(
      `[refresh-kiwi] ${generationType} pages started websiteId=${websiteId} slug=${website.slug}`,
    );

    const legalDraft =
      options.type === "legal"
        ? await (async () => {
            console.info(
              `[refresh-kiwi] legal pages source discovery starting websiteId=${websiteId} slug=${website.slug}`,
            );
            const discoveredLegal =
              website.generationMode !== "fresh" && website.sourceUrl
              ? await discoverLegalPagesFromSource(website.sourceUrl)
              : {
                  pages: [],
                  content: "",
                  summary:
                    "This site was created from scratch, so there is no source website to inspect for existing legal pages.",
                };
            console.info(
              `[refresh-kiwi] legal pages source discovery complete websiteId=${websiteId} slug=${website.slug} found=${discoveredLegal.pages.length}`,
            );
            console.info(
              `[refresh-kiwi] legal pages draft starting websiteId=${websiteId} slug=${website.slug}`,
            );
            const registeredSummary = await describeExistingLegalPages(job.id);
            const draft = await draftLegalPages(
              options.answers,
              discoveredLegal.content,
            );
            console.info(
              `[refresh-kiwi] legal pages draft complete websiteId=${websiteId} slug=${website.slug}`,
            );
            return {
              draft,
              summary: `${registeredSummary}\n${discoveredLegal.summary}`,
            };
          })()
        : null;

    const recordPagesRun = async (started: {
      agentId: string;
      runId: string;
    }) => {
      await updateJob(job.id, {
        pagesAgentId: started.agentId,
        pagesRunId: started.runId,
      });
    };

    const pagesRun =
      options.type === "legal"
        ? await runLegalPagesPhase(
            {
              sourceUrl:
                website.generationMode === "fresh" ? null : website.sourceUrl,
              slug: website.slug,
              agentId: job.homepageAgentId,
              generationMode: website.generationMode,
              creationPrompt: website.creationPrompt,
              legalDraft: legalDraft?.draft ?? "",
              existingLegalSummary: legalDraft?.summary ?? "",
            },
            recordPagesRun,
          )
        : options.type === "custom"
          ? await runCustomPagePhase(
              {
                sourceUrl:
                  website.generationMode === "fresh" ? null : website.sourceUrl,
                slug: website.slug,
                agentId: job.homepageAgentId,
                generationMode: website.generationMode,
                creationPrompt: website.creationPrompt,
                title: options.title,
                brief: options.brief,
              },
              recordPagesRun,
            )
          : await runAdditionalPagesPhase(
              {
                sourceUrl: website.sourceUrl,
                slug: website.slug,
                agentId: job.homepageAgentId,
                generationMode: website.generationMode,
                creationPrompt: website.creationPrompt,
              },
              recordPagesRun,
            );

    console.info(
      `[refresh-kiwi] ${generationType} pages sync starting websiteId=${websiteId} slug=${website.slug}`,
    );
    await syncPreviewFromAgent(pagesRun.agentId, website.slug);
    console.info(
      `[refresh-kiwi] ${generationType} pages sync complete websiteId=${websiteId} slug=${website.slug}`,
    );

    // New pages may hotlink source images; bring them in-house.
    console.info(
      `[refresh-kiwi] ${generationType} pages image localisation starting websiteId=${websiteId} slug=${website.slug}`,
    );
    await localizeWebsiteImages(website.slug);
    console.info(
      `[refresh-kiwi] ${generationType} pages image localisation complete websiteId=${websiteId} slug=${website.slug}`,
    );

    const generatedPages = await readGeneratedPages(website.slug);
    await upsertPagesForJob(website.jobId, generatedPages);
    console.info(
      `[refresh-kiwi] ${generationType} pages registered ${generatedPages.length} pages websiteId=${websiteId} slug=${website.slug}`,
    );

    if (generationType === "business" || generationType === "custom") {
      await tryCaptureHomepageScreenshot(website.slug, {
        websiteId: website.id,
      });
    } else {
      await db
        .update(websites)
        .set({ updatedAt: new Date() })
        .where(eq(websites.id, website.id));
    }

    await updateJob(job.id, { status: "complete" });
  } catch (error) {
    const technicalMessage = isCursorStartupError(error)
      ? `Cursor agent failed to start: ${error.message}`
      : error instanceof Error
        ? error.message
        : "Unknown error";

    console.error(
      `[refresh-kiwi] additional pages failed websiteId=${websiteId}: ${technicalMessage}`,
    );

    // Users only ever see friendly copy; the technical detail above stays in
    // the server logs.
    await updateJob(job.id, {
      status: "homepage_ready",
      errorMessage:
        "We couldn't finish building your pages this time. Please try again.",
    });
  }
}
