-- Rewards won from the build-time Kiwi Catch game (currently one kind: a free
-- first month of Pro). The row is created when a round starts, so the play
-- clock is server-side and a win can be verified rather than trusted.
CREATE TABLE IF NOT EXISTS "rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text DEFAULT 'free_month_pro' NOT NULL,
	"job_id" uuid NOT NULL,
	"user_id" uuid,
	"token_hash" text,
	"status" text DEFAULT 'playing' NOT NULL,
	"game_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"issued_at" timestamp with time zone,
	"attached_at" timestamp with time zone,
	"redeemed_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rewards_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE cascade,
	CONSTRAINT "rewards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE set null
);

-- One reward per build.
CREATE UNIQUE INDEX IF NOT EXISTS "rewards_job_id_idx" ON "rewards" ("job_id");

-- Claim-token lookup. NULL until the round is won, and NULLs stay distinct in
-- Postgres, so unwon rows don't collide.
CREATE UNIQUE INDEX IF NOT EXISTS "rewards_token_hash_idx" ON "rewards" ("token_hash");

-- One free month per customer, ever. Partial so the many unclaimed rows
-- (user_id NULL, or still "issued") aren't constrained.
CREATE UNIQUE INDEX IF NOT EXISTS "rewards_user_claimed_idx" ON "rewards" ("user_id")
	WHERE "user_id" IS NOT NULL AND "status" IN ('attached', 'redeemed');
