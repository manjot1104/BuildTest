CREATE TABLE "pg-drizzle_github_repos" (
	"id" text PRIMARY KEY NOT NULL,
	"chat_id" text NOT NULL,
	"user_id" text NOT NULL,
	"github_repo_id" text NOT NULL,
	"repo_name" text NOT NULL,
	"repo_full_name" text NOT NULL,
	"repo_url" text NOT NULL,
	"branch_name" text NOT NULL,
	"visibility" text DEFAULT 'public' NOT NULL,
	"last_commit_sha" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pg-drizzle_github_repos" ADD CONSTRAINT "pg-drizzle_github_repos_chat_id_pg-drizzle_user_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."pg-drizzle_user_chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg-drizzle_github_repos" ADD CONSTRAINT "pg-drizzle_github_repos_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "github_repos_user_id_idx" ON "pg-drizzle_github_repos" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "github_repos_chat_id_idx" ON "pg-drizzle_github_repos" USING btree ("chat_id");