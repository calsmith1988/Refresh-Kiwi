import { and, desc, eq, gte, inArray, isNotNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb, schema } from "@/lib/db";

export const runtime = "nodejs";

const { editRequests, jobs, users } = schema;
const ACTIVITY_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

type Activity = {
  type: "refresh" | "edit" | "pro";
  message: string;
  occurredAt: string;
};

export async function GET() {
  const since = new Date(Date.now() - ACTIVITY_WINDOW_MS);
  const db = getDb();

  const [latestRefresh, latestEdit, latestPro] = await Promise.all([
    db
      .select({ occurredAt: jobs.createdAt })
      .from(jobs)
      .where(
        and(
          isNotNull(jobs.userId),
          inArray(jobs.status, ["homepage_ready", "building_pages", "complete"]),
          gte(jobs.createdAt, since),
        ),
      )
      .orderBy(desc(jobs.createdAt))
      .limit(1),
    db
      .select({ occurredAt: editRequests.updatedAt })
      .from(editRequests)
      .where(and(eq(editRequests.status, "complete"), gte(editRequests.updatedAt, since)))
      .orderBy(desc(editRequests.updatedAt))
      .limit(1),
    db
      .select({ occurredAt: users.updatedAt })
      .from(users)
      .where(
        and(
          eq(users.plan, "pro"),
          inArray(users.subscriptionStatus, ["active", "trialing"]),
          gte(users.updatedAt, since),
        ),
      )
      .orderBy(desc(users.updatedAt))
      .limit(1),
  ]);

  const activities: Activity[] = [
    latestRefresh[0]
      ? {
          type: "refresh",
          message: "Someone just refreshed their old website",
          occurredAt: latestRefresh[0].occurredAt.toISOString(),
        }
      : null,
    latestEdit[0]
      ? {
          type: "edit",
          message: "Someone just made a design tweak",
          occurredAt: latestEdit[0].occurredAt.toISOString(),
        }
      : null,
    latestPro[0]
      ? {
          type: "pro",
          message: "Someone just upgraded to Kiwi Pro",
          occurredAt: latestPro[0].occurredAt.toISOString(),
        }
      : null,
  ].filter((activity): activity is Activity => Boolean(activity));

  activities.sort(
    (left, right) =>
      new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
  );

  return NextResponse.json(
    { activities },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}
