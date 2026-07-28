import { eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { verifyJobAccessToken } from "@/lib/jobs/token";

const { jobs } = schema;

export function jobAccessTokenFromRequest(request: Request): string | null {
  return (
    request.headers.get("x-job-token") ??
    new URL(request.url).searchParams.get("token")
  );
}

/**
 * A job may only be acted on by its owner (signed-in creator or claimer) or by
 * whoever holds the access token issued at creation — which is how anonymous
 * visitors poll and cancel their own refresh. Callers should return 404 rather
 * than 403 so job ids can't be probed.
 */
export async function isAuthorizedForJob(
  request: Request,
  jobId: string,
): Promise<boolean> {
  if (verifyJobAccessToken(jobId, jobAccessTokenFromRequest(request))) {
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
