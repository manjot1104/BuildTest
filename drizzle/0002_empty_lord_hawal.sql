CREATE TABLE "pg-drizzle_video_chats" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text,
	"video_json" text NOT NULL,
	"current_options" jsonb,
	"current_user_images" jsonb,
	"prompts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pg-drizzle_video_chats" ADD CONSTRAINT "pg-drizzle_video_chats_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "video_chats_user_id_idx" ON "pg-drizzle_video_chats" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "video_chats_updated_at_idx" ON "pg-drizzle_video_chats" USING btree ("updated_at");