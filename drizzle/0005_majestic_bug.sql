CREATE TABLE "pg-drizzle_video_render_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"chat_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"video_json" text NOT NULL,
	"output_url" text,
	"error_message" text,
	"progress" integer DEFAULT 0,
	"started_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pg-drizzle_user_chats" ADD COLUMN "demo_html" text;--> statement-breakpoint
ALTER TABLE "pg-drizzle_test_cases" ADD COLUMN "target_url" text;--> statement-breakpoint
ALTER TABLE "pg-drizzle_video_render_jobs" ADD CONSTRAINT "pg-drizzle_video_render_jobs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg-drizzle_video_render_jobs" ADD CONSTRAINT "pg-drizzle_video_render_jobs_chat_id_pg-drizzle_video_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."pg-drizzle_video_chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "video_render_jobs_user_id_idx" ON "pg-drizzle_video_render_jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "video_render_jobs_status_idx" ON "pg-drizzle_video_render_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "video_render_jobs_chat_id_idx" ON "pg-drizzle_video_render_jobs" USING btree ("chat_id");