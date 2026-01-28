CREATE TYPE "public"."payment_status" AS ENUM('pending', 'completed', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'cancelled', 'expired', 'pending');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('subscription', 'credit_pack', 'refund');--> statement-breakpoint
CREATE TABLE "pg-drizzle_credit_usage_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"credits_used" integer NOT NULL,
	"action" varchar(50) NOT NULL,
	"chat_id" varchar(255),
	"subscription_credits_remaining" integer NOT NULL,
	"additional_credits_remaining" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pg-drizzle_payment_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"razorpay_order_id" varchar(255),
	"razorpay_payment_id" varchar(255),
	"razorpay_signature" varchar(512),
	"type" "transaction_type" NOT NULL,
	"amount" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"credits_added" integer DEFAULT 0 NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"subscription_id" text,
	"credit_pack_id" varchar(50),
	"metadata" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pg-drizzle_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"razorpay_subscription_id" varchar(255),
	"razorpay_plan_id" varchar(255),
	"plan_id" varchar(50) NOT NULL,
	"plan_name" varchar(100) NOT NULL,
	"plan_price" integer NOT NULL,
	"credits_per_month" integer NOT NULL,
	"status" "subscription_status" DEFAULT 'pending' NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"cancelled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "pg-drizzle_user_credits" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"subscription_credits" integer DEFAULT 0 NOT NULL,
	"additional_credits" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "pg-drizzle_user_credits_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "pg-drizzle_credit_usage_logs" ADD CONSTRAINT "pg-drizzle_credit_usage_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg-drizzle_payment_transactions" ADD CONSTRAINT "pg-drizzle_payment_transactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg-drizzle_payment_transactions" ADD CONSTRAINT "pg-drizzle_payment_transactions_subscription_id_pg-drizzle_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."pg-drizzle_subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg-drizzle_subscriptions" ADD CONSTRAINT "pg-drizzle_subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg-drizzle_user_credits" ADD CONSTRAINT "pg-drizzle_user_credits_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credit_usage_logs_user_id_idx" ON "pg-drizzle_credit_usage_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "credit_usage_logs_created_at_idx" ON "pg-drizzle_credit_usage_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "payment_transactions_user_id_idx" ON "pg-drizzle_payment_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payment_transactions_razorpay_order_id_idx" ON "pg-drizzle_payment_transactions" USING btree ("razorpay_order_id");--> statement-breakpoint
CREATE INDEX "payment_transactions_razorpay_payment_id_idx" ON "pg-drizzle_payment_transactions" USING btree ("razorpay_payment_id");--> statement-breakpoint
CREATE INDEX "payment_transactions_status_idx" ON "pg-drizzle_payment_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subscriptions_user_id_idx" ON "pg-drizzle_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscriptions_razorpay_subscription_id_idx" ON "pg-drizzle_subscriptions" USING btree ("razorpay_subscription_id");--> statement-breakpoint
CREATE INDEX "subscriptions_status_idx" ON "pg-drizzle_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "user_credits_user_id_idx" ON "pg-drizzle_user_credits" USING btree ("user_id");