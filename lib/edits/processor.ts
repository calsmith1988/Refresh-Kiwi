import { eq } from "drizzle-orm";

import { localizeWebsiteImages } from "@/lib/assets/localize";
import { isCursorStartupError, runEditPhase } from "@/lib/cursor/agent";
import { getDb, schema } from "@/lib/db";
import { syncPreviewFromAgent } from "@/lib/preview/sync";
import { tryCaptureHomepageScreenshot } from "@/lib/screenshots/homepage";

const { editRequests, websites } = schema;

async function updateEditRequest(
  editRequestId: string,
  values: Partial<typeof editRequests.$inferInsert>,
) {
  await getDb()
    .update(editRequests)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(editRequests.id, editRequestId));
}

async function isEditStillRunning(editRequestId: string): Promise<boolean> {
  const [editRequest] = await getDb()
    .select({ status: editRequests.status })
    .from(editRequests)
    .where(eq(editRequests.id, editRequestId))
    .limit(1);

  return editRequest?.status === "running";
}

export async function processEditRequest(editRequestId: string): Promise<void> {
  const db = getDb();
  const [editRequest] = await db
    .select({
      id: editRequests.id,
      status: editRequests.status,
      prompt: editRequests.prompt,
      website: websites,
    })
    .from(editRequests)
    .innerJoin(websites, eq(editRequests.websiteId, websites.id))
    .where(eq(editRequests.id, editRequestId))
    .limit(1);

  if (!editRequest || editRequest.status !== "queued") {
    return;
  }

  try {
    await updateEditRequest(editRequest.id, { status: "running" });

    const editRun = await runEditPhase(
      {
        sourceUrl: editRequest.website.sourceUrl,
        slug: editRequest.website.slug,
        editPrompt: editRequest.prompt,
        generationMode: editRequest.website.generationMode,
        creationPrompt: editRequest.website.creationPrompt,
      },
      async (started) => {
        await updateEditRequest(editRequest.id, {
          agentId: started.agentId,
          runId: started.runId,
        });
      },
    );

    if (!(await isEditStillRunning(editRequest.id))) {
      console.info(`[refresh-kiwi] edit request ${editRequest.id} stopped before sync`);
      return;
    }

    await syncPreviewFromAgent(editRun.agentId, editRequest.website.slug);

    if (!(await isEditStillRunning(editRequest.id))) {
      console.info(`[refresh-kiwi] edit request ${editRequest.id} stopped after sync`);
      return;
    }

    // Edits can introduce new hotlinked images; localise them too. This is a
    // fast no-op when everything is already local.
    await localizeWebsiteImages(editRequest.website.slug);

    if (!(await isEditStillRunning(editRequest.id))) {
      console.info(
        `[refresh-kiwi] edit request ${editRequest.id} stopped after image localisation`,
      );
      return;
    }

    // Capture before marking complete so the dashboard's last poll already
    // includes a cache-busted screenshot URL for the updated homepage.
    await tryCaptureHomepageScreenshot(editRequest.website.slug, {
      websiteId: editRequest.website.id,
    });

    await updateEditRequest(editRequest.id, { status: "complete" });
  } catch (error) {
    const message = isCursorStartupError(error)
      ? `Cursor edit agent failed to start: ${error.message}`
      : error instanceof Error
        ? error.message
        : "Unknown edit error";

    console.error(
      `[refresh-kiwi] edit request ${editRequest.id} failed: ${message}`,
    );

    const [currentEdit] = await db
      .select({ errorMessage: editRequests.errorMessage, status: editRequests.status })
      .from(editRequests)
      .where(eq(editRequests.id, editRequest.id))
      .limit(1);

    if (
      currentEdit?.status === "failed" &&
      currentEdit.errorMessage === "Edit cancelled."
    ) {
      return;
    }

    await updateEditRequest(editRequest.id, {
      status: "failed",
      errorMessage: message,
    });
  }
}
