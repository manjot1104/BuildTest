ALTER TABLE "pg-drizzle_github_repos" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX "github_repos_chat_id_is_active_idx" ON "pg-drizzle_github_repos" USING btree ("chat_id","is_active");--> statement-breakpoint
ALTER TABLE "pg-drizzle_github_repos" DROP COLUMN "branch_name";--> statement-breakpoint
ALTER TABLE "pg-drizzle_github_repos" DROP COLUMN "last_commit_sha";--> statement-breakpoint
ALTER TABLE "pg-drizzle_github_repos" ADD CONSTRAINT "github_repos_github_repo_id_unique" UNIQUE("github_repo_id");