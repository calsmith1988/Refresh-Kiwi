import { and, count, desc, eq, inArray, isNull, ne, or } from "drizzle-orm";

import { normalizeEmail } from "@/lib/auth/service";
import { getDb, schema } from "@/lib/db";
import { deleteRenderCustomDomain } from "@/lib/render/domains";
import { getSitesDomain, isReservedSitesSubdomain } from "@/lib/sites/domain";
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

export function isProUser(user: ProPlanCandidate) {
  return (
    user.plan === "pro" &&
    user.subscriptionStatus !== null &&
    PRO_SUBSCRIPTION_STATUSES.has(user.subscriptionStatus)
  );
}

/** Free previews expire after 7 days; live, Pro, and complimentary sites do not. */
export function isFreePreviewExpired(params: {
  status: string;
  expiresAt: Date;
  isComplimentary?: boolean | null;
  userIsPro: boolean;
}): boolean {
  if (params.isComplimentary) {
    return false;
  }

  if (params.status === "live" || params.userIsPro) {
    return false;
  }

  return params.expiresAt.getTime() <= Date.now();
}

/**
 * Complimentary sites are gifted full Pro capabilities for that website
 * (unlimited edits, pages, images, custom domain, public hosting) without a
 * Stripe subscription. Account-level limits (e.g. how many sites you can own)
 * still follow the user's plan.
 */
export function hasWebsiteProFeatures(params: {
  isComplimentary?: boolean | null;
  userIsPro: boolean;
}): boolean {
  return params.userIsPro || Boolean(params.isComplimentary);
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
    subdomain: website.subdomain,
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
    contactEmail: website.contactEmail,
    isComplimentary: website.isComplimentary,
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

  const sitesDomain = getSitesDomain();

  if (
    domain === "refresh.kiwi" ||
    domain.endsWith(".refresh.kiwi") ||
    domain === sitesDomain ||
    domain.endsWith(`.${sitesDomain}`)
  ) {
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

const SUBDOMAIN_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeSubdomain(input: string): string {
  const subdomain = input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split(".")[0]!
    .replace(/\/.*$/, "");

  if (
    subdomain.length < 3 ||
    subdomain.length > 48 ||
    !SUBDOMAIN_PATTERN.test(subdomain)
  ) {
    throw new Error(
      "Web addresses can use lowercase letters, numbers and hyphens (3-48 characters), like joes-plumbing.",
    );
  }

  if (isReservedSitesSubdomain(subdomain)) {
    throw new Error("That web address is reserved. Try a different one.");
  }

  return subdomain;
}

export async function updateOwnedWebsiteSubdomain(params: {
  websiteId: string;
  userId: string;
  subdomain: string;
}) {
  const subdomain = normalizeSubdomain(params.subdomain);
  const website = await getOwnedWebsite(params);

  if (!website) {
    throw new Error("Website not found");
  }

  // Same address as the site's own slug — store null so the slug stays the
  // single source of truth and the unique index isn't occupied needlessly.
  const value = subdomain === website.slug ? null : subdomain;

  if (value) {
    const db = getDb();
    const [clash] = await db
      .select({ id: websites.id })
      .from(websites)
      .where(
        and(
          ne(websites.id, website.id),
          or(eq(websites.subdomain, value), eq(websites.slug, value)),
        ),
      )
      .limit(1);

    if (clash) {
      throw new Error("That web address is already taken. Try a different one.");
    }
  }

  const [updated] = await getDb()
    .update(websites)
    .set({
      subdomain: value,
      updatedAt: new Date(),
    })
    .where(eq(websites.id, website.id))
    .returning();

  return updated;
}

export async function updateOwnedWebsiteSeoSettings(params: {
  websiteId: string;
  userId: string;
  searchConsoleToken: string | null;
  analyticsId: string | null;
  contactEmail: string | null;
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
      contactEmail: params.contactEmail,
      updatedAt: new Date(),
    })
    .where(eq(websites.id, website.id))
    .returning();

  return updated;
}

async function archiveWebsiteRecord(website: typeof websites.$inferSelect) {
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

  return archiveWebsiteRecord(website);
}

export async function archiveWebsiteAsAdmin(websiteId: string) {
  const [website] = await getDb()
    .select()
    .from(websites)
    .where(eq(websites.id, websiteId))
    .limit(1);

  if (!website) {
    throw new Error("Website not found");
  }

  if (website.status === "archived") {
    throw new Error("Website is already archived");
  }

  return archiveWebsiteRecord(website);
}

export async function assignWebsiteToUser(params: {
  websiteId: string;
  email: string;
  complimentary?: boolean;
}) {
  const email = normalizeEmail(params.email);

  if (!email) {
    throw new Error("Email is required");
  }

  const db = getDb();
  const [website] = await db
    .select()
    .from(websites)
    .where(eq(websites.id, params.websiteId))
    .limit(1);

  if (!website) {
    throw new Error("Website not found");
  }

  if (website.status === "archived") {
    throw new Error("Cannot assign an archived website");
  }

  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    throw new Error("No account for that email");
  }

  const now = new Date();
  const makeComplimentary = Boolean(params.complimentary);

  const updated = await db.transaction(async (tx) => {
    const [assignedWebsite] = await tx
      .update(websites)
      .set({
        userId: user.id,
        ...(makeComplimentary
          ? {
              isComplimentary: true,
              status: "live" as const,
              publishedAt: website.publishedAt ?? now,
            }
          : {}),
        updatedAt: now,
      })
      .where(eq(websites.id, website.id))
      .returning();

    await tx
      .update(jobs)
      .set({ userId: user.id, updatedAt: now })
      .where(eq(jobs.id, website.jobId));

    return assignedWebsite;
  });

  return {
    website: updated,
    fromUserId: website.userId,
    toUserId: user.id,
    toEmail: user.email,
    complimentary: makeComplimentary || updated.isComplimentary,
  };
}

