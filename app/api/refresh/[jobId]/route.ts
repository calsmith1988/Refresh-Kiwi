import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { cancelJob, getJob } from "@/lib/jobs/service";

export const runtime = "nodejs";

const { jobs } = schema;

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { jobId } = await context.params;

  try {
    const job = await getJob(jobId);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch job status";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { jobId } = await context.params;

  try {
    const [job] = await getDb()
      .select({ userId: jobs.userId })
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const user = await getCurrentUser();
    if (job.userId && job.userId !== user?.id) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const cancelled = await cancelJob(jobId);

    return NextResponse.json({ job: cancelled });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to cancel refresh";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
