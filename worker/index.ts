import { localizeWebsiteImages } from "@/lib/assets/localize";
import { readSeedAssets, type SeedAssetInput } from "@/lib/assets/seed";
import { configureSharpForLongRunningServer } from "@/lib/assets/sharp-config";
import { generateStarterSeedAssets } from "@/lib/assets/starter";
import {
  CursorRunFailedError,
  isRetryableCursorStartupError,
} from "@/lib/cursor/agent";
import { closeDb, getDb, schema } from "@/lib/db";
import { processEditRequest } from "@/lib/edits/processor";
import { processRefreshJob, processFreshJob } from "@/lib/jobs/processor";
import type { LegalAnswers } from "@/lib/legal/draft";
import { startMemoryHeartbeat } from "@/lib/observability/memory";
import { processAdditionalPages } from "@/lib/pages/processor";
import { tryCaptureHomepageScreenshot } from "@/lib/screenshots/homepage";
import {
  claimNextBackgroundTask,
  completeBackgroundTask,
  failBackgroundTask,
  MAX_TASK_ATTEMPTS,
  recoverStaleBackgroundWork,
  requeueBackgroundTaskWithoutAttempt,
  resetEntityForRetry,
  type BackgroundTask,
} from "@/lib/worker/queue";
import { eq } from "drizzle-orm";

const IDLE_SLEEP_MS = Number(process.env.WORKER_IDLE_SLEEP_MS ?? 5_000);
const RECOVERY_INTERVAL_MS = Number(
  process.env.WORKER_RECOVERY_INTERVAL_MS ?? 60_000,
);
// Transient Cursor capacity errors ([resource_exhausted]) have been observed
// clearing within ~15s. Pause before the requeued task is reclaimed so the
// retry doesn't slam straight into the same limit.
const CURSOR_RETRY_BACKOFF_MS = Number(
  process.env.WORKER_CURSOR_RETRY_BACKOFF_MS ?? 10_000,
);
// How long (from the task's first claim) capacity errors get free requeues
// that don't consume the attempt budget. Inside the window a 429 blip can
// retry as often as needed; past it, failures count normally so a prolonged
// Cursor outage can't loop a task forever. Keep well under the 90-minute
// stale-recovery window.
const CURSOR_CAPACITY_RETRY_WINDOW_MS = Number(
  process.env.WORKER_CURSOR_CAPACITY_RETRY_WINDOW_MS ?? 15 * 60_000,
);

let shouldStop = false;
let lastRecoveryAt = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function payloadValue<T extends object>(payload: unknown): T {
  if (!payload || typeof payload !== "object") {
    throw new Error("Background task payload is invalid");
  }

  return payload as T;
}

