// Smoke test for the admin Overview stats query.
//
// Usage:
//   npx tsx scripts/test-admin-stats.ts
//
// Needs DATABASE_URL in .env.local (or the environment). Prints the stats
// payload and verifies it survives JSON serialization — the Overview page
// fails with an empty response if anything in there is not serializable.
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

import { getAdminStats, listAdminUsers } from "@/lib/admin/service";
import { closeDb } from "@/lib/db";

async function main() {
  try {
    const stats = await getAdminStats(30);
    const serialized = JSON.stringify(stats);

    console.log(serialized.slice(0, 1200));
    console.log(`\nOK — stats payload serialized (${serialized.length} bytes)`);

    const users = await listAdminUsers({});
    console.log("\nUser website/edit counts:");
    for (const user of users) {
      console.log(
        `  ${user.email}: sites=${user.websiteCount} edits=${user.editCount}`,
      );
    }
    JSON.stringify(users);
    console.log("\nOK — users payload serialized");
  } catch (error) {
    console.error("FAILED:", error);

    if (error instanceof Error && error.cause) {
      console.error("CAUSE:", error.cause);
    }

    process.exitCode = 1;
  } finally {
    await closeDb();
  }
}

void main();
