-- Phase 4 security hardening: race-safe email dedupe for sendOnce.
-- dedupe_key is "type:userId:websiteId"; rows recorded before this column
-- keep NULL, which the unique index ignores.
ALTER TABLE "email_events" ADD COLUMN IF NOT EXISTS "dedupe_key" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "email_events_dedupe_key_idx"
        ON "email_events" USING btree ("dedupe_key");
