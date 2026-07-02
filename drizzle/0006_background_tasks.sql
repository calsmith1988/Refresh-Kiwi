CREATE TABLE "background_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"payload" jsonb NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"locked_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "background_tasks_status_created_at_idx" ON "background_tasks" USING btree ("status", "created_at");
--> statement-breakpoint
CREATE INDEX "background_tasks_type_status_idx" ON "background_tasks" USING btree ("type", "status");
