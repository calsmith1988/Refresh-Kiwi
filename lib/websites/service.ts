import { and, desc, eq } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";

const { editRequests, jobs, users, websites } = schema;
const { jobPages } = schema;

const PREVIEW_EXPIRY_DAYS = 7;
const FREE_WEBSITE_LIMIT = 1;
const PRO_WEBSITE_LIMIT = 3;

type ProPlanCandidate = {
  plan: typeof users.$inferSelect.plan | null;
  subscriptionStatus: typeof users.$inferSelect.subscriptionStatus | null;
};

const PRO_SUBSCRIPTION_STATUSES = new Set<
  typeof users.$inferSelect.subscriptionStatus
>(["active", "trialing"]);

function isProUser(user: ProPlanCandidate) {
  return (
    user.plan === "pro" &&
    user.subscriptionStatus !== null &&
    PRO_SUBSCRIPTION_STATUSES.has(user.subscriptionStatus)
  );
}

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

export function toPageResponse(page: typeof jobPages.$inferSelect) {
  return {
    id: page.id,
    jobId: page.jobId,
    path: page.path,
    title: page.title,
    gated: page.gated,
    status: page.status,
    createdAt: page.createdAt.toISOString(),
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

  const [user] = await db
    .select({
      plan: users.plan,
      subscriptionStatus: users.subscriptionStatus,
    })
    .from(users)
    .where(eq(users.id, params.userId))
    .limit(1);

  if (!user) {
    throw new Error("User not found");
  }

  const ownedWebsites = await listOwnedWebsites(params.userId);
  const alreadyOwnsWebsite = ownedWebsites.some((owned) => owned.id === website.id);
  const websiteLimit = isProUser(user) ? PRO_WEBSITE_LIMIT : FREE_WEBSITE_LIMIT;

  if (!alreadyOwnsWebsite && ownedWebsites.length >= websiteLimit) {
    throw new Error(
      isProUser(user)
        ? "Your Pro plan includes up to 3 websites. Contact us to add more."
        : "Free accounts can save 1 website. Upgrade to Pro for up to 3 websites.",
    );
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

export async function listPagesForJob(jobId: string) {
  return getDb()
    .select()
    .from(jobPages)
    .where(eq(jobPages.jobId, jobId))
    .orderBy(jobPages.path);
}

export async function upsertPagesForJob(
  jobId: string,
  pages: Array<{ path: string; title: string; gated?: boolean; status?: "pending" | "building" | "ready" }>,
) {
  const db = getDb();
  const existingPages = await listPagesForJob(jobId);
  const existingByPath = new Map(existingPages.map((page) => [page.path, page]));
  const updatedPages: Array<typeof jobPages.$inferSelect> = [];

  for (const page of pages) {
    const normalizedPath = page.path.startsWith("/") ? page.path : `/${page.path}`;
    const title = page.title.trim() || normalizedPath;
    const existing = existingByPath.get(normalizedPath);

    if (existing) {
      const [updated] = await db
        .update(jobPages)
        .set({
          title,
          gated: page.gated ?? existing.gated,
          status: page.status ?? existing.status,
        })
        .where(eq(jobPages.id, existing.id))
        .returning();

      updatedPages.push(updated);
      continue;
    }

    const [created] = await db
      .insert(jobPages)
      .values({
        jobId,
        path: normalizedPath,
        title,
        gated: page.gated ?? false,
        status: page.status ?? "ready",
      })
      .returning();

    updatedPages.push(created);
  }

  return updatedPages;
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

export async function publishOwnedWebsite(params: {
  websiteId: string;
  userId: string;
}) {
  const website = await getOwnedWebsite(params);

  if (!website) {
    throw new Error("Website not found");
  }

  const [updated] = await getDb()
    .update(websites)
    .set({
      status: "live",
      publishedAt: website.publishedAt ?? new Date(),
      updatedAt: new Date(),
    })
    .where(eq(websites.id, website.id))
    .returning();

  return updated;
}

export async function getWebsiteAccessBySlug(slug: string) {
  const [website] = await getDb()
    .select({
      id: websites.id,
      status: websites.status,
      slug: websites.slug,
      expiresAt: websites.expiresAt,
      user: {
        plan: users.plan,
        subscriptionStatus: users.subscriptionStatus,
      },
    })
    .from(websites)
    .leftJoin(users, eq(websites.userId, users.id))
    .where(eq(websites.slug, slug))
    .limit(1);

  if (!website) {
    return null;
  }

  const userIsPro = website.user ? isProUser(website.user) : false;
  const isLive = website.status === "live";
  const isExpired =
    !isLive && !userIsPro && website.expiresAt.getTime() < Date.now();

  return {
    ...website,
    isAllowed: !isExpired && website.status !== "expired" && website.status !== "archived",
    isExpired,
    userIsPro,
  };
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

  return user ? isProUser(user) : false;
}
