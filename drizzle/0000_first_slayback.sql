CREATE TYPE "public"."bug_severity" AS ENUM('critical', 'high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."bug_status" AS ENUM('open', 'fixed', 'ignored');--> statement-breakpoint
CREATE TYPE "public"."chat_type" AS ENUM('BUILDER', 'OPENROUTER');--> statement-breakpoint
CREATE TYPE "public"."demo_type" AS ENUM('featured', 'community');--> statement-breakpoint
CREATE TYPE "public"."message_role" AS ENUM('USER', 'ASSISTANT', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'completed', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."report_format" AS ENUM('pdf', 'json', 'html');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'cancelled', 'expired', 'pending');--> statement-breakpoint
CREATE TYPE "public"."test_priority" AS ENUM('P0', 'P1', 'P2');--> statement-breakpoint
CREATE TYPE "public"."test_result_status" AS ENUM('pending', 'running', 'passed', 'failed', 'flaky', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."test_run_status" AS ENUM('crawling', 'generating', 'executing', 'reporting', 'complete', 'failed');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('subscription', 'credit_pack', 'refund');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin', 'manager', 'team_member');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pg-drizzle_anonymous_chat_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"ip_address" varchar(45) NOT NULL,
	"v0_chat_id" varchar(255) NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pg-drizzle_bug_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"test_run_id" text NOT NULL,
	"test_result_id" text,
	"severity" "bug_severity" DEFAULT 'medium',
	"category" varchar(50),
	"title" text,
	"description" text,
	"reproduction_steps" jsonb,
	"screenshot_url" text,
	"ai_fix_suggestion" text,
	"page_url" text,
	"status" "bug_status" DEFAULT 'open',
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pg-drizzle_user_chats" (
	"id" text PRIMARY KEY NOT NULL,
	"v0_chat_id" varchar(255),
	"user_id" text NOT NULL,
	"title" text,
	"prompt" text,
	"demo_url" text,
	"preview_url" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"is_starred" boolean DEFAULT false NOT NULL,
	"chat_type" "chat_type" DEFAULT 'BUILDER' NOT NULL,
	"model_name" text,
	"prompt_metadata" jsonb,
	"conversation_id" text,
	CONSTRAINT "pg-drizzle_user_chats_v0_chat_id_unique" UNIQUE("v0_chat_id")
);
--> statement-breakpoint
CREATE TABLE "pg-drizzle_conversation_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"role" "message_role" NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pg-drizzle_conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"model_name" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"title" text
);
--> statement-breakpoint
CREATE TABLE "pg-drizzle_crawl_results" (
	"id" text PRIMARY KEY NOT NULL,
	"test_run_id" text NOT NULL,
	"pages" jsonb,
	"elements" jsonb,
	"forms" jsonb,
	"links" jsonb,
	"screenshots" jsonb,
	"crawl_time_ms" integer,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pg-drizzle_credit_usage_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"credits_used" integer NOT NULL,
	"action" varchar(50) NOT NULL,
	"chat_id" varchar(255),
	"subscription_credits_remaining" integer NOT NULL,
	"additional_credits_remaining" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pg-drizzle_demo_visits" (
	"id" text PRIMARY KEY NOT NULL,
	"demo_id" varchar(255) NOT NULL,
	"demo_type" "demo_type" NOT NULL,
	"owner_user_id" text,
	"visitor_user_id" text,
	"visited_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pg-drizzle_github_repos" (
	"id" text PRIMARY KEY NOT NULL,
	"chat_id" text NOT NULL,
	"user_id" text NOT NULL,
	"github_repo_id" text NOT NULL,
	"repo_name" text NOT NULL,
	"repo_full_name" text NOT NULL,
	"repo_url" text NOT NULL,
	"visibility" text DEFAULT 'public' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "github_repos_github_repo_id_unique" UNIQUE("github_repo_id")
);
--> statement-breakpoint
CREATE TABLE "pg-drizzle_payment_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"razorpay_order_id" varchar(255),
	"razorpay_payment_id" varchar(255),
	"razorpay_signature" varchar(512),
	"type" "transaction_type" NOT NULL,
	"amount" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"credits_added" integer DEFAULT 0 NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"subscription_id" text,
	"credit_pack_id" varchar(50),
	"metadata" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pg-drizzle_post" (
	"id" integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY (sequence name "pg-drizzle_post_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(256),
	"createdById" varchar(255) NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "pg-drizzle_report_exports" (
	"id" text PRIMARY KEY NOT NULL,
	"test_run_id" text NOT NULL,
	"format" "report_format" NOT NULL,
	"file_url" text,
	"ai_summary" text,
	"shareable_slug" varchar(100),
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "pg-drizzle_report_exports_shareable_slug_unique" UNIQUE("shareable_slug")
);
--> statement-breakpoint
CREATE TABLE "pg-drizzle_resume_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"latex_template" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pg-drizzle_sandbox_executions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"language" text NOT NULL,
	"code" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"output" text,
	"error" text,
	"exit_code" integer,
	"execution_time_ms" integer,
	"created_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "pg-drizzle_persona_layouts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"slug" text,
	"title" text DEFAULT 'Untitled' NOT NULL,
	"layout" text DEFAULT '[]' NOT NULL,
	"background" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "pg-drizzle_persona_layouts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "pg-drizzle_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"razorpay_subscription_id" varchar(255),
	"razorpay_plan_id" varchar(255),
	"plan_id" varchar(50) NOT NULL,
	"plan_name" varchar(100) NOT NULL,
	"plan_price" integer NOT NULL,
	"credits_per_month" integer NOT NULL,
	"status" "subscription_status" DEFAULT 'pending' NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"cancelled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "pg-drizzle_test_cases" (
	"id" text PRIMARY KEY NOT NULL,
	"test_run_id" text NOT NULL,
	"category" varchar(50),
	"title" text,
	"description" text,
	"steps" jsonb,
	"expected_result" text,
	"priority" "test_priority" DEFAULT 'P1',
	"tags" jsonb,
	"estimated_duration" integer,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pg-drizzle_test_results" (
	"id" text PRIMARY KEY NOT NULL,
	"test_case_id" text NOT NULL,
	"test_run_id" text NOT NULL,
	"status" "test_result_status" DEFAULT 'pending',
	"actual_result" text,
	"duration_ms" integer,
	"screenshot_url" text,
	"error_details" text,
	"console_logs" jsonb,
	"retry_count" integer DEFAULT 0,
	"tinyfish_job_id" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pg-drizzle_test_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text,
	"target_url" text NOT NULL,
	"status" "test_run_status" DEFAULT 'crawling' NOT NULL,
	"overall_score" integer,
	"total_tests" integer DEFAULT 0,
	"passed" integer DEFAULT 0,
	"failed" integer DEFAULT 0,
	"skipped" integer DEFAULT 0,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"roles" "user_role"[] DEFAULT '{"user"}' NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "pg-drizzle_user_credits" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"subscription_credits" integer DEFAULT 0 NOT NULL,
	"additional_credits" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "pg-drizzle_user_credits_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "pg-drizzle_user_resumes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"template_id" text,
	"resume_data" text NOT NULL,
	"latex_content" text,
	"pdf_url" text,
	"title" varchar(255),
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg-drizzle_bug_reports" ADD CONSTRAINT "pg-drizzle_bug_reports_test_run_id_pg-drizzle_test_runs_id_fk" FOREIGN KEY ("test_run_id") REFERENCES "public"."pg-drizzle_test_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg-drizzle_bug_reports" ADD CONSTRAINT "pg-drizzle_bug_reports_test_result_id_pg-drizzle_test_results_id_fk" FOREIGN KEY ("test_result_id") REFERENCES "public"."pg-drizzle_test_results"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg-drizzle_user_chats" ADD CONSTRAINT "pg-drizzle_user_chats_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg-drizzle_user_chats" ADD CONSTRAINT "pg-drizzle_user_chats_conversation_id_pg-drizzle_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."pg-drizzle_conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg-drizzle_conversation_messages" ADD CONSTRAINT "pg-drizzle_conversation_messages_conversation_id_pg-drizzle_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."pg-drizzle_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg-drizzle_conversations" ADD CONSTRAINT "pg-drizzle_conversations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg-drizzle_crawl_results" ADD CONSTRAINT "pg-drizzle_crawl_results_test_run_id_pg-drizzle_test_runs_id_fk" FOREIGN KEY ("test_run_id") REFERENCES "public"."pg-drizzle_test_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg-drizzle_credit_usage_logs" ADD CONSTRAINT "pg-drizzle_credit_usage_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg-drizzle_demo_visits" ADD CONSTRAINT "pg-drizzle_demo_visits_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg-drizzle_demo_visits" ADD CONSTRAINT "pg-drizzle_demo_visits_visitor_user_id_user_id_fk" FOREIGN KEY ("visitor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg-drizzle_github_repos" ADD CONSTRAINT "pg-drizzle_github_repos_chat_id_pg-drizzle_user_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."pg-drizzle_user_chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg-drizzle_github_repos" ADD CONSTRAINT "pg-drizzle_github_repos_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg-drizzle_payment_transactions" ADD CONSTRAINT "pg-drizzle_payment_transactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg-drizzle_payment_transactions" ADD CONSTRAINT "pg-drizzle_payment_transactions_subscription_id_pg-drizzle_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."pg-drizzle_subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg-drizzle_post" ADD CONSTRAINT "pg-drizzle_post_createdById_user_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg-drizzle_report_exports" ADD CONSTRAINT "pg-drizzle_report_exports_test_run_id_pg-drizzle_test_runs_id_fk" FOREIGN KEY ("test_run_id") REFERENCES "public"."pg-drizzle_test_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg-drizzle_persona_layouts" ADD CONSTRAINT "pg-drizzle_persona_layouts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg-drizzle_subscriptions" ADD CONSTRAINT "pg-drizzle_subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg-drizzle_test_cases" ADD CONSTRAINT "pg-drizzle_test_cases_test_run_id_pg-drizzle_test_runs_id_fk" FOREIGN KEY ("test_run_id") REFERENCES "public"."pg-drizzle_test_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg-drizzle_test_results" ADD CONSTRAINT "pg-drizzle_test_results_test_case_id_pg-drizzle_test_cases_id_fk" FOREIGN KEY ("test_case_id") REFERENCES "public"."pg-drizzle_test_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg-drizzle_test_results" ADD CONSTRAINT "pg-drizzle_test_results_test_run_id_pg-drizzle_test_runs_id_fk" FOREIGN KEY ("test_run_id") REFERENCES "public"."pg-drizzle_test_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg-drizzle_test_runs" ADD CONSTRAINT "pg-drizzle_test_runs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg-drizzle_user_credits" ADD CONSTRAINT "pg-drizzle_user_credits_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg-drizzle_user_resumes" ADD CONSTRAINT "pg-drizzle_user_resumes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg-drizzle_user_resumes" ADD CONSTRAINT "pg-drizzle_user_resumes_template_id_pg-drizzle_resume_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."pg-drizzle_resume_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "anon_chat_logs_ip_created_idx" ON "pg-drizzle_anonymous_chat_logs" USING btree ("ip_address","created_at");--> statement-breakpoint
CREATE INDEX "bug_reports_test_run_id_idx" ON "pg-drizzle_bug_reports" USING btree ("test_run_id");--> statement-breakpoint
CREATE INDEX "bug_reports_severity_idx" ON "pg-drizzle_bug_reports" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "bug_reports_status_idx" ON "pg-drizzle_bug_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "user_chats_user_id_idx" ON "pg-drizzle_user_chats" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_chats_v0_chat_id_idx" ON "pg-drizzle_user_chats" USING btree ("v0_chat_id");--> statement-breakpoint
CREATE INDEX "user_chats_created_at_idx" ON "pg-drizzle_user_chats" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "user_chats_chat_type_idx" ON "pg-drizzle_user_chats" USING btree ("chat_type");--> statement-breakpoint
CREATE INDEX "user_chats_conversation_id_idx" ON "pg-drizzle_user_chats" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "conversation_messages_conversation_id_idx" ON "pg-drizzle_conversation_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "conversations_user_id_idx" ON "pg-drizzle_conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "crawl_results_test_run_id_idx" ON "pg-drizzle_crawl_results" USING btree ("test_run_id");--> statement-breakpoint
CREATE INDEX "credit_usage_logs_user_id_idx" ON "pg-drizzle_credit_usage_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "credit_usage_logs_created_at_idx" ON "pg-drizzle_credit_usage_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "demo_visits_demo_id_idx" ON "pg-drizzle_demo_visits" USING btree ("demo_id");--> statement-breakpoint
CREATE INDEX "demo_visits_owner_user_id_idx" ON "pg-drizzle_demo_visits" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "demo_visits_visited_at_idx" ON "pg-drizzle_demo_visits" USING btree ("visited_at");--> statement-breakpoint
CREATE INDEX "github_repos_user_id_idx" ON "pg-drizzle_github_repos" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "github_repos_chat_id_idx" ON "pg-drizzle_github_repos" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "github_repos_chat_id_is_active_idx" ON "pg-drizzle_github_repos" USING btree ("chat_id","is_active");--> statement-breakpoint
CREATE INDEX "payment_transactions_user_id_idx" ON "pg-drizzle_payment_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payment_transactions_razorpay_order_id_idx" ON "pg-drizzle_payment_transactions" USING btree ("razorpay_order_id");--> statement-breakpoint
CREATE INDEX "payment_transactions_razorpay_payment_id_idx" ON "pg-drizzle_payment_transactions" USING btree ("razorpay_payment_id");--> statement-breakpoint
CREATE INDEX "payment_transactions_status_idx" ON "pg-drizzle_payment_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "created_by_idx" ON "pg-drizzle_post" USING btree ("createdById");--> statement-breakpoint
CREATE INDEX "name_idx" ON "pg-drizzle_post" USING btree ("name");--> statement-breakpoint
CREATE INDEX "report_exports_test_run_id_idx" ON "pg-drizzle_report_exports" USING btree ("test_run_id");--> statement-breakpoint
CREATE INDEX "report_exports_shareable_slug_idx" ON "pg-drizzle_report_exports" USING btree ("shareable_slug");--> statement-breakpoint
CREATE INDEX "sandbox_executions_user_id_idx" ON "pg-drizzle_sandbox_executions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "persona_layouts_user_id_idx" ON "pg-drizzle_persona_layouts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "persona_layouts_slug_idx" ON "pg-drizzle_persona_layouts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "subscriptions_user_id_idx" ON "pg-drizzle_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscriptions_razorpay_subscription_id_idx" ON "pg-drizzle_subscriptions" USING btree ("razorpay_subscription_id");--> statement-breakpoint
CREATE INDEX "subscriptions_status_idx" ON "pg-drizzle_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "test_cases_test_run_id_idx" ON "pg-drizzle_test_cases" USING btree ("test_run_id");--> statement-breakpoint
CREATE INDEX "test_cases_priority_idx" ON "pg-drizzle_test_cases" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "test_cases_category_idx" ON "pg-drizzle_test_cases" USING btree ("category");--> statement-breakpoint
CREATE INDEX "test_results_test_run_id_idx" ON "pg-drizzle_test_results" USING btree ("test_run_id");--> statement-breakpoint
CREATE INDEX "test_results_test_case_id_idx" ON "pg-drizzle_test_results" USING btree ("test_case_id");--> statement-breakpoint
CREATE INDEX "test_results_status_idx" ON "pg-drizzle_test_results" USING btree ("status");--> statement-breakpoint
CREATE INDEX "test_runs_user_id_idx" ON "pg-drizzle_test_runs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "test_runs_status_idx" ON "pg-drizzle_test_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "test_runs_started_at_idx" ON "pg-drizzle_test_runs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "test_runs_project_id_idx" ON "pg-drizzle_test_runs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "user_credits_user_id_idx" ON "pg-drizzle_user_credits" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_resumes_user_id_idx" ON "pg-drizzle_user_resumes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_resumes_created_at_idx" ON "pg-drizzle_user_resumes" USING btree ("created_at");