CREATE TYPE "public"."demo_type" AS ENUM('featured', 'community');--> statement-breakpoint
CREATE TYPE "public"."sandbox_execution_status" AS ENUM('pending', 'running', 'completed', 'failed', 'timeout');--> statement-breakpoint
CREATE TABLE "pg-drizzle_demo_visits" (
	"id" text PRIMARY KEY NOT NULL,
	"demo_id" varchar(255) NOT NULL,
	"demo_type" "demo_type" NOT NULL,
	"owner_user_id" text,
	"visitor_user_id" text,
	"visited_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pg-drizzle_sandbox_executions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"language" varchar(50) NOT NULL,
	"code" text NOT NULL,
	"status" "sandbox_execution_status" DEFAULT 'pending' NOT NULL,
	"output" text,
	"error" text,
	"exit_code" integer,
	"execution_time_ms" integer,
	"created_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "pg-drizzle_demo_visits" ADD CONSTRAINT "pg-drizzle_demo_visits_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg-drizzle_demo_visits" ADD CONSTRAINT "pg-drizzle_demo_visits_visitor_user_id_user_id_fk" FOREIGN KEY ("visitor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg-drizzle_sandbox_executions" ADD CONSTRAINT "pg-drizzle_sandbox_executions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "demo_visits_demo_id_idx" ON "pg-drizzle_demo_visits" USING btree ("demo_id");--> statement-breakpoint
CREATE INDEX "demo_visits_owner_user_id_idx" ON "pg-drizzle_demo_visits" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "demo_visits_visited_at_idx" ON "pg-drizzle_demo_visits" USING btree ("visited_at");--> statement-breakpoint
CREATE INDEX "sandbox_executions_user_id_idx" ON "pg-drizzle_sandbox_executions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sandbox_executions_status_idx" ON "pg-drizzle_sandbox_executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sandbox_executions_created_at_idx" ON "pg-drizzle_sandbox_executions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "anon_chat_logs_ip_created_idx" ON "pg-drizzle_anonymous_chat_logs" USING btree ("ip_address","created_at");