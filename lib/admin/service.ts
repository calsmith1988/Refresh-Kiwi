import {
  and,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";

import { getDb, schema } from "@/lib/db";

const { backgroundTasks, editRequests, jobs, users, websites } = schema;

const PRO_STATUSES = ["active", "trialing"] as const;

function sinceDate(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

type SeriesPoint = { day: string; value: number };

/** postgres-js/drizzle often return count() as string/bigint — JSON.stringify throws on bigint. */
function asNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

async function countRows(table: PgTable, where?: SQL): Promise<number> {
  const db = getDb();
  const query = db.select({ value: sql<number>`count(*)::int`.mapWith(Number) }).from(table);
  const [row] = where ? await query.where(where) : await query;
  return asNumber(row?.value);
}

/**
 * Per-day counts for a table. Built with the query builder rather than a raw
 * `execute()` — the raw path sends the cutoff Date through postgres-js's
 * unsafe/untyped parameter route, which Postgres rejects.
 */
async function dailySeries(
  table: PgTable,
  createdAt: AnyPgColumn,
  since: Date,
): Promise<SeriesPoint[]> {
  const day = sql<string>`to_char(date_trunc('day', ${createdAt}), 'YYYY-MM-DD')`;

  const rows = await getDb()
    .select({ day, value: sql<number>`count(*)::int` })
    .from(table)
    .where(gte(createdAt, since))
    .groupBy(day)
    .orderBy(day);

  return rows.map((row) => ({
    day: String(row.day),
    value: asNumber(row.value),
  }));
}

export async function getAdminStats(days = 30) {
  const db = getDb();
  const since = sinceDate(days);

  const [
    userTotals,
    userNew,
    proUsers,
    jobsByStatus,
    jobsNew,
    jobsAnonymous,
    jobsAnonymousNew,
    websitesByStatus,
    websitesClaimed,
    editTotals,
    editsNew,
    editsFailed,
    queueByStatus,
    attributionRows,
    jobSeries,
    signupSeries,
    editSeries,
    recentFailedJobs,
  ] = await Promise.all([
    countRows(users),
    countRows(users, gte(users.createdAt, since)),
    countRows(
      users,
      and(
        eq(users.plan, "pro"),
        inArray(users.subscriptionStatus, [...PRO_STATUSES]),
      ),
    ),
    db
      .select({ status: jobs.status, value: sql<number>`count(*)::int`.mapWith(Number) })
      .from(jobs)
      .groupBy(jobs.status),
    countRows(jobs, gte(jobs.createdAt, since)),
    countRows(jobs, isNull(jobs.userId)),
    countRows(jobs, and(isNull(jobs.userId), gte(jobs.createdAt, since))),
    db
      .select({
        status: websites.status,
        value: sql<number>`count(*)::int`.mapWith(Number),
      })
      .from(websites)
      .groupBy(websites.status),
    countRows(websites, isNotNull(websites.userId)),
    countRows(editRequests),
    countRows(editRequests, gte(editRequests.createdAt, since)),
    countRows(editRequests, eq(editRequests.status, "failed")),
    db
      .select({
        status: backgroundTasks.status,
        value: sql<number>`count(*)::int`.mapWith(Number),
      })
      .from(backgroundTasks)
      .groupBy(backgroundTasks.status),
    db
      .select({
        source: jobs.utmSource,
        value: sql<number>`count(*)::int`.mapWith(Number),
      })
      .from(jobs)
      .where(and(gte(jobs.createdAt, since), isNotNull(jobs.utmSource)))
      .groupBy(jobs.utmSource)
      .orderBy(desc(sql`count(*)`))
      .limit(10),
    dailySeries(jobs, jobs.createdAt, since),
    dailySeries(users, users.createdAt, since),
    dailySeries(editRequests, editRequests.createdAt, since),
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
    Object.fromEntries(rows.map((row) => [row.status, asNumber(row.value)]));

  return {
    periodDays: days,
    users: {
      total: userTotals,
      newInPeriod: userNew,
      pro: proUsers,
    },
    jobs: {
      byStatus: statusMap(jobsByStatus),
      newInPeriod: jobsNew,
      anonymousTotal: jobsAnonymous,
      anonymousInPeriod: jobsAnonymousNew,
    },
    websites: {
      byStatus: statusMap(websitesByStatus),
      claimed: websitesClaimed,
    },
    edits: {
      total: editTotals,
      newInPeriod: editsNew,
      failed: editsFailed,
    },
    queue: statusMap(queueByStatus),
    attribution: attributionRows.map((row) => ({
      source: row.source ?? "(none)",
      value: asNumber(row.value),
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
    })
    .from(users)
    .where(where)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(params.offset ?? 0);

  const userIds = rows.map((row) => row.id);

  if (userIds.length === 0) {
    return [];
  }

  // Separate grouped counts avoid broken correlated subqueries (which were
  // returning 0 for every user even when websites existed).
  const [websiteCountRows, editCountRows] = await Promise.all([
    db
      .select({
        userId: websites.userId,
        value: sql<number>`count(*)::int`.mapWith(Number),
      })
      .from(websites)
      .where(
        and(
          inArray(websites.userId, userIds),
          ne(websites.status, "archived"),
        ),
      )
      .groupBy(websites.userId),
    db
      .select({
        userId: editRequests.userId,
        value: sql<number>`count(*)::int`.mapWith(Number),
      })
      .from(editRequests)
      .where(inArray(editRequests.userId, userIds))
      .groupBy(editRequests.userId),
  ]);

  const websiteCounts = new Map(
    websiteCountRows.map((row) => [row.userId, asNumber(row.value)]),
  );
  const editCounts = new Map(
    editCountRows.map((row) => [row.userId, asNumber(row.value)]),
  );

  return rows.map((row) => ({
    ...row,
    websiteCount: websiteCounts.get(row.id) ?? 0,
    editCount: editCounts.get(row.id) ?? 0,
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
      subdomain: website.subdomain,
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
      subdomain: websites.subdomain,
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
