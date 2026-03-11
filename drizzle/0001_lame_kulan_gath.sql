CREATE TABLE "pg-drizzle_performance_metrics" (
	"id" text PRIMARY KEY NOT NULL,
	"test_run_id" text NOT NULL,
	"page_url" text NOT NULL,
	"lcp_ms" real,
	"fid_ms" real,
	"cls" real,
	"ttfb_ms" real,
	"raw_metrics" jsonb,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pg-drizzle_bug_reports" ADD COLUMN "annotation_box" jsonb;--> statement-breakpoint
ALTER TABLE "pg-drizzle_report_exports" ADD COLUMN "embed_badge_token" varchar(64);--> statement-breakpoint
ALTER TABLE "pg-drizzle_test_results" ADD COLUMN "network_logs" jsonb;--> statement-breakpoint
ALTER TABLE "pg-drizzle_test_runs" ADD COLUMN "running" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "pg-drizzle_performance_metrics" ADD CONSTRAINT "pg-drizzle_performance_metrics_test_run_id_pg-drizzle_test_runs_id_fk" FOREIGN KEY ("test_run_id") REFERENCES "public"."pg-drizzle_test_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "performance_metrics_test_run_id_idx" ON "pg-drizzle_performance_metrics" USING btree ("test_run_id");--> statement-breakpoint
CREATE INDEX "performance_metrics_page_url_idx" ON "pg-drizzle_performance_metrics" USING btree ("page_url");--> statement-breakpoint
CREATE INDEX "bug_reports_test_run_id_category_idx" ON "pg-drizzle_bug_reports" USING btree ("test_run_id","category");--> statement-breakpoint
CREATE INDEX "report_exports_embed_badge_token_idx" ON "pg-drizzle_report_exports" USING btree ("embed_badge_token");--> statement-breakpoint
CREATE INDEX "test_runs_user_id_started_at_idx" ON "pg-drizzle_test_runs" USING btree ("user_id","started_at");--> statement-breakpoint
ALTER TABLE "pg-drizzle_report_exports" ADD CONSTRAINT "pg-drizzle_report_exports_embed_badge_token_unique" UNIQUE("embed_badge_token");