import { enqueueBackgroundTask } from "@/lib/worker/queue";

/** Queue a durable homepage screenshot refresh (used after image replace/remix). */
export async function enqueueHomepageScreenshotRefresh(params: {
  slug: string;
  websiteId: string;
}) {
  return enqueueBackgroundTask({
    type: "homepage-screenshot",
    payload: {
      slug: params.slug,
      websiteId: params.websiteId,
    },
  });
}
