-- Marketing attribution on jobs: captured client-side at generation time and
-- not reconstructable later, so it lives on the job (anonymous runs included).
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "utm_source" text;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "utm_medium" text;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "utm_campaign" text;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "referrer" text;

-- Audit trail for admin-dashboard actions. admin_email is denormalized so the
-- trail survives account deletion.
CREATE TABLE IF NOT EXISTS "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" uuid,
	"admin_email" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_audit_log_admin_user_id_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE set null
);

CREATE INDEX IF NOT EXISTS "admin_audit_log_created_at_idx" ON "admin_audit_log" ("created_at");
