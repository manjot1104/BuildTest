ALTER TABLE "pg-drizzle_chat_ownerships" RENAME TO "pg-drizzle_user_chats";--> statement-breakpoint
ALTER TABLE "pg-drizzle_user_chats" DROP CONSTRAINT "pg-drizzle_chat_ownerships_v0_chat_id_unique";--> statement-breakpoint
ALTER TABLE "pg-drizzle_user_chats" DROP CONSTRAINT "pg-drizzle_chat_ownerships_user_id_user_id_fk";
--> statement-breakpoint
DROP INDEX "user_id_idx";--> statement-breakpoint
DROP INDEX "v0_chat_id_idx";--> statement-breakpoint
ALTER TABLE "pg-drizzle_user_chats" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "pg-drizzle_user_chats" ADD COLUMN "prompt" text;--> statement-breakpoint
ALTER TABLE "pg-drizzle_user_chats" ADD COLUMN "demo_url" text;--> statement-breakpoint
ALTER TABLE "pg-drizzle_user_chats" ADD COLUMN "preview_url" text;--> statement-breakpoint
ALTER TABLE "pg-drizzle_user_chats" ADD COLUMN "updated_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "pg-drizzle_user_chats" ADD CONSTRAINT "pg-drizzle_user_chats_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_chats_user_id_idx" ON "pg-drizzle_user_chats" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_chats_v0_chat_id_idx" ON "pg-drizzle_user_chats" USING btree ("v0_chat_id");--> statement-breakpoint
CREATE INDEX "user_chats_created_at_idx" ON "pg-drizzle_user_chats" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "pg-drizzle_user_chats" ADD CONSTRAINT "pg-drizzle_user_chats_v0_chat_id_unique" UNIQUE("v0_chat_id");