import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  pgTableCreator,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

// Enums
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "cancelled",
  "expired",
  "pending",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "completed",
  "failed",
  "refunded",
]);

export const transactionTypeEnum = pgEnum("transaction_type", [
  "subscription",
  "credit_pack",
  "refund",
]);

export const createTable = pgTableCreator((name) => `pg-drizzle_${name}`);

export const posts = createTable(
  "post",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    name: d.varchar({ length: 256 }),
    createdById: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => user.id),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("created_by_idx").on(t.createdById),
    index("name_idx").on(t.name),
  ],
);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
  updatedAt: timestamp("updated_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
});

export const userRelations = relations(user, ({ many, one }) => ({
  account: many(account),
  session: many(session),
  credits: one(user_credits),
  subscriptions: many(subscriptions),
  paymentTransactions: many(payment_transactions),
  creditUsageLogs: many(credit_usage_logs),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

// User chats - stores chat data locally for efficient history retrieval
// Maps V0 chat IDs to user IDs and stores chat metadata
export const user_chats = createTable(
  "user_chats",
  (d) => ({
    id: d.text("id").primaryKey(),
    v0_chat_id: d.varchar("v0_chat_id", { length: 255 }).notNull(),
    user_id: d
      .text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Chat metadata
    title: d.text("title"), // Generated title or first prompt summary
    prompt: d.text("prompt"), // First user message/prompt
    // V0 response data
    demo_url: d.text("demo_url"), // URL to the demo preview
    preview_url: d.text("preview_url"), // URL to preview image
    // Timestamps
    created_at: d
      .timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updated_at: d
      .timestamp("updated_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [
    unique().on(t.v0_chat_id), // Ensure each v0 chat can only be owned by one user
    index("user_chats_user_id_idx").on(t.user_id),
    index("user_chats_v0_chat_id_idx").on(t.v0_chat_id),
    index("user_chats_created_at_idx").on(t.created_at),
  ],
);

// Legacy alias for backward compatibility during migration
export const chat_ownerships = user_chats;

// Track anonymous chat creation by IP for rate limiting
export const anonymous_chat_logs = createTable("anonymous_chat_logs", (d) => ({
  id: d.text("id").primaryKey(),
  ip_address: d.varchar("ip_address", { length: 45 }).notNull(), // IPv6 can be up to 45 chars
  v0_chat_id: d.varchar("v0_chat_id", { length: 255 }).notNull(),
  created_at: d
    .timestamp("created_at", { withTimezone: true })
    .$defaultFn(() => new Date())
    .notNull(),
}));

// User Credits - tracks both subscription and additional credits
export const user_credits = createTable(
  "user_credits",
  (d) => ({
    id: d.text("id").primaryKey(),
    user_id: d
      .text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" })
      .unique(), // One credit record per user
    // Monthly subscription credits (expire with subscription)
    subscription_credits: d.integer("subscription_credits").notNull().default(0),
    // Additional purchased credits (never expire)
    additional_credits: d.integer("additional_credits").notNull().default(0),
    // Timestamps
    created_at: d
      .timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updated_at: d
      .timestamp("updated_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [index("user_credits_user_id_idx").on(t.user_id)],
);

// Subscriptions - tracks user subscription status
export const subscriptions = createTable(
  "subscriptions",
  (d) => ({
    id: d.text("id").primaryKey(),
    user_id: d
      .text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Razorpay subscription details
    razorpay_subscription_id: d.varchar("razorpay_subscription_id", { length: 255 }),
    razorpay_plan_id: d.varchar("razorpay_plan_id", { length: 255 }),
    // Plan details
    plan_id: d.varchar("plan_id", { length: 50 }).notNull(), // starter, pro, enterprise
    plan_name: d.varchar("plan_name", { length: 100 }).notNull(),
    plan_price: d.integer("plan_price").notNull(), // Price in paise/cents
    credits_per_month: d.integer("credits_per_month").notNull(),
    // Status
    status: subscriptionStatusEnum("status").notNull().default("pending"),
    // Billing cycle
    current_period_start: d.timestamp("current_period_start", { withTimezone: true }),
    current_period_end: d.timestamp("current_period_end", { withTimezone: true }),
    // Timestamps
    created_at: d
      .timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updated_at: d
      .timestamp("updated_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    cancelled_at: d.timestamp("cancelled_at", { withTimezone: true }),
  }),
  (t) => [
    index("subscriptions_user_id_idx").on(t.user_id),
    index("subscriptions_razorpay_subscription_id_idx").on(t.razorpay_subscription_id),
    index("subscriptions_status_idx").on(t.status),
  ],
);

// Payment Transactions - tracks all payments
export const payment_transactions = createTable(
  "payment_transactions",
  (d) => ({
    id: d.text("id").primaryKey(),
    user_id: d
      .text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Razorpay details
    razorpay_order_id: d.varchar("razorpay_order_id", { length: 255 }),
    razorpay_payment_id: d.varchar("razorpay_payment_id", { length: 255 }),
    razorpay_signature: d.varchar("razorpay_signature", { length: 512 }),
    // Transaction details
    type: transactionTypeEnum("type").notNull(),
    amount: d.integer("amount").notNull(), // Amount in paise
    currency: d.varchar("currency", { length: 3 }).notNull().default("INR"),
    credits_added: d.integer("credits_added").notNull().default(0),
    // Status
    status: paymentStatusEnum("status").notNull().default("pending"),
    // Reference to subscription or credit pack
    subscription_id: d.text("subscription_id").references(() => subscriptions.id),
    credit_pack_id: d.varchar("credit_pack_id", { length: 50 }), // pack_100, pack_200, etc.
    // Metadata
    metadata: d.text("metadata"), // JSON string for additional data
    // Timestamps
    created_at: d
      .timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updated_at: d
      .timestamp("updated_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("payment_transactions_user_id_idx").on(t.user_id),
    index("payment_transactions_razorpay_order_id_idx").on(t.razorpay_order_id),
    index("payment_transactions_razorpay_payment_id_idx").on(t.razorpay_payment_id),
    index("payment_transactions_status_idx").on(t.status),
  ],
);

// Credit Usage Logs - tracks credit deductions
export const credit_usage_logs = createTable(
  "credit_usage_logs",
  (d) => ({
    id: d.text("id").primaryKey(),
    user_id: d
      .text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Usage details
    credits_used: d.integer("credits_used").notNull(),
    action: d.varchar("action", { length: 50 }).notNull(), // new_prompt, follow_up_prompt
    // Related chat
    chat_id: d.varchar("chat_id", { length: 255 }),
    // Balance after deduction
    subscription_credits_remaining: d.integer("subscription_credits_remaining").notNull(),
    additional_credits_remaining: d.integer("additional_credits_remaining").notNull(),
    // Timestamp
    created_at: d
      .timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("credit_usage_logs_user_id_idx").on(t.user_id),
    index("credit_usage_logs_created_at_idx").on(t.created_at),
  ],
);

// Relations for new tables
export const userCreditsRelations = relations(user_credits, ({ one }) => ({
  user: one(user, { fields: [user_credits.user_id], references: [user.id] }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  user: one(user, { fields: [subscriptions.user_id], references: [user.id] }),
  transactions: many(payment_transactions),
}));

export const paymentTransactionsRelations = relations(payment_transactions, ({ one }) => ({
  user: one(user, { fields: [payment_transactions.user_id], references: [user.id] }),
  subscription: one(subscriptions, {
    fields: [payment_transactions.subscription_id],
    references: [subscriptions.id],
  }),
}));

export const creditUsageLogsRelations = relations(credit_usage_logs, ({ one }) => ({
  user: one(user, { fields: [credit_usage_logs.user_id], references: [user.id] }),
}));
