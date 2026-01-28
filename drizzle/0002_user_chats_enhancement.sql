-- Migration: Enhance chat_ownerships to user_chats
-- This migration adds new columns to store chat metadata locally for efficient history retrieval

-- Add new columns to chat_ownerships table
ALTER TABLE "pg-drizzle_chat_ownerships" ADD COLUMN "title" text;
--> statement-breakpoint
ALTER TABLE "pg-drizzle_chat_ownerships" ADD COLUMN "prompt" text;
--> statement-breakpoint
ALTER TABLE "pg-drizzle_chat_ownerships" ADD COLUMN "demo_url" text;
--> statement-breakpoint
ALTER TABLE "pg-drizzle_chat_ownerships" ADD COLUMN "preview_url" text;
--> statement-breakpoint
ALTER TABLE "pg-drizzle_chat_ownerships" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint

-- Rename table from chat_ownerships to user_chats
ALTER TABLE "pg-drizzle_chat_ownerships" RENAME TO "pg-drizzle_user_chats";
--> statement-breakpoint

-- Rename constraint
ALTER TABLE "pg-drizzle_user_chats" RENAME CONSTRAINT "pg-drizzle_chat_ownerships_v0_chat_id_unique" TO "pg-drizzle_user_chats_v0_chat_id_unique";
--> statement-breakpoint

-- Rename foreign key constraint
ALTER TABLE "pg-drizzle_user_chats" RENAME CONSTRAINT "pg-drizzle_chat_ownerships_user_id_user_id_fk" TO "pg-drizzle_user_chats_user_id_user_id_fk";
--> statement-breakpoint

-- Drop old indexes
DROP INDEX IF EXISTS "user_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "v0_chat_id_idx";
--> statement-breakpoint

-- Create new indexes with updated names
CREATE INDEX "user_chats_user_id_idx" ON "pg-drizzle_user_chats" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "user_chats_v0_chat_id_idx" ON "pg-drizzle_user_chats" USING btree ("v0_chat_id");
--> statement-breakpoint
CREATE INDEX "user_chats_created_at_idx" ON "pg-drizzle_user_chats" USING btree ("created_at");
--> statement-breakpoint

-- Backfill updated_at with created_at for existing records
UPDATE "pg-drizzle_user_chats" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;
