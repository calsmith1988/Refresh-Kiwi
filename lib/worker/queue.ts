import { eq, sql } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";

const { backgroundTasks } = schema;

export type BackgroundTaskType =
  | "refresh-homepage"
  | "fresh-homepage"
  | "edit-request"
  | "additional-pages"
  | "localize-images"
  | "homepage-screenshot";

export type BackgroundTaskPayload = typeof backgroundTasks.$inferSelect.payload;
export type BackgroundTask = typeof backgroundTasks.$inferSelect;

export const MAX_TASK_ATTEMPTS = 3;

/**
 * A single staleness window for a task AND the job/edit it drives. Previously
 * these were misaligned (task 60m, edit 30m, job 90m): an edit row could be
 * reset to "queued" at 30m while its task stayed "running" until 60m, so when
 * the task was finally re-queued the processor re-ran a Cursor agent that may
 * still have been working — a duplicate, paid, concurrent run.
 *
 * One window guarantees a task and its entity are recovered together, and it's
 * set safely beyond the longest realistic agent run so we never recover work
 * that's genuinely still in flight.
 */
const STALE_MINUTES = Number(process.env.WORKER_STALE_MINUTES ?? 90);

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
        AND attempts < ${MAX_TASK_ATTEMPTS}
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
      status = CASE WHEN attempts >= ${MAX_TASK_ATTEMPTS} THEN 'failed' ELSE 'queued' END,
      error_message = ${message},
      locked_at = NULL,
      updated_at = now()
    WHERE id = ${taskId}
  `);
}

/**
 * Resets the job/edit a task drives back to a processable state so a retried
 * or recovered task actually re-runs, instead of the processor early-returning
 * (because the entity is stuck mid-flight) while the worker still marks the
 * task complete — which previously stranded the entity forever.
 */
export async function resetEntityForRetry(task: BackgroundTask): Promise<void> {
  const payload = task.payload as {
    jobId?: string;
    editRequestId?: string;
  };

  switch (task.type) {
    case "refresh-homepage":
    case "fresh-homepage": {
      if (payload.jobId) {
        await getDb().execute(sql`
          UPDATE jobs
          SET status = 'queued', error_message = NULL, updated_at = now()
          WHERE id = ${payload.jobId}
            AND status IN ('analyzing', 'building_homepage')
        `);
      }
      break;
    }

    case "edit-request": {
      if (payload.editRequestId) {
        await getDb().execute(sql`
          UPDATE edit_requests
          SET status = 'queued', error_message = NULL, updated_at = now()
          WHERE id = ${payload.editRequestId}
            AND status = 'running'
        `);
      }
      break;
    }

    default:
      break;
  }
}

export async function recoverStaleBackgroundWork(): Promise<void> {
  // Recover the task and the entity it drives together, on a single window, so
  // we never reset one while the other is still mid-flight (the old split
  // windows could re-queue an entity whose agent was still running → duplicate
  // paid Cursor runs).
  await getDb().execute(sql`
    UPDATE background_tasks
    SET
      status = 'queued',
      locked_at = NULL,
      error_message = 'Recovered stale worker task.',
      updated_at = now()
    WHERE status = 'running'
      AND updated_at < now() - make_interval(mins => ${STALE_MINUTES})
      AND attempts < ${MAX_TASK_ATTEMPTS}
  `);

  await getDb().execute(sql`
    UPDATE edit_requests
    SET
      status = 'queued',
      error_message = 'Recovered stale edit request.',
      updated_at = now()
    WHERE status = 'running'
      AND updated_at < now() - make_interval(mins => ${STALE_MINUTES})
  `);

  await getDb().execute(sql`
    UPDATE jobs
    SET
      status = 'queued',
      error_message = 'Recovered stale homepage job.',
      updated_at = now()
    WHERE status IN ('analyzing', 'building_homepage')
      AND updated_at < now() - make_interval(mins => ${STALE_MINUTES})
  `);

  // This error_message is shown on the dashboard, so it uses customer-facing
  // copy (same message the pages processor stores on a permanent failure).
  await getDb().execute(sql`
    UPDATE jobs
    SET
      status = 'homepage_ready',
      error_message = 'We couldn''t finish building your pages this time. Please try again.',
      updated_at = now()
    WHERE status = 'building_pages'
      AND updated_at < now() - make_interval(mins => ${STALE_MINUTES})
  `);
}

