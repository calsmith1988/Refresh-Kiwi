import { NextResponse } from "next/server";

import { isAuthorizedForJob } from "@/lib/jobs/access";
import { cancelJob, getJob } from "@/lib/jobs/service";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ jobId: string }>;
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