export async function setWebsiteComplimentary(params: {
  websiteId: string;
  enabled: boolean;
}) {
  const [website] = await getDb()
    .select()
    .from(websites)
    .where(eq(websites.id, params.websiteId))
    .limit(1);

  if (!website) {
    throw new Error("Website not found");
  }

  if (website.status === "archived") {
    throw new Error("Cannot change complimentary status on an archived website");
  }

  const now = new Date();
  const [updated] = await getDb()
    .update(websites)
    .set(
      params.enabled
        ? {
            isComplimentary: true,
            status: "live",
            publishedAt: website.publishedAt ?? now,
            updatedAt: now,
          }
        : {
            isComplimentary: false,
            updatedAt: now,
          },
    )
    .where(eq(websites.id, website.id))
    .returning();

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
      isComplimentary: websites.isComplimentary,
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
  const isExpired = isFreePreviewExpired({
    status: website.status,
    expiresAt: website.expiresAt,
    isComplimentary: website.isComplimentary,
    userIsPro,
  });

  return {
    ...website,
    isAllowed: !isExpired && website.status !== "expired" && website.status !== "archived",
    isExpired,
    userIsPro,
  };
}

/**
 * Access check for `{label}.refreshkiwi.site`, where label is the website's
 * chosen subdomain (or its slug when no subdomain is set). Only live Pro
 * sites graduate off /preview/ — everything else 404s on the sites domain.
 *
 * `sitesLabel` in the result is the canonical label; when the request came in
 * on a different label (e.g. the original slug after a rename), the caller
 * should 301 to the canonical host.
 */
export async function getWebsiteAccessBySitesLabel(label: string) {
  const selection = {
    id: websites.id,
    status: websites.status,
    slug: websites.slug,
    subdomain: websites.subdomain,
    expiresAt: websites.expiresAt,
    isComplimentary: websites.isComplimentary,
    customDomain: websites.customDomain,
    customDomainStatus: websites.customDomainStatus,
    seoSearchConsoleToken: websites.seoSearchConsoleToken,
    seoAnalyticsId: websites.seoAnalyticsId,
    user: {
      plan: users.plan,
      subscriptionStatus: users.subscriptionStatus,
    },
  };

  const db = getDb();
  // A chosen subdomain wins over another site's slug with the same value
  // (the clash check in updateOwnedWebsiteSubdomain prevents this anyway).
  const [bySubdomain] = await db
    .select(selection)
    .from(websites)
    .leftJoin(users, eq(websites.userId, users.id))
    .where(eq(websites.subdomain, label))
    .limit(1);
  const website =
    bySubdomain ??
    (
      await db
        .select(selection)
        .from(websites)
        .leftJoin(users, eq(websites.userId, users.id))
        .where(eq(websites.slug, label))
        .limit(1)
    )[0];

  if (!website) {
    return null;
  }

  const userIsPro = website.user ? isProUser(website.user) : false;
  const isLive = website.status === "live";
  const isExpired = isFreePreviewExpired({
    status: website.status,
    expiresAt: website.expiresAt,
    isComplimentary: website.isComplimentary,
    userIsPro,
  });
  const isAllowed =
    !isExpired && website.status !== "expired" && website.status !== "archived";

  return {
    ...website,
    isAllowed,
    isExpired,
    userIsPro,
    isSitesEligible: isAllowed && isLive && (userIsPro || website.isComplimentary),
    sitesLabel: website.subdomain ?? website.slug,
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
        isComplimentary: websites.isComplimentary,
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
  const isExpired = isFreePreviewExpired({
    status: website.status,
    expiresAt: website.expiresAt,
    isComplimentary: website.isComplimentary,
    userIsPro,
  });

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
      subdomain: websites.subdomain,
      brandName: websites.brandName,
      status: websites.status,
      isComplimentary: websites.isComplimentary,
      customDomain: websites.customDomain,
      customDomainStatus: websites.customDomainStatus,
      contactEmail: websites.contactEmail,
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

  const ownerIsPro = website.user ? isProUser(website.user) : false;

  return {
    websiteId: website.id,
    slug: website.slug,
    sitesLabel: website.subdomain ?? website.slug,
    brandName: website.brandName,
    status: website.status,
    isComplimentary: website.isComplimentary,
    customDomain: website.customDomain,
    customDomainStatus: website.customDomainStatus,
    enquiryEmail: website.contactEmail ?? website.user?.email ?? null,
    ownerEmail: website.user?.email ?? null,
    ownerPlan: website.user?.plan ?? null,
    subscriptionStatus: website.user?.subscriptionStatus ?? null,
    ownerIsPro,
    acceptsContact: ownerIsPro || website.isComplimentary,
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
