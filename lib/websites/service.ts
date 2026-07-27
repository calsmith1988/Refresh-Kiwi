import { and, count, desc, eq, inArray, isNull, ne } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";
import { deleteRenderCustomDomain } from "@/lib/render/domains";
import { deleteSiteDirectoryFromR2 } from "@/lib/storage/r2";

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

// Generations that haven't produced a website row yet. A job in one of these
// states will become an owned website when it finishes, so it must count
// toward the owner's website allowance.
const IN_FLIGHT_JOB_STATUSES = [
  "queued",
  "analyzing",
  "building_homepage",
  "homepage_ready",
] as const;

export type WebsiteAllowanceResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Signed-in generations skip the claim step — the finished website is saved
 * straight to the user's account. So the 1-free/3-Pro website limit has to be
 * enforced before starting a generation, not just in claimWebsite.
 */
export async function checkWebsiteAllowance(params: {
  userId: string;
  isPro: boolean;
}): Promise<WebsiteAllowanceResult> {
  const db = getDb();
  const [ownedWebsites, [inFlight]] = await Promise.all([
    listOwnedWebsites(params.userId),
    db
      .select({ value: count() })
      .from(jobs)
      .leftJoin(websites, eq(websites.jobId, jobs.id))
      .where(
        and(
          eq(jobs.userId, params.userId),
          inArray(jobs.status, [...IN_FLIGHT_JOB_STATUSES]),
          isNull(websites.id),
        ),
      ),
  ]);

  const used = ownedWebsites.length + (inFlight?.value ?? 0);
  const limit = params.isPro ? PRO_WEBSITE_LIMIT : FREE_WEBSITE_LIMIT;

  if (used >= limit) {
    return {
      ok: false,
      message: params.isPro
        ? "Your Pro plan includes up to 3 websites and you've used them all. Delete one from your dashboard to make room, or contact us to add more."
        : "Free accounts include 1 website and you already have one. Upgrade to Pro for up to 3 websites, or delete your current one from the dashboard.",
    };
  }

  return { ok: true };
}

export function toWebsiteResponse(website: typeof websites.$inferSelect) {
  const editsRemaining =
    website.freeEditsLimit === null
      ? 0
      : Math.max(0, website.freeEditsLimit - website.freeEditsUsed);

  return {
    id: website.id,
    jobId: website.jobId,
    sourceUrl: website.generationMode === "fresh" ? null : website.sourceUrl,
    generationMode: website.generationMode,
    creationPrompt: website.creationPrompt,
    slug: website.slug,
    brandName: website.brandName,
    status: website.status,
    freeEditsUsed: website.freeEditsUsed,
    freeEditsLimit: website.freeEditsLimit,
    freeEditsRemaining: editsRemaining,
    customDomain: website.customDomain,
    customDomainStatus: website.customDomainStatus,
    customDomainError: website.customDomainError,
    customDomainVerifiedAt: website.customDomainVerifiedAt?.toISOString() ?? null,
    customDomainLastCheckedAt:
      website.customDomainLastCheckedAt?.toISOString() ?? null,
    seoSearchConsoleToken: website.seoSearchConsoleToken,
    seoAnalyticsId: website.seoAnalyticsId,
    expiresAt: website.expiresAt.toISOString(),
    publishedAt: website.publishedAt?.toISOString() ?? null,
    createdAt: website.createdAt.toISOString(),
    updatedAt: website.updatedAt.toISOString(),
  };
}

export function normalizeCustomDomain(input: string): string {
  const trimmed = input.trim().toLowerCase();
  const withoutProtocol = trimmed.replace(/^https?:\/\//, "");
  const domain = withoutProtocol.split("/")[0]?.replace(/\.$/, "") ?? "";

  if (!domain || domain.length > 253 || domain.includes("..")) {
    throw new Error("Enter a valid domain, like www.example.com");
  }

  if (domain === "refresh.kiwi" || domain.endsWith(".refresh.kiwi")) {
    throw new Error("Use a domain you own, not a Refresh Kiwi domain.");
  }

  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(domain)) {
    throw new Error("Enter a valid domain, like www.example.com");
  }

  return domain;
}

