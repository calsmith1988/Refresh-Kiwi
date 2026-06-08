import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const connectionUrl = url.includes("sslmode")
  ? url
  : `${url}${url.includes("?") ? "&" : "?"}sslmode=require`;

const sql = postgres(connectionUrl, { connect_timeout: 15 });

try {
  const result = await sql`SELECT 1 AS ok`;
  console.log("Connection OK:", result[0]);
} catch (error) {
  console.error("Connection failed:", error.message);
  process.exit(1);
} finally {
  await sql.end();
}