async function processTask(task: BackgroundTask): Promise<void> {
  console.info(`[refresh-kiwi-worker] starting task ${task.id} type=${task.type}`);

  // On a retry (attempts already incremented past the first claim), the entity
  // this task drives may be stuck mid-flight (e.g. job "analyzing", edit
  // "running"). The processors early-return unless it's back in a queued state,
  // so reset it first — otherwise we'd mark the task complete while the entity
  // is stranded forever.
  if (task.attempts > 1) {
    await resetEntityForRetry(task);
  }

  // On the final attempt the processors must fail their entity with the
  // friendly user-facing message instead of rethrowing for a requeue that
  // will never happen.
  const finalAttempt = task.attempts >= MAX_TASK_ATTEMPTS;

  switch (task.type) {
    case "refresh-homepage": {
      const payload = payloadValue<{ jobId: string }>(task.payload);
      await processRefreshJob(payload.jobId, { finalAttempt });
      break;
    }

    case "fresh-homepage": {
      const payload = payloadValue<{
        jobId: string;
        generateStarterVisuals?: boolean;
      }>(task.payload);

      let starterAssets: SeedAssetInput[] = [];

      if (payload.generateStarterVisuals) {
        const [job] = await getDb()
          .select({
            slug: schema.jobs.slug,
            creationPrompt: schema.jobs.creationPrompt,
          })
          .from(schema.jobs)
          .where(eq(schema.jobs.id, payload.jobId))
          .limit(1);

        // Starter images are generated and seeded before the Cursor run, so a
        // retry after an agent-start failure already has them in the asset
        // manifest. Reuse those (processFreshJob reads the manifest when given
        // no inputs) instead of paying for a fresh set on every attempt.
        const existingSeedAssets = job ? await readSeedAssets(job.slug) : [];
        const alreadyGenerated = existingSeedAssets.some(
          (asset) => asset.source === "generated",
        );

        if (!alreadyGenerated) {
          starterAssets = await generateStarterSeedAssets(
            job?.creationPrompt ?? "",
          );
        } else {
          console.info(
            `[refresh-kiwi-worker] task ${task.id} reusing previously generated starter assets`,
          );
        }
      }

      await processFreshJob(payload.jobId, starterAssets, { finalAttempt });
      break;
    }

    case "edit-request": {
      const payload = payloadValue<{ editRequestId: string }>(task.payload);
      await processEditRequest(payload.editRequestId, { finalAttempt });
      break;
    }

    case "additional-pages": {
      const payload = payloadValue<{
        websiteId: string;
        type?: "business" | "legal" | "custom";
        answers?: Record<string, unknown>;
        title?: string;
        brief?: string;
      }>(task.payload);

      await processAdditionalPages(
        payload.websiteId,
        payload.type === "legal"
          ? { type: "legal", answers: payload.answers as LegalAnswers }
          : payload.type === "custom"
            ? {
                type: "custom",
                title: payload.title ?? "",
                brief: payload.brief ?? "",
              }
          : { type: "business" },
        { finalAttempt },
      );
      break;
    }

    case "localize-images": {
      const payload = payloadValue<{ slug: string }>(task.payload);
      await localizeWebsiteImages(payload.slug);
      break;
    }

    case "homepage-screenshot": {
      const payload = payloadValue<{ slug: string; websiteId?: string }>(
        task.payload,
      );
      await tryCaptureHomepageScreenshot(payload.slug, {
        websiteId: payload.websiteId,
      });
      break;
    }

    default:
      throw new Error(`Unknown background task type: ${task.type}`);
  }

  await completeBackgroundTask(task.id);
  console.info(`[refresh-kiwi-worker] completed task ${task.id} type=${task.type}`);
}

async function recoverIfDue(): Promise<void> {
  if (Date.now() - lastRecoveryAt < RECOVERY_INTERVAL_MS) {
    return;
  }

  lastRecoveryAt = Date.now();
  await recoverStaleBackgroundWork();
}

async function runWorker(): Promise<void> {
  configureSharpForLongRunningServer();
  startMemoryHeartbeat("worker");
  console.info("[refresh-kiwi-worker] worker started");

  while (!shouldStop) {
    await recoverIfDue();

    const task = await claimNextBackgroundTask();

    if (!task) {
      await sleep(IDLE_SLEEP_MS);
      continue;
    }

    try {
      await processTask(task);
    } catch (error) {
      console.error(
        `[refresh-kiwi-worker] task ${task.id} failed type=${task.type}`,
        error,
      );

      // Capacity errors from Cursor aren't the task's fault: refund the
      // attempt so a 429 blip can't eat the whole budget and permanently fail
      // a build. Time-bounded from the task's first claim so a long outage
      // eventually falls back to counted attempts.
      const withinCapacityRetryWindow =
        task.startedAt != null &&
        Date.now() - new Date(task.startedAt).getTime() <
          CURSOR_CAPACITY_RETRY_WINDOW_MS;

      if (isRetryableCursorStartupError(error) && withinCapacityRetryWindow) {
        console.warn(
          `[refresh-kiwi-worker] task ${task.id} hit a transient Cursor capacity error; requeueing without consuming an attempt`,
        );
        // The retry may reclaim with the same attempt count, so processTask's
        // attempts > 1 reset won't fire — reset the stuck entity here, before
        // the task becomes claimable again.
        await resetEntityForRetry(task);
        await requeueBackgroundTaskWithoutAttempt(task.id, error);
        await sleep(CURSOR_RETRY_BACKOFF_MS);
        continue;
      }

      await failBackgroundTask(task.id, error);

      if (
        isRetryableCursorStartupError(error) ||
        error instanceof CursorRunFailedError
      ) {
        await sleep(CURSOR_RETRY_BACKOFF_MS);
      }
    }
  }
}

async function shutdown(signal: string) {
  console.info(`[refresh-kiwi-worker] received ${signal}, shutting down`);
  shouldStop = true;
  await closeDb();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

runWorker()
  .catch(async (error) => {
    console.error("[refresh-kiwi-worker] fatal worker error", error);
    await closeDb();
    process.exit(1);
  });