export async function connectOwnedWebsiteDomain(params: {
  websiteId: string;
  userId: string;
  domain: string;
  renderDomainId?: string | null;
}) {
  const website = await getOwnedWebsite({
    websiteId: params.websiteId,
    userId: params.userId,
  });

  if (!website) {
    throw new Error("Website not found");
  }

  const domain = normalizeCustomDomain(params.domain);
  const [updated] = await getDb()
    .update(websites)
    .set({
      customDomain: domain,
      customDomainStatus: "pending",
      customDomainRenderId: params.renderDomainId ?? website.customDomainRenderId,
      customDomainError: null,
      customDomainVerifiedAt: null,
      customDomainLastCheckedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(websites.id, website.id))
    .returning();

  return updated;
}

export async function updateOwnedWebsiteDomainStatus(params: {
  websiteId: string;
  userId: string;
  status: "pending" | "connected" | "failed";
  error?: string | null;
  renderDomainId?: string | null;
}) {
  const website = await getOwnedWebsite({
    websiteId: params.websiteId,
    userId: params.userId,
  });

  if (!website) {
    throw new Error("Website not found");
  }

  const [updated] = await getDb()
    .update(websites)
    .set({
      customDomainStatus: params.status,
      customDomainError: params.error ?? null,
      customDomainRenderId: params.renderDomainId ?? website.customDomainRenderId,
      customDomainVerifiedAt:
        params.status === "connected"
          ? new Date()
          : website.customDomainVerifiedAt,
      customDomainLastCheckedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(websites.id, website.id))
    .returning();

  return updated;
}

export async function removeOwnedWebsiteDomain(params: {
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
      customDomain: null,
      customDomainStatus: "none",
      customDomainRenderId: null,
      customDomainError: null,
      customDomainVerifiedAt: null,
      customDomainLastCheckedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(websites.id, website.id))
    .returning();

  return updated;
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

  const ownerIsPro = job.userId ? await userHasProPlan(job.userId) : false;
  const now = new Date();
  const [website] = await db
    .insert(websites)
    .values({
      jobId: job.id,
      userId: job.userId,
      sourceUrl: job.sourceUrl,
      generationMode: job.generationMode,
      creationPrompt: job.creationPrompt,
      slug: job.slug,
      brandName: job.brandName,
      status: ownerIsPro ? "live" : "preview",
      publishedAt: ownerIsPro ? now : null,
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

  // Claim the website and its originating job atomically — a half-applied
  // claim (website owned but job still anonymous, or vice versa) breaks
  // ownership checks and quota accounting.
  const updated = await db.transaction(async (tx) => {
    const claimedAt = new Date();
    const ownerIsPro = isProUser(user);
    const [claimedWebsite] = await tx
      .update(websites)
      .set({
        userId: params.userId,
        status: ownerIsPro ? "live" : website.status,
        publishedAt: ownerIsPro ? (website.publishedAt ?? claimedAt) : website.publishedAt,
        updatedAt: claimedAt,
      })
      .where(eq(websites.id, website.id))
      .returning();

    await tx
      .update(jobs)
      .set({ userId: params.userId, updatedAt: claimedAt })
      .where(eq(jobs.id, params.jobId));

    return claimedWebsite;
  });

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

export async function renameOwnedWebsite(params: {
  websiteId: string;
  userId: string;
  name: string;
}) {
  const name = params.name.trim();

  if (name.length < 2) {
    throw new Error("Website name must be at least 2 characters");
  }

  if (name.length > 80) {
    throw new Error("Website name must be 80 characters or fewer");
  }

  const website = await getOwnedWebsite(params);

  if (!website) {
    throw new Error("Website not found");
  }

  const updated = await getDb().transaction(async (tx) => {
    const [renamedWebsite] = await tx
      .update(websites)
      .set({
        brandName: name,
        updatedAt: new Date(),
      })
      .where(eq(websites.id, website.id))
      .returning();

    await tx
      .update(jobs)
      .set({
        brandName: name,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, website.jobId));

    return renamedWebsite;
  });

  return updated;
}

export async function updateOwnedWebsiteSeoSettings(params: {
  websiteId: string;
  userId: string;
  searchConsoleToken: string | null;
  analyticsId: string | null;
}) {
  const website = await getOwnedWebsite(params);

  if (!website) {
    throw new Error("Website not found");
  }

  const [updated] = await getDb()
    .update(websites)
    .set({
      seoSearchConsoleToken: params.searchConsoleToken,
      seoAnalyticsId: params.analyticsId,
      updatedAt: new Date(),
    })
    .where(eq(websites.id, website.id))
    .returning();

  return updated;
}

export async function archiveOwnedWebsite(params: {
  websiteId: string;
  userId: string;
  confirmation: string;
}) {
  const website = await getOwnedWebsite(params);

  if (!website) {
    throw new Error("Website not found");
  }

  const expectedConfirmation = website.brandName || website.slug;

  if (params.confirmation.trim() !== expectedConfirmation) {
    throw new Error(`Type "${expectedConfirmation}" to delete this website.`);
  }

  // Commit the archive in the database first, then delete the R2 files. If we
  // deleted R2 first and the DB write failed, the site would still show as
  // active but serve nothing. This order makes the DB authoritative; an R2
  // failure only leaves orphaned files behind an already-unreachable site.
  const [updated] = await getDb()
    .update(websites)
    .set({
      status: "archived",
      customDomain: null,
      customDomainStatus: "none",
      customDomainRenderId: null,
      customDomainError: null,
      customDomainVerifiedAt: null,
      customDomainLastCheckedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(websites.id, website.id))
    .returning();

  try {
    await deleteSiteDirectoryFromR2(website.slug);
  } catch (error) {
    console.error(
      `[refresh-kiwi] archived website ${website.id} but failed to delete R2 files for slug=${website.slug}`,
      error,
    );
  }

  // Deleting a site must also detach its custom domain from the Render
  // service; leaving it behind is what litters the Render dropdown with
  // orphaned domains. A Render failure is non-fatal for the same reason as
  // R2 above — the DB is already authoritative and the admin domains page
  // surfaces any leftovers.
  if (website.customDomain) {
    try {
      await deleteRenderCustomDomain(website.customDomain);
    } catch (error) {
      console.error(
        `[refresh-kiwi] archived website ${website.id} but failed to remove Render domain ${website.customDomain}`,
        error,
      );
    }
  }

  return updated;
}

export async function setOwnedWebsiteOnline(params: {
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

export async function getWebsiteAccessByCustomDomain(hostname: string) {
  const domain = normalizeCustomDomain(hostname);
  const findWebsite = async (customDomain: string) => {
    const [website] = await getDb()
      .select({
        id: websites.id,
        status: websites.status,
        slug: websites.slug,
        expiresAt: websites.expiresAt,
        customDomain: websites.customDomain,
        customDomainStatus: websites.customDomainStatus,
        seoSearchConsoleToken: websites.seoSearchConsoleToken,
        seoAnalyticsId: websites.seoAnalyticsId,
        user: {
          plan: users.plan,
          subscriptionStatus: users.subscriptionStatus,
        },
      })
      .from(websites)
      .leftJoin(users, eq(websites.userId, users.id))
      .where(eq(websites.customDomain, customDomain))
      .limit(1);

    return website;
  };
  const website =
    (await findWebsite(domain)) ||
    (!domain.startsWith("www.") ? await findWebsite(`www.${domain}`) : null);

  if (!website || website.customDomainStatus !== "connected") {
    return null;
  }

  const userIsPro = website.user ? isProUser(website.user) : false;
  const isLive = website.status === "live";
  const isExpired =
    !isLive && !userIsPro && website.expiresAt.getTime() < Date.now();

  return {
    ...website,
    isAllowed:
      !isExpired && website.status !== "expired" && website.status !== "archived",
    isExpired,
    userIsPro,
  };
}

export async function getWebsiteContactTarget(slug: string) {
  const [website] = await getDb()
    .select({
      id: websites.id,
      slug: websites.slug,
      brandName: websites.brandName,
      status: websites.status,
      customDomain: websites.customDomain,
      customDomainStatus: websites.customDomainStatus,
      user: {
        email: users.email,
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

  return {
    websiteId: website.id,
    slug: website.slug,
    brandName: website.brandName,
    status: website.status,
    customDomain: website.customDomain,
    customDomainStatus: website.customDomainStatus,
    ownerEmail: website.user?.email ?? null,
    ownerPlan: website.user?.plan ?? null,
    subscriptionStatus: website.user?.subscriptionStatus ?? null,
    ownerIsPro: website.user ? isProUser(website.user) : false,
  };
}

export async function listOwnedWebsites(userId: string) {
  return getDb()
    .select()
    .from(websites)
    .where(and(eq(websites.userId, userId), ne(websites.status, "archived")))
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
