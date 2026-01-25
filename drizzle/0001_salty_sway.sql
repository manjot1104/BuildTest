CREATE TABLE "pg-drizzle_anonymous_chat_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"ip_address" varchar(45) NOT NULL,
	"v0_chat_id" varchar(255) NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pg-drizzle_chat_ownerships" (
	"id" text PRIMARY KEY NOT NULL,
	"v0_chat_id" varchar(255) NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "pg-drizzle_chat_ownerships_v0_chat_id_unique" UNIQUE("v0_chat_id")
);
--> statement-breakpoint
ALTER TABLE "pg-drizzle_chat_ownerships" ADD CONSTRAINT "pg-drizzle_chat_ownerships_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_id_idx" ON "pg-drizzle_chat_ownerships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "v0_chat_id_idx" ON "pg-drizzle_chat_ownerships" USING btree ("v0_chat_id");