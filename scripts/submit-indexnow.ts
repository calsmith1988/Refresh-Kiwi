/**
 * One-off IndexNow submission for refresh.kiwi marketing URLs.
 *
 * Usage (explicit opt-in — never runs during next build):
 *   INDEXNOW_SUBMIT=1 npx tsx scripts/submit-indexnow.ts
 */
import { submitMarketingUrlsToIndexNow } from "../lib/seo/indexnow";

async function main() {
  if (process.env.INDEXNOW_SUBMIT !== "1") {
    console.error(
      "Refusing to submit: set INDEXNOW_SUBMIT=1 to run this script.",
    );
    process.exit(1);
  }

  const result = await submitMarketingUrlsToIndexNow();

  if (!result.ok) {
    console.error("IndexNow submission failed:", result);
    process.exit(1);
  }

  console.log(
    `IndexNow OK (${result.status}): submitted ${result.urlCount} marketing URLs.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
