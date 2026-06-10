import { and, desc, eq } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";

const { editRequests, jobs, users, websites } = schema;

const PREVIEW_EXPIRY_DAYS = 7;

export function previewExpiresAt(): Date {
  return new Date(Date.now() + PREVIEW_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
}

export function toWebsiteResponse(website: typeof websites.$inferSelect) {
  const editsRemaining =
    website.freeEditsLimit === null
      ? 0
      : Math.max(0, website.freeEditsLimit - website.freeEditsUsed);

  return {
    id: website.id,
    jobId: website.jobId,
    sourceUrl: website.sourceUrl,
    slug: website.slug,
    brandName: website.brandName,
    status: website.status,
    freeEditsUsed: website.freeEditsUsed,
    freeEditsLimit: website.freeEditsLimit,
    freeEditsRemaining: editsRemaining,
    customDomain: website.customDomain,
    expiresAt: website.expiresAt.toISOString(),
    publishedAt: website.publishedAt?.toISOString() ?? null,
    createdAt: website.createdAt.toISOString(),
    updatedAt: website.updatedAt.toISOString(),
  };
}

export async function createWebsiteFromJob(jobId: string) {
  const db = getDb();
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);

  if (!job) {
    throw new Error("Job not found");
  }

  const existing = await db
    .select()
    .from(websites)
    .where(eq(websites.jobId, jobId))
    .limit(1);

  if (existing[0]) {
    return existing[0];
  }

  const [website] = await db
    .insert(websites)
    .values({
      jobId: job.id,
      userId: job.userId,
      sourceUrl: job.sourceUrl,
      slug: job.slug,
      brandName: job.brandName,
      status: "preview",
      expiresAt: previewExpiresAt(),
    })
    .returning();

  return website;
}

export async function claimWebsite(params: { jobId: string; userId: string }) {
  const db = getDb();
  const website = await createWebsiteFromJob(params.jobId);

  if (website.userId && website.userId !== params.userId) {
    throw new Error("This website is already claimed");
  }

  const [updated] = await db
    .update(websites)
    .set({ userId: params.userId, updatedAt: new Date() })
    .where(eq(websites.id, website.id))
    .returning();

  await db
    .update(jobs)
    .set({ userId: params.userId, updatedAt: new Date() })
    .where(eq(jobs.id, params.jobId));

  return updated;
}

export async function getWebsiteForJob(jobId: string) {
  const [website] = await getDb()
    .select()
    .from(websites)
    .where(eq(websites.jobId, jobId))
    .limit(1);

  return website ?? null;
}

export async function getOwnedWebsite(params: {
  websiteId: string;
  userId: string;
}) {
  const [website] = await getDb()
    .select()
    .from(websites)
    .where(
      and(
        eq(websites.id, params.websiteId),
        eq(websites.userId, params.userId),
      ),
    )
    .limit(1);

  return website ?? null;
}

export async function listOwnedWebsites(userId: string) {
  return getDb()
    .select()
    .from(websites)
    .where(eq(websites.userId, userId))
    .orderBy(desc(websites.updatedAt));
}

export async function getLatestEditRequestsForUser(userId: string) {
  const ownedWebsites = await listOwnedWebsites(userId);

  const latestEdits = await Promise.all(
    ownedWebsites.map(async (website) => {
      const [editRequest] = await getDb()
        .select()
        .from(editRequests)
        .where(eq(editRequests.websiteId, website.id))
        .orderBy(desc(editRequests.createdAt))
        .limit(1);

      return [website.id, editRequest ?? null] as const;
    }),
  );

  return new Map(latestEdits);
}

export async function userHasProPlan(userId: string): Promise<boolean> {
  const [user] = await getDb()
    .select({
      plan: users.plan,
      subscriptionStatus: users.subscriptionStatus,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user?.plan === "pro" && user.subscriptionStatus === "active";
}
