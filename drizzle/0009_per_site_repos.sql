-- Per-site GitHub repos: each new site gets its own repo so Cursor agents
-- clone one site instead of the whole shared monorepo. NULL keeps legacy
-- sites on CURSOR_SITES_REPO_URL.
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "sites_repo_url" text;
