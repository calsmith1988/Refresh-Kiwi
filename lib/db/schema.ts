import {
  boolean,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const jobStatusEnum = pgEnum("job_status", [
  "queued",
  "analyzing",
  "building_homepage",
  "homepage_ready",
  "building_pages",
  "complete",
  "failed",
]);

export const pageStatusEnum = pgEnum("page_status", [
  "pending",
  "building",
  "ready",
]);

export const jobs = pgTable("jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  sourceUrl: text("source_url").notNull(),
  slug: text("slug").notNull().unique(),
  brandName: text("brand_name"),
  status: jobStatusEnum("status").notNull().default("queued"),
  homepageAgentId: text("homepage_agent_id"),
  homepageRunId: text("homepage_run_id"),
  pagesAgentId: text("pages_agent_id"),
  pagesRunId: text("pages_run_id"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const jobPages = pgTable("job_pages", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  path: text("path").notNull(),
  title: text("title").notNull(),
  gated: boolean("gated").notNull().default(true),
  status: pageStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
