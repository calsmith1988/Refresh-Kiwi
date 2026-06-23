CREATE TYPE "public"."generation_mode" AS ENUM('refresh', 'fresh');--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "source_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "websites" ALTER COLUMN "source_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "generation_mode" "generation_mode" DEFAULT 'refresh' NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "creation_prompt" text;--> statement-breakpoint
ALTER TABLE "websites" ADD COLUMN "generation_mode" "generation_mode" DEFAULT 'refresh' NOT NULL;--> statement-breakpoint
ALTER TABLE "websites" ADD COLUMN "creation_prompt" text;
