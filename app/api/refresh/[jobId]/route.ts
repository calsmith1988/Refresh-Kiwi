import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { cancelJob, getJob } from "@/lib/jobs/service";
import { verifyJobAccessToken } from "@/lib/jobs/token";

export const runtime = "nodejs";

const { jobs } = schema;

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

function tokenFromRequest(request: Request): string | null {
  return (
    request.headers.get("x-job-token") ??
    new URL(request.url).searchParams.get("token")
  );
}

/**
 * A job may only be read or cancelled by its owner (signed-in creator or
 * claimer) or by whoever holds the access token issued at creation — which is
 * how anonymous visitors poll their own refresh. Everyone else gets a 404 so
 * job ids can't be probed for prompts, source URLs, or cancellation.
 */
async function isAuthorizedForJob(
  request: Request,
  jobId: string,
): Promise<boolean> {
  if (verifyJobAccessToken(jobId, tokenFromRequest(request))) {
    return true;
  }

  const [job] = await getDb()
    .select({ userId: jobs.userId })
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);

  if (!job?.userId) {
    return false;
  }

  const user = await getCurrentUser();

  return job.userId === user?.id;
}

export async function GET(request: Request, context: RouteContext) {
  const { jobId } = await context.params;

  try {
    if (!(await isAuthorizedForJob(request, jobId))) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

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

export async function DELETE(request: Request, context: RouteContext) {
  const { jobId } = await context.params;

  try {
    if (!(await isAuthorizedForJob(request, jobId))) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const cancelled = await cancelJob(jobId);

    if (!cancelled) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ job: cancelled });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to cancel refresh";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
