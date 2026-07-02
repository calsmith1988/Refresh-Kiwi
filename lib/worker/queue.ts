import { eq, sql } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";

const { backgroundTasks, editRequests, jobs } = schema;

export type BackgroundTaskType =
  | "refresh-homepage"
  | "fresh-homepage"
  | "edit-request"
  | "additional-pages"
  | "localize-images";

export type BackgroundTaskPayload = typeof backgroundTasks.$inferSelect.payload;
export type BackgroundTask = typeof backgroundTasks.$inferSelect;

const MAX_ATTEMPTS = 3;
const STALE_TASK_MINUTES = 60;
const STALE_EDIT_MINUTES = 30;
const STALE_JOB_MINUTES = 90;

export async function enqueueBackgroundTask(params: {
  type: BackgroundTaskType;
  payload: BackgroundTaskPayload;
}) {
  const [task] = await getDb()
    .insert(backgroundTasks)
    .values({
      type: params.type,
      payload: params.payload,
      status: "queued",
    })
    .returning();

  return task;
}

export async function claimNextBackgroundTask(): Promise<BackgroundTask | null> {
  const result = await getDb().execute(sql`
    UPDATE background_tasks
    SET
      status = 'running',
      locked_at = now(),
      started_at = COALESCE(started_at, now()),
      updated_at = now(),
      attempts = attempts + 1
    WHERE id = (
      SELECT id
      FROM background_tasks
      WHERE status = 'queued'
        AND attempts < ${MAX_ATTEMPTS}
      ORDER BY created_at
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING
      id,
      type,
      status,
      payload,
      attempts,
      locked_at AS "lockedAt",
      started_at AS "startedAt",
      completed_at AS "completedAt",
      error_message AS "errorMessage",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `);

  const rows = Array.isArray(result) ? result : (result as { rows?: unknown[] }).rows;
  const row = rows?.[0] as BackgroundTask | undefined;

  return row ?? null;
}

export async function completeBackgroundTask(taskId: string): Promise<void> {
  await getDb()
    .update(backgroundTasks)
    .set({
      status: "complete",
      completedAt: new Date(),
      errorMessage: null,
      updatedAt: new Date(),
    })
    .where(eq(backgroundTasks.id, taskId));
}

export async function failBackgroundTask(
  taskId: string,
  error: unknown,
): Promise<void> {
  const message = error instanceof Error ? error.message : "Unknown worker error";

  await getDb().execute(sql`
    UPDATE background_tasks
    SET
      status = CASE WHEN attempts >= ${MAX_ATTEMPTS} THEN 'failed' ELSE 'queued' END,
      error_message = ${message},
      locked_at = NULL,
      updated_at = now()
    WHERE id = ${taskId}
  `);
}

export async function recoverStaleBackgroundWork(): Promise<void> {
  await getDb().execute(sql`
    UPDATE background_tasks
    SET
      status = 'queued',
      locked_at = NULL,
      error_message = 'Recovered stale worker task.',
      updated_at = now()
    WHERE status = 'running'
      AND updated_at < now() - make_interval(mins => ${STALE_TASK_MINUTES})
      AND attempts < ${MAX_ATTEMPTS}
  `);

  await getDb().execute(sql`
    UPDATE edit_requests
    SET
      status = 'queued',
      error_message = 'Recovered stale edit request.',
      updated_at = now()
    WHERE status = 'running'
      AND updated_at < now() - make_interval(mins => ${STALE_EDIT_MINUTES})
  `);

  await getDb().execute(sql`
    UPDATE jobs
    SET
      status = 'queued',
      error_message = 'Recovered stale homepage job.',
      updated_at = now()
    WHERE status IN ('analyzing', 'building_homepage')
      AND updated_at < now() - make_interval(mins => ${STALE_JOB_MINUTES})
  `);

  await getDb().execute(sql`
    UPDATE jobs
    SET
      status = 'homepage_ready',
      error_message = 'Recovered stale page generation job.',
      updated_at = now()
    WHERE status = 'building_pages'
      AND updated_at < now() - make_interval(mins => ${STALE_JOB_MINUTES})
  `);
}

