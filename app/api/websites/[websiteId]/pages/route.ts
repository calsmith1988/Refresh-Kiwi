import { after, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import {
  getOwnedWebsite,
  listPagesForJob,
  toPageResponse,
  userHasProPlan,
} from "@/lib/websites/service";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

const { jobs } = schema;

interface RouteContext {
  params: Promise<{ websiteId: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in to generate additional pages" },
      { status: 401 },
    );
  }

  const hasPro = await userHasProPlan(user.id);

  if (!hasPro) {
    return NextResponse.json(
      { error: "Upgrade to Pro to generate additional pages." },
      { status: 402 },
    );
  }

  const { websiteId } = await context.params;
  const website = await getOwnedWebsite({ websiteId, userId: user.id });

  if (!website) {
    return NextResponse.json({ error: "Website not found" }, { status: 404 });
  }

  if (website.status === "archived") {
    return NextResponse.json(
      { error: "Archived websites cannot generate pages." },
      { status: 400 },
    );
  }

  const [job] = await getDb()
    .select()
    .from(jobs)
    .where(eq(jobs.id, website.jobId))
    .limit(1);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.status === "building_pages") {
    const pages = await listPagesForJob(job.id);

    return NextResponse.json({
      queued: true,
      message: "Additional pages are already being generated.",
      pages: pages.map(toPageResponse),
    });
  }

  await getDb()
    .update(jobs)
    .set({ status: "building_pages", errorMessage: null, updatedAt: new Date() })
    .where(eq(jobs.id, job.id));

  after(async () => {
    try {
      const { processAdditionalPages } = await import("@/lib/pages/processor");
      await processAdditionalPages(website.id);
    } catch (error) {
      console.error(
        `[refresh-kiwi] failed to start additional pages websiteId=${website.id}`,
        error,
      );
    }
  });

  const pages = await listPagesForJob(job.id);

  return NextResponse.json({
    queued: true,
    message: "Additional page generation started.",
    pages: pages.map(toPageResponse),
  });
}
