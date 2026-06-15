ALTER TABLE "jobs" ADD COLUMN "client_ip" text;--> statement-breakpoint
ALTER TABLE "websites" ADD COLUMN "custom_domain_status" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "websites" ADD COLUMN "custom_domain_render_id" text;--> statement-breakpoint
ALTER TABLE "websites" ADD COLUMN "custom_domain_error" text;--> statement-breakpoint
ALTER TABLE "websites" ADD COLUMN "custom_domain_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "websites" ADD COLUMN "custom_domain_last_checked_at" timestamp with time zone;