/**
 * Applies a single SQL migration file to DATABASE_URL.
 *
 * drizzle-kit's own migrate command can't be trusted in this repo: the SQL
 * files run ahead of drizzle/meta/_journal.json, so it would skip most of them.
 * This runs one file, deliberately, and every migration here is written to be
 * safe to re-run.
 *
 * Usage: node scripts/apply-migration.mjs drizzle/0011_rewards.sql
 */

import { readFile } from "node:fs/promises";

import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const [file] = process.argv.slice(2);

if (!file) {
  console.error("Usage: node scripts/apply-migration.mjs <path-to-sql-file>");
  process.exit(1);
}

const url = process.env.DATABASE_URL;

if (!url) {
  console.error("DATABASE_URL missing (checked .env.local and the environment)");
  process.exit(1);
}

// Render Postgres needs SSL; a local server generally doesn't offer it.
const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
const connectionUrl =
  isLocal || url.includes("sslmode")
    ? url
    : `${url}${url.includes("?") ? "&" : "?"}sslmode=require`;

const sql = postgres(connectionUrl, { connect_timeout: 15 });

try {
  const contents = await readFile(file, "utf8");

  // Simple query mode so one file can hold several statements.
  await sql.unsafe(contents).simple();
  console.log(`Applied ${file}`);
} catch (error) {
  console.error(`Failed to apply ${file}:`, error.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
