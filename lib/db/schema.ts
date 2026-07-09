import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
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

export const generationModeEnum = pgEnum("generation_mode", ["refresh", "fresh"]);

export const planEnum = pgEnum("plan", ["free", "pro"]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "none",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "incomplete",
]);

export const websiteStatusEnum = pgEnum("website_status", [
  "preview",
  "live",
  "expired",
  "archived",
]);

export const editRequestStatusEnum = pgEnum("edit_request_status", [
  "queued",
  "running",
  "complete",
  "failed",
]);

export type BackgroundTaskPayload =
  | { jobId: string; generateStarterVisuals?: boolean }
  | { editRequestId: string }
  | {
      websiteId: string;
      type?: "business" | "legal";
      answers?: Record<string, unknown>;
    }
  | { websiteId: string; type: "custom"; title: string; brief: string }
  | { slug: string };

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    name: text("name"),
    passwordHash: text("password_hash").notNull(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
    twoFactorSecret: text("two_factor_secret"),
    marketingEmailsEnabled: boolean("marketing_emails_enabled")
      .notNull()
      .default(true),
    plan: planEnum("plan").notNull().default("free"),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    subscriptionStatus: subscriptionStatusEnum("subscription_status")
      .notNull()
      .default("none"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
  }),
);

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const emailVerificationTokens = pgTable(
  "email_verification_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tokenHashIdx: uniqueIndex("email_verification_tokens_token_hash_idx").on(
      table.tokenHash,
    ),
  }),
);

export const emailChangeTokens = pgTable(
  "email_change_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    newEmail: text("new_email").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tokenHashIdx: uniqueIndex("email_change_tokens_token_hash_idx").on(
      table.tokenHash,
    ),
  }),
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tokenHashIdx: uniqueIndex("password_reset_tokens_token_hash_idx").on(
      table.tokenHash,
    ),
  }),
);

export const twoFactorChallenges = pgTable(
  "two_factor_challenges",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tokenHashIdx: uniqueIndex("two_factor_challenges_token_hash_idx").on(
      table.tokenHash,
    ),
  }),
);

export const twoFactorRecoveryCodes = pgTable("two_factor_recovery_codes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  codeHash: text("code_hash").notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const jobs = pgTable("jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  sourceUrl: text("source_url"),
  generationMode: generationModeEnum("generation_mode")
    .notNull()
    .default("refresh"),
  creationPrompt: text("creation_prompt"),
  slug: text("slug").notNull().unique(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  clientIp: text("client_ip"),
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

export const websites = pgTable(
  "websites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    sourceUrl: text("source_url"),
    generationMode: generationModeEnum("generation_mode")
      .notNull()
      .default("refresh"),
    creationPrompt: text("creation_prompt"),
    slug: text("slug").notNull().unique(),
    brandName: text("brand_name"),
    status: websiteStatusEnum("status").notNull().default("preview"),
    freeEditsUsed: integer("free_edits_used").notNull().default(0),
    freeEditsLimit: integer("free_edits_limit").notNull().default(3),
    customDomain: text("custom_domain"),
    customDomainStatus: text("custom_domain_status").notNull().default("none"),
    customDomainRenderId: text("custom_domain_render_id"),
    customDomainError: text("custom_domain_error"),
    customDomainVerifiedAt: timestamp("custom_domain_verified_at", {
      withTimezone: true,
    }),
    customDomainLastCheckedAt: timestamp("custom_domain_last_checked_at", {
      withTimezone: true,
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // One website per connected custom domain — a duplicate would make the
    // custom-domain lookup ambiguous (it serves the first match). Partial so
    // the many websites without a domain (NULL) aren't constrained.
    customDomainIdx: uniqueIndex("websites_custom_domain_idx")
      .on(table.customDomain)
      .where(sql`${table.customDomain} IS NOT NULL`),
  }),
);

export const emailEvents = pgTable(
  "email_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    websiteId: uuid("website_id").references(() => websites.id, {
      onDelete: "set null",
    }),
    type: text("type").notNull(),
    // "type:userId:websiteId" — set on every insert. A plain unique index on
    // the nullable FK columns wouldn't dedupe (NULLs compare distinct), and it
    // must survive user deletion (FKs are SET NULL), so the key is its own
    // column rather than an expression over the FKs.
    dedupeKey: text("dedupe_key"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    dedupeKeyIdx: uniqueIndex("email_events_dedupe_key_idx").on(
      table.dedupeKey,
    ),
  }),
);

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

export const editRequests = pgTable("edit_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  websiteId: uuid("website_id")
    .notNull()
    .references(() => websites.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  status: editRequestStatusEnum("status").notNull().default("queued"),
  agentId: text("agent_id"),
  runId: text("run_id"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Idempotency ledger for Stripe webhooks. Stripe re-delivers events on
// timeout/retry, so we record each event id the first time we process it and
// skip any repeat — preventing double plan syncs, duplicate emails, etc.
export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const backgroundTasks = pgTable(
  "background_tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: text("type").notNull(),
    status: text("status").notNull().default("queued"),
    payload: jsonb("payload").$type<BackgroundTaskPayload>().notNull(),
    attempts: integer("attempts").notNull().default(0),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    statusCreatedAtIdx: index("background_tasks_status_created_at_idx").on(
      table.status,
      table.createdAt,
    ),
    typeStatusIdx: index("background_tasks_type_status_idx").on(
      table.type,
      table.status,
    ),
  }),
);
