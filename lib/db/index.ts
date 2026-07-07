import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getDatabaseUrl } from "@/lib/db/connection";
import * as schema from "./schema";

let client: ReturnType<typeof postgres> | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Per-process pool size. Render Postgres Starter allows ~97 connections total,
 * so `max * (web instances + worker)` must stay under that. The default of 5
 * keeps headroom while scaling out; raise DB_POOL_MAX only if you've moved to
 * a pooled connection string (PgBouncer / Supavisor / Render's pooled URL),
 * which is the real fix before running many instances.
 */
function poolMax(): number {
  const parsed = Number.parseInt(process.env.DB_POOL_MAX?.trim() ?? "", 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
}

export function getDb() {
  const databaseUrl = getDatabaseUrl();

  if (!client) {
    client = postgres(databaseUrl, {
      max: poolMax(),
      // Return idle connections to the server so bursts don't hold the pool
      // open and starve other instances.
      idle_timeout: 20,
      max_lifetime: 60 * 30,
      connect_timeout: 10,
    });
    db = drizzle(client, { schema });
  }

  return db!;
}

export async function closeDb() {
  if (client) {
    await client.end();
    client = null;
    db = null;
  }
}

export { schema };
