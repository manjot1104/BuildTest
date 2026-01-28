-- Migration: Enhance chat_ownerships to user_chats
-- This migration adds new columns to store chat metadata locally for efficient history retrieval

DO $$
BEGIN
  -- If this is an older DB, the table may still be named pg-drizzle_chat_ownerships.
  IF to_regclass('public."pg-drizzle_chat_ownerships"') IS NOT NULL THEN
    -- Add new columns to chat_ownerships table (idempotent)
    ALTER TABLE "pg-drizzle_chat_ownerships" ADD COLUMN IF NOT EXISTS "title" text;
    ALTER TABLE "pg-drizzle_chat_ownerships" ADD COLUMN IF NOT EXISTS "prompt" text;
    ALTER TABLE "pg-drizzle_chat_ownerships" ADD COLUMN IF NOT EXISTS "demo_url" text;
    ALTER TABLE "pg-drizzle_chat_ownerships" ADD COLUMN IF NOT EXISTS "preview_url" text;
    ALTER TABLE "pg-drizzle_chat_ownerships" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

    -- Rename table from chat_ownerships to user_chats
    ALTER TABLE "pg-drizzle_chat_ownerships" RENAME TO "pg-drizzle_user_chats";

    -- Rename constraint (only if old name exists)
    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'pg-drizzle_chat_ownerships_v0_chat_id_unique'
    ) THEN
      ALTER TABLE "pg-drizzle_user_chats"
        RENAME CONSTRAINT "pg-drizzle_chat_ownerships_v0_chat_id_unique"
        TO "pg-drizzle_user_chats_v0_chat_id_unique";
    END IF;

    -- Rename foreign key constraint (only if old name exists)
    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'pg-drizzle_chat_ownerships_user_id_user_id_fk'
    ) THEN
      ALTER TABLE "pg-drizzle_user_chats"
        RENAME CONSTRAINT "pg-drizzle_chat_ownerships_user_id_user_id_fk"
        TO "pg-drizzle_user_chats_user_id_user_id_fk";
    END IF;

    -- Drop old indexes
    DROP INDEX IF EXISTS "user_id_idx";
    DROP INDEX IF EXISTS "v0_chat_id_idx";
  ELSE
    -- Fresh DB path: create the new table directly.
    CREATE TABLE IF NOT EXISTS "pg-drizzle_user_chats" (
      "id" text PRIMARY KEY NOT NULL,
      "v0_chat_id" varchar(255) NOT NULL,
      "user_id" text NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "title" text,
      "prompt" text,
      "demo_url" text,
      "preview_url" text,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "pg-drizzle_user_chats_v0_chat_id_unique" UNIQUE("v0_chat_id")
    );
    ALTER TABLE "pg-drizzle_user_chats"
      ADD CONSTRAINT "pg-drizzle_user_chats_user_id_user_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint

-- Create new indexes with updated names (idempotent)
CREATE INDEX IF NOT EXISTS "user_chats_user_id_idx" ON "pg-drizzle_user_chats" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_chats_v0_chat_id_idx" ON "pg-drizzle_user_chats" USING btree ("v0_chat_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_chats_created_at_idx" ON "pg-drizzle_user_chats" USING btree ("created_at");
--> statement-breakpoint

-- Backfill updated_at with created_at for existing records (safe)
UPDATE "pg-drizzle_user_chats" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;
