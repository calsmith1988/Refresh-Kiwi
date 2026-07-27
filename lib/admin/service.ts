import { and, count, desc, eq, gte, ilike, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";

const { backgroundTasks, editRequests, jobs, users, websites } = schema;

const PRO_STATUSES = ["active", "trialing"] as const;

function sinceDate(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

type SeriesPoint = { day: string; value: number };

function executedRows<T>(result: unknown): T[] {
  return (
    Array.isArray(result) ? result : ((result as { rows?: unknown[] }).rows ?? [])
  ) as T[];
}

async function dailySeries(table: string, since: Date): Promise<SeriesPoint[]> {
  // `table` is a hardcoded identifier from the callers below, never user input.
  const result = await getDb().execute(sql`
    SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
           count(*)::int AS value
    FROM ${sql.raw(table)}
    WHERE created_at >= ${since}
    GROUP BY 1
    ORDER BY 1
  `);

  return executedRows<SeriesPoint>(result);
}

export async function getAdminStats(days = 30) {
  const db = getDb();
  const since = sinceDate(days);

  const [
    [userTotals],
    [userNew],
    [proUsers],
    jobsByStatus,
    [jobsNew],
    [jobsAnonymous],
    [jobsAnonymousNew],
    websitesByStatus,
    [websitesClaimed],
    [editTotals],
    [editsNew],
    [editsFailed],
    queueByStatus,
    attributionRows,
    jobSeries,
    signupSeries,
    editSeries,
    recentFailedJobs,
  ] = await Promise.all([
    db.select({ value: count() }).from(users),
    db.select({ value: count() }).from(users).where(gte(users.createdAt, since)),
    db
      .select({ value: count() })
      .from(users)
      .where(
        and(
          eq(users.plan, "pro"),
          inArray(users.subscriptionStatus, [...PRO_STATUSES]),
        ),
      ),
    db
      .select({ status: jobs.status, value: count() })
      .from(jobs)
      .groupBy(jobs.status),
    db.select({ value: count() }).from(jobs).where(gte(jobs.createdAt, since)),
    db.select({ value: count() }).from(jobs).where(isNull(jobs.userId)),
    db
      .select({ value: count() })
      .from(jobs)
      .where(and(isNull(jobs.userId), gte(jobs.createdAt, since))),
    db
      .select({ status: websites.status, value: count() })
      .from(websites)
      .groupBy(websites.status),
    db
      .select({ value: count() })
      .from(websites)
      .where(isNotNull(websites.userId)),
    db.select({ value: count() }).from(editRequests),
    db
      .select({ value: count() })
      .from(editRequests)
      .where(gte(editRequests.createdAt, since)),
    db
      .select({ value: count() })
      .from(editRequests)
      .where(eq(editRequests.status, "failed")),
    db
      .select({ status: backgroundTasks.status, value: count() })
      .from(backgroundTasks)
      .groupBy(backgroundTasks.status),
    db
      .select({ source: jobs.utmSource, value: count() })
      .from(jobs)
      .where(and(gte(jobs.createdAt, since), isNotNull(jobs.utmSource)))
      .groupBy(jobs.utmSource)
      .orderBy(desc(count()))
      .limit(10),
    dailySeries("jobs", since),
    dailySeries("users", since),
    dailySeries("edit_requests", since),
    db
      .select({
        id: jobs.id,
        slug: jobs.slug,
        generationMode: jobs.generationMode,
        errorMessage: jobs.errorMessage,
        createdAt: jobs.createdAt,
      })
      .from(jobs)
      .where(eq(jobs.status, "failed"))
      .orderBy(desc(jobs.createdAt))
      .limit(20),
  ]);

  const statusMap = (rows: Array<{ status: string; value: number }>) =>
    Object.fromEntries(rows.map((row) => [row.status, row.value]));

  return {
    periodDays: days,
    users: {
      total: userTotals?.value ?? 0,
      newInPeriod: userNew?.value ?? 0,
      pro: proUsers?.value ?? 0,
    },
    jobs: {
      byStatus: statusMap(jobsByStatus),
      newInPeriod: jobsNew?.value ?? 0,
      anonymousTotal: jobsAnonymous?.value ?? 0,
      anonymousInPeriod: jobsAnonymousNew?.value ?? 0,
    },
    websites: {
      byStatus: statusMap(websitesByStatus),
      claimed: websitesClaimed?.value ?? 0,
    },
    edits: {
      total: editTotals?.value ?? 0,
      newInPeriod: editsNew?.value ?? 0,
      failed: editsFailed?.value ?? 0,
    },
    queue: statusMap(queueByStatus),
    attribution: attributionRows.map((row) => ({
      source: row.source ?? "(none)",
      value: row.value,
    })),
    series: {
      jobs: jobSeries,
      signups: signupSeries,
      edits: editSeries,
    },
    recentFailedJobs: recentFailedJobs.map((job) => ({
      ...job,
      createdAt: job.createdAt.toISOString(),
    })),
  };
}

export async function listAdminUsers(params: {
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const db = getDb();
  const limit = Math.min(params.limit ?? 50, 200);
  const search = params.search?.trim();

  const where = search ? ilike(users.email, `%${search}%`) : undefined;

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      plan: users.plan,
      subscriptionStatus: users.subscriptionStatus,
      emailVerifiedAt: users.emailVerifiedAt,
      twoFactorEnabled: users.twoFactorEnabled,
      stripeCustomerId: users.stripeCustomerId,
      createdAt: users.createdAt,
      websiteCount: sql<number>`(
        SELECT count(*)::int FROM websites w
        WHERE w.user_id = ${users.id} AND w.status != 'archived'
      )`,
      editCount: sql<number>`(
        SELECT count(*)::int FROM edit_requests e WHERE e.user_id = ${users.id}
      )`,
    })
    .from(users)
    .where(where)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(params.offset ?? 0);

  return rows.map((row) => ({
    ...row,
    emailVerifiedAt: row.emailVerifiedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getAdminUserDetail(userId: string) {
  const db = getDb();

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      plan: users.plan,
      subscriptionStatus: users.subscriptionStatus,
      emailVerifiedAt: users.emailVerifiedAt,
      twoFactorEnabled: users.twoFactorEnabled,
      marketingEmailsEnabled: users.marketingEmailsEnabled,
      stripeCustomerId: users.stripeCustomerId,
      stripeSubscriptionId: users.stripeSubscriptionId,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return null;
  }

  const [userWebsites, userJobs, userEdits] = await Promise.all([
    db
      .select()
      .from(websites)
      .where(eq(websites.userId, userId))
      .orderBy(desc(websites.updatedAt)),
    db
      .select({
        id: jobs.id,
        slug: jobs.slug,
        status: jobs.status,
        generationMode: jobs.generationMode,
        errorMessage: jobs.errorMessage,
        createdAt: jobs.createdAt,
      })
      .from(jobs)
      .where(eq(jobs.userId, userId))
      .orderBy(desc(jobs.createdAt))
      .limit(20),
    db
      .select({
        id: editRequests.id,
        websiteId: editRequests.websiteId,
        slug: websites.slug,
        prompt: editRequests.prompt,
        status: editRequests.status,
        errorMessage: editRequests.errorMessage,
        createdAt: editRequests.createdAt,
      })
      .from(editRequests)
      .innerJoin(websites, eq(editRequests.websiteId, websites.id))
      .where(eq(editRequests.userId, userId))
      .orderBy(desc(editRequests.createdAt))
      .limit(20),
  ]);

  return {
    user: {
      ...user,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    },
    websites: userWebsites.map((website) => ({
      id: website.id,
      slug: website.slug,
      brandName: website.brandName,
      status: website.status,
      customDomain: website.customDomain,
      customDomainStatus: website.customDomainStatus,
      freeEditsUsed: website.freeEditsUsed,
      freeEditsLimit: website.freeEditsLimit,
      expiresAt: website.expiresAt.toISOString(),
      createdAt: website.createdAt.toISOString(),
    })),
    jobs: userJobs.map((job) => ({
      ...job,
      createdAt: job.createdAt.toISOString(),
    })),
    edits: userEdits.map((edit) => ({
      ...edit,
      createdAt: edit.createdAt.toISOString(),
    })),
  };
}

export async function listAdminWebsites(params: {
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const db = getDb();
  const limit = Math.min(params.limit ?? 50, 200);
  const search = params.search?.trim();

  const where = search
    ? or(
        ilike(websites.slug, `%${search}%`),
        ilike(websites.brandName, `%${search}%`),
        ilike(users.email, `%${search}%`),
        ilike(websites.customDomain, `%${search}%`),
      )
    : undefined;

  const rows = await db
    .select({
      id: websites.id,
      jobId: websites.jobId,
      slug: websites.slug,
      brandName: websites.brandName,
      status: websites.status,
      generationMode: websites.generationMode,
      ownerEmail: users.email,
      ownerId: websites.userId,
      freeEditsUsed: websites.freeEditsUsed,
      freeEditsLimit: websites.freeEditsLimit,
      customDomain: websites.customDomain,
      customDomainStatus: websites.customDomainStatus,
      expiresAt: websites.expiresAt,
      createdAt: websites.createdAt,
    })
    .from(websites)
    .leftJoin(users, eq(websites.userId, users.id))
    .where(where)
    .orderBy(desc(websites.createdAt))
    .limit(limit)
    .offset(params.offset ?? 0);

  return rows.map((row) => ({
    ...row,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  }));
}

/** All DB-side custom domains, the source of truth to reconcile Render against. */
export async function listAdminDomains() {
  const rows = await getDb()
    .select({
      websiteId: websites.id,
      slug: websites.slug,
      brandName: websites.brandName,
      websiteStatus: websites.status,
      ownerEmail: users.email,
      domain: websites.customDomain,
      domainStatus: websites.customDomainStatus,
      domainError: websites.customDomainError,
      verifiedAt: websites.customDomainVerifiedAt,
      lastCheckedAt: websites.customDomainLastCheckedAt,
    })
    .from(websites)
    .leftJoin(users, eq(websites.userId, users.id))
    .where(isNotNull(websites.customDomain))
    .orderBy(desc(websites.updatedAt));

  return rows.map((row) => ({
    ...row,
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
    lastCheckedAt: row.lastCheckedAt?.toISOString() ?? null,
  }));
}

export async function getAdminWebsite(websiteId: string) {
  const [website] = await getDb()
    .select()
    .from(websites)
    .where(eq(websites.id, websiteId))
    .limit(1);

  return website ?? null;
}
