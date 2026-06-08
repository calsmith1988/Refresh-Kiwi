import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

import { getDatabaseUrl } from "./lib/db/connection";

config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: getDatabaseUrl(),
  },
});
