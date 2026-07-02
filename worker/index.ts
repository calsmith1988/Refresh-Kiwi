import { localizeWebsiteImages } from "@/lib/assets/localize";
import { generateStarterSeedAssets } from "@/lib/assets/starter";
import { closeDb, getDb, schema } from "@/lib/db";
import { processEditRequest } from "@/lib/edits/processor";
import { processRefreshJob, processFreshJob } from "@/lib/jobs/processor";
import type { LegalAnswers } from "@/lib/legal/draft";
import { processAdditionalPages } from "@/lib/pages/processor";
import {
  claimNextBackgroundTask,
  completeBackgroundTask,
  failBackgroundTask,
  recoverStaleBackgroundWork,
  type BackgroundTask,
} from "@/lib/worker/queue";
import { eq } from "drizzle-orm";

const IDLE_SLEEP_MS = Number(process.env.WORKER_IDLE_SLEEP_MS ?? 5_000);
const RECOVERY_INTERVAL_MS = Number(
  process.env.WORKER_RECOVERY_INTERVAL_MS ?? 60_000,
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

  switch (task.type) {
    case "refresh-homepage": {
      const payload = payloadValue<{ jobId: string }>(task.payload);
      await processRefreshJob(payload.jobId);
      break;
    }

    case "fresh-homepage": {
      const payload = payloadValue<{
        jobId: string;
        generateStarterVisuals?: boolean;
      }>(task.payload);
      const starterAssets = payload.generateStarterVisuals
        ? await (async () => {
            const [job] = await getDb()
              .select({ creationPrompt: schema.jobs.creationPrompt })
              .from(schema.jobs)
              .where(eq(schema.jobs.id, payload.jobId))
              .limit(1);

            return generateStarterSeedAssets(job?.creationPrompt ?? "");
          })()
        : [];

      await processFreshJob(payload.jobId, starterAssets);
      break;
    }

    case "edit-request": {
      const payload = payloadValue<{ editRequestId: string }>(task.payload);
      await processEditRequest(payload.editRequestId);
      break;
    }

    case "additional-pages": {
      const payload = payloadValue<{
        websiteId: string;
        type?: "business" | "legal";
        answers?: Record<string, unknown>;
      }>(task.payload);

      await processAdditionalPages(
        payload.websiteId,
        payload.type === "legal"
          ? { type: "legal", answers: payload.answers as LegalAnswers }
          : { type: "business" },
      );
      break;
    }

    case "localize-images": {
      const payload = payloadValue<{ slug: string }>(task.payload);
      await localizeWebsiteImages(payload.slug);
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
      await failBackgroundTask(task.id, error);
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

