/**
 * One-time script: create all missing tables and columns that db:push can't handle.
 * Safe to run multiple times (idempotent).
 */
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");

  const sql = postgres(url, { max: 1 });

  try {
    // Helper: check if a table exists
    async function tableExists(name: string) {
      const [{ exists }] = await sql<[{ exists: string | null }]>`
        SELECT to_regclass('public."${sql(name)}"') AS exists
      `;
      return !!exists;
    }

    // Helper: check if a column exists
    async function columnExists(table: string, column: string) {
      const rows = await sql`
        SELECT 1 FROM information_schema.columns
        WHERE table_name = ${table} AND column_name = ${column}
      `;
      return rows.length > 0;
    }

    // Helper: check if an enum type exists
    async function enumExists(name: string) {
      const rows = await sql`
        SELECT 1 FROM pg_type WHERE typname = ${name}
      `;
      return rows.length > 0;
    }

    // 1. Create enums if missing
    if (!(await enumExists("chat_type"))) {
      console.log("Creating chat_type enum...");
      await sql`CREATE TYPE "public"."chat_type" AS ENUM('BUILDER', 'OPENROUTER')`;
    }

    if (!(await enumExists("message_role"))) {
      console.log("Creating message_role enum...");
      await sql`CREATE TYPE "public"."message_role" AS ENUM('USER', 'ASSISTANT', 'SYSTEM')`;
    }

    if (!(await enumExists("demo_type"))) {
      console.log("Creating demo_type enum...");
      await sql`CREATE TYPE "public"."demo_type" AS ENUM('featured', 'community')`;
    }

    // 2. Create conversations table
    if (!(await tableExists("pg-drizzle_conversations"))) {
      console.log("Creating pg-drizzle_conversations...");
      await sql`
        CREATE TABLE "pg-drizzle_conversations" (
          "id"         text PRIMARY KEY NOT NULL,
          "user_id"    text NOT NULL REFERENCES "public"."user"("id") ON DELETE CASCADE,
          "model_name" text,
          "title"      text,
          "created_at" timestamp with time zone NOT NULL DEFAULT now(),
          "updated_at" timestamp with time zone NOT NULL DEFAULT now()
        )
      `;
      await sql`CREATE INDEX "conversations_user_id_idx" ON "pg-drizzle_conversations" ("user_id")`;
      console.log("  -> created.");
    }

    // 3. Create conversation_messages table
    if (!(await tableExists("pg-drizzle_conversation_messages"))) {
      console.log("Creating pg-drizzle_conversation_messages...");
      await sql`
        CREATE TABLE "pg-drizzle_conversation_messages" (
          "id"              text PRIMARY KEY NOT NULL,
          "conversation_id" text NOT NULL REFERENCES "pg-drizzle_conversations"("id") ON DELETE CASCADE,
          "role"            "message_role" NOT NULL,
          "content"         text NOT NULL,
          "created_at"      timestamp with time zone NOT NULL DEFAULT now()
        )
      `;
      await sql`CREATE INDEX "conversation_messages_conversation_id_idx" ON "pg-drizzle_conversation_messages" ("conversation_id")`;
      console.log("  -> created.");
    }

    // 4. Add missing columns to user_chats
    if (await tableExists("pg-drizzle_user_chats")) {
      if (!(await columnExists("pg-drizzle_user_chats", "chat_type"))) {
        console.log("Adding chat_type column to user_chats...");
        await sql`ALTER TABLE "pg-drizzle_user_chats" ADD COLUMN "chat_type" "chat_type" NOT NULL DEFAULT 'BUILDER'`;
        await sql`CREATE INDEX "user_chats_chat_type_idx" ON "pg-drizzle_user_chats" ("chat_type")`;
      }

      if (!(await columnExists("pg-drizzle_user_chats", "model_name"))) {
        console.log("Adding model_name column to user_chats...");
        await sql`ALTER TABLE "pg-drizzle_user_chats" ADD COLUMN "model_name" text`;
      }

      if (!(await columnExists("pg-drizzle_user_chats", "prompt_metadata"))) {
        console.log("Adding prompt_metadata column to user_chats...");
        await sql`ALTER TABLE "pg-drizzle_user_chats" ADD COLUMN "prompt_metadata" jsonb`;
      }

      if (!(await columnExists("pg-drizzle_user_chats", "conversation_id"))) {
        console.log("Adding conversation_id column to user_chats...");
        await sql`
          ALTER TABLE "pg-drizzle_user_chats"
            ADD COLUMN "conversation_id" text
            REFERENCES "pg-drizzle_conversations"("id") ON DELETE SET NULL
        `;
        await sql`CREATE INDEX "user_chats_conversation_id_idx" ON "pg-drizzle_user_chats" ("conversation_id")`;
      }
    }

    // 5. Create demo_visits table
    if (!(await tableExists("pg-drizzle_demo_visits"))) {
      console.log("Creating pg-drizzle_demo_visits...");
      await sql`
        CREATE TABLE "pg-drizzle_demo_visits" (
          "id"             text PRIMARY KEY NOT NULL,
          "demo_id"        varchar(255) NOT NULL,
          "demo_type"      "demo_type" NOT NULL,
          "owner_user_id"  text REFERENCES "public"."user"("id") ON DELETE CASCADE,
          "visitor_user_id" text REFERENCES "public"."user"("id") ON DELETE SET NULL,
          "visited_at"     timestamp with time zone NOT NULL DEFAULT now()
        )
      `;
      await sql`CREATE INDEX "demo_visits_demo_id_idx" ON "pg-drizzle_demo_visits" ("demo_id")`;
      await sql`CREATE INDEX "demo_visits_owner_user_id_idx" ON "pg-drizzle_demo_visits" ("owner_user_id")`;
      await sql`CREATE INDEX "demo_visits_visited_at_idx" ON "pg-drizzle_demo_visits" ("visited_at")`;
      console.log("  -> created.");
    }

    // 6. Create resume_templates table
    if (!(await tableExists("pg-drizzle_resume_templates"))) {
      console.log("Creating pg-drizzle_resume_templates...");
      await sql`
        CREATE TABLE "pg-drizzle_resume_templates" (
          "id"             text PRIMARY KEY NOT NULL,
          "name"           varchar(255) NOT NULL,
          "description"    text,
          "latex_template" text NOT NULL,
          "is_default"     boolean NOT NULL DEFAULT false,
          "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
          "updated_at"     timestamp with time zone NOT NULL DEFAULT now()
        )
      `;
      console.log("  -> created.");
    }

    // 7. Create user_resumes table
    if (!(await tableExists("pg-drizzle_user_resumes"))) {
      console.log("Creating pg-drizzle_user_resumes...");
      await sql`
        CREATE TABLE "pg-drizzle_user_resumes" (
          "id"            text PRIMARY KEY NOT NULL,
          "user_id"       text NOT NULL REFERENCES "public"."user"("id") ON DELETE CASCADE,
          "template_id"   text REFERENCES "pg-drizzle_resume_templates"("id"),
          "resume_data"   text NOT NULL,
          "latex_content" text,
          "pdf_url"       text,
          "title"         varchar(255),
          "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
          "updated_at"    timestamp with time zone NOT NULL DEFAULT now()
        )
      `;
      await sql`CREATE INDEX "user_resumes_user_id_idx" ON "pg-drizzle_user_resumes" ("user_id")`;
      await sql`CREATE INDEX "user_resumes_created_at_idx" ON "pg-drizzle_user_resumes" ("created_at")`;
      console.log("  -> created.");
    }

    // 8. Create github_repos table
    if (!(await tableExists("pg-drizzle_github_repos"))) {
      console.log("Creating pg-drizzle_github_repos...");
      await sql`
        CREATE TABLE "pg-drizzle_github_repos" (
          "id"             text PRIMARY KEY NOT NULL,
          "chat_id"        text NOT NULL REFERENCES "pg-drizzle_user_chats"("id") ON DELETE CASCADE,
          "user_id"        text NOT NULL REFERENCES "public"."user"("id") ON DELETE CASCADE,
          "github_repo_id" text NOT NULL,
          "repo_name"      text NOT NULL,
          "repo_full_name" text NOT NULL,
          "repo_url"       text NOT NULL,
          "visibility"     text NOT NULL DEFAULT 'public',
          "is_active"      boolean NOT NULL DEFAULT true,
          "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
          "updated_at"     timestamp with time zone NOT NULL DEFAULT now(),
          CONSTRAINT "github_repos_github_repo_id_unique" UNIQUE ("github_repo_id")
        )
      `;
      await sql`CREATE INDEX "github_repos_user_id_idx" ON "pg-drizzle_github_repos" ("user_id")`;
      await sql`CREATE INDEX "github_repos_chat_id_idx" ON "pg-drizzle_github_repos" ("chat_id")`;
      await sql`CREATE INDEX "github_repos_chat_id_is_active_idx" ON "pg-drizzle_github_repos" ("chat_id", "is_active")`;
      console.log("  -> created.");
    }

    // 9. Create sandbox_executions table
    if (!(await tableExists("pg-drizzle_sandbox_executions"))) {
      console.log("Creating pg-drizzle_sandbox_executions...");
      await sql`
        CREATE TABLE "pg-drizzle_sandbox_executions" (
          "id"                text PRIMARY KEY NOT NULL,
          "user_id"           text NOT NULL,
          "language"          text NOT NULL,
          "code"              text NOT NULL,
          "status"            text NOT NULL DEFAULT 'running',
          "output"            text,
          "error"             text,
          "exit_code"         integer,
          "execution_time_ms" integer,
          "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
          "completed_at"      timestamp with time zone
        )
      `;
      await sql`CREATE INDEX "sandbox_executions_user_id_idx" ON "pg-drizzle_sandbox_executions" ("user_id")`;
      console.log("  -> created.");
    }

    console.log("\nAll schema updates applied successfully.");
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
