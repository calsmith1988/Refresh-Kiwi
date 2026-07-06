import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Job access tokens: an HMAC capability returned once at job creation so the
 * creator (including anonymous visitors) can poll and cancel their own job.
 * Without one, GET /api/refresh/[jobId] would leak prompts and source URLs to
 * anyone holding a job id, and anonymous jobs could be cancelled by strangers.
 */

function getJobTokenSecret(): string {
  return (
    process.env.JOB_ACCESS_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    "refresh-kiwi-local-job-token"
  );
}

export function createJobAccessToken(jobId: string): string {
  return createHmac("sha256", getJobTokenSecret()).update(jobId).digest("hex");
}

export function verifyJobAccessToken(jobId: string, token: string | null): boolean {
  if (!token) {
    return false;
  }

  const expected = Buffer.from(createJobAccessToken(jobId));
  const provided = Buffer.from(token);

  return expected.length === provided.length && timingSafeEqual(expected, provided);
}
