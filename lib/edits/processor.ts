import { eq } from "drizzle-orm";

import { localizeWebsiteImages } from "@/lib/assets/localize";
import { isCursorStartupError, runEditPhase } from "@/lib/cursor/agent";
import { getDb, schema } from "@/lib/db";
import { syncPreviewFromAgent } from "@/lib/preview/sync";

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
      },
      async (started) => {
        await updateEditRequest(editRequest.id, {
          agentId: started.agentId,
          runId: started.runId,
        });
      },
    );

    await syncPreviewFromAgent(editRun.agentId, editRequest.website.slug);

    // Edits can introduce new hotlinked images; localise them too. This is a
    // fast no-op when everything is already local.
    await localizeWebsiteImages(editRequest.website.slug);

    await updateEditRequest(editRequest.id, { status: "complete" });

    await db
      .update(websites)
      .set({ updatedAt: new Date() })
      .where(eq(websites.id, editRequest.website.id));
  } catch (error) {
    const message = isCursorStartupError(error)
      ? `Cursor edit agent failed to start: ${error.message}`
      : error instanceof Error
        ? error.message
        : "Unknown edit error";

    console.error(
      `[refresh-kiwi] edit request ${editRequest.id} failed: ${message}`,
    );

    await updateEditRequest(editRequest.id, {
      status: "failed",
      errorMessage: message,
    });
  }
}
