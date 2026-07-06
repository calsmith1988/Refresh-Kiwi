-- Stripe webhook idempotency ledger: one row per processed event id.
CREATE TABLE IF NOT EXISTS "stripe_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- One website per connected custom domain (partial: NULLs are unconstrained).
CREATE UNIQUE INDEX IF NOT EXISTS "websites_custom_domain_idx"
	ON "websites" USING btree ("custom_domain")
	WHERE "custom_domain" IS NOT NULL;
