import {
  boolean,
  integer,
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
  sourceUrl: text("source_url").notNull(),
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

export const websites = pgTable("websites", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  jobId: uuid("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  sourceUrl: text("source_url").notNull(),
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
