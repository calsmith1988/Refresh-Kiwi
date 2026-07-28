// Manual smoke test for the refresh pre-flight reachability check.
// Usage: npx tsx scripts/test-reachability.mjs [url ...]
import { checkSourceUrlReachable } from "../lib/jobs/reachability.ts";

const urls = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      "https://www.brennanheating.co.uk/",
      "https://www.brennaheatin.co.uk/",
      "https://www.smhplumbing.co.uk/",
      "https://www.blocdrop.co.uk/",
      "https://example.com/",
    ];

for (const url of urls) {
  const started = Date.now();
  const result = await checkSourceUrlReachable(url);
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log(
    `${result.ok ? "REACHABLE  " : "UNREACHABLE"} ${url} (${elapsed}s)` +
      (result.ok ? "" : ` -> "${result.message}"`),
  );
}
