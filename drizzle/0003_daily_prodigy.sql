DO $$
BEGIN
  -- This migration historically handled a rename from chat_ownerships -> user_chats.
  -- Make it safe to re-run / run on fresh DBs.
  IF to_regclass('public."pg-drizzle_chat_ownerships"') IS NOT NULL
     AND to_regclass('public."pg-drizzle_user_chats"') IS NULL THEN
    ALTER TABLE "pg-drizzle_chat_ownerships" RENAME TO "pg-drizzle_user_chats";
  END IF;
END $$;
--> statement-breakpoint

-- Drop old constraints/indexes if they exist
ALTER TABLE "pg-drizzle_user_chats" DROP CONSTRAINT IF EXISTS "pg-drizzle_chat_ownerships_v0_chat_id_unique";--> statement-breakpoint
ALTER TABLE "pg-drizzle_user_chats" DROP CONSTRAINT IF EXISTS "pg-drizzle_chat_ownerships_user_id_user_id_fk";--> statement-breakpoint
DROP INDEX IF EXISTS "user_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "v0_chat_id_idx";--> statement-breakpoint

-- Ensure columns exist (idempotent)
ALTER TABLE "pg-drizzle_user_chats" ADD COLUMN IF NOT EXISTS "title" text;--> statement-breakpoint
ALTER TABLE "pg-drizzle_user_chats" ADD COLUMN IF NOT EXISTS "prompt" text;--> statement-breakpoint
ALTER TABLE "pg-drizzle_user_chats" ADD COLUMN IF NOT EXISTS "demo_url" text;--> statement-breakpoint
ALTER TABLE "pg-drizzle_user_chats" ADD COLUMN IF NOT EXISTS "preview_url" text;--> statement-breakpoint
ALTER TABLE "pg-drizzle_user_chats" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint

-- Ensure FK/unique/indexes exist (idempotent)
ALTER TABLE "pg-drizzle_user_chats" DROP CONSTRAINT IF EXISTS "pg-drizzle_user_chats_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "pg-drizzle_user_chats" ADD CONSTRAINT "pg-drizzle_user_chats_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_chats_user_id_idx" ON "pg-drizzle_user_chats" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_chats_v0_chat_id_idx" ON "pg-drizzle_user_chats" USING btree ("v0_chat_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_chats_created_at_idx" ON "pg-drizzle_user_chats" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "pg-drizzle_user_chats" DROP CONSTRAINT IF EXISTS "pg-drizzle_user_chats_v0_chat_id_unique";--> statement-breakpoint
ALTER TABLE "pg-drizzle_user_chats" ADD CONSTRAINT "pg-drizzle_user_chats_v0_chat_id_unique" UNIQUE("v0_chat_id");