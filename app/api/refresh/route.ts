import { NextResponse } from "next/server";

import { createRefreshJob, failJob } from "@/lib/jobs/service";

export const runtime = "nodejs";

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    return parsed.toString();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let body: { url?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sourceUrl = normalizeUrl(body.url ?? "");

  if (!sourceUrl) {
    return NextResponse.json({ error: "A valid website URL is required" }, { status: 400 });
  }

  try {
    const job = await createRefreshJob(sourceUrl);

    void import("@/lib/jobs/processor")
      .then(({ processRefreshJob }) => processRefreshJob(job.id))
      .catch(async (error) => {
        const message =
          error instanceof Error
            ? error.message
            : "Background refresh worker failed to start";
        console.error(`Refresh job ${job.id} failed`, error);
        await failJob(job.id, message);
      });

    return NextResponse.json(job, { status: 202 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create refresh job";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
