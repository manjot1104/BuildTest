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
ALTER TABLE "pg-drizzle_user_resumes" ADD CONSTRAINT "pg-drizzle_user_resumes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg-drizzle_user_resumes" ADD CONSTRAINT "pg-drizzle_user_resumes_template_id_pg-drizzle_resume_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."pg-drizzle_resume_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_resumes_user_id_idx" ON "pg-drizzle_user_resumes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_resumes_created_at_idx" ON "pg-drizzle_user_resumes" USING btree ("created_at");