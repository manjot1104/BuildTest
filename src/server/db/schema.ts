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

export const userRoleEnum = pgEnum("user_role", [
  "user",
  "admin",
  "manager",
  "team_member",
]);


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
  roles: userRoleEnum("roles").array().default(["user"]).notNull(),
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
  githubRepos: many(github_repos),
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
    is_starred: d.boolean("is_starred").default(false).notNull()
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
export const anonymous_chat_logs = createTable(
  "anonymous_chat_logs",
  (d) => ({
    id: d.text("id").primaryKey(),
    ip_address: d.varchar("ip_address", { length: 45 }).notNull(), // IPv6 can be up to 45 chars
    v0_chat_id: d.varchar("v0_chat_id", { length: 255 }).notNull(),
    created_at: d
      .timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("anon_chat_logs_ip_created_idx").on(t.ip_address, t.created_at),
  ],
);

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

export const demoTypeEnum = pgEnum("demo_type", [
  "featured",
  "community",
]);

export const demo_visits = createTable(
  "demo_visits",
  (d) => ({
    id: d.text("id").primaryKey(),

    demo_id: d.varchar("demo_id", { length: 255 }).notNull(),

    demo_type: demoTypeEnum("demo_type").notNull(),

    owner_user_id: d
      .text("owner_user_id")
      .references(() => user.id, { onDelete: "cascade" }),

    visitor_user_id: d
      .text("visitor_user_id")
      .references(() => user.id, { onDelete: "set null" }),

    visited_at: d
      .timestamp("visited_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("demo_visits_demo_id_idx").on(t.demo_id),
    index("demo_visits_owner_user_id_idx").on(t.owner_user_id),
    index("demo_visits_visited_at_idx").on(t.visited_at),
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

// Sandbox execution status enum
export const sandboxExecutionStatusEnum = pgEnum("sandbox_execution_status", [
  "pending",
  "running",
  "completed",
  "failed",
  "timeout",
]);

// Sandbox Executions - logs every sandbox code execution for monitoring/auditing
export const sandbox_executions = createTable(
  "sandbox_executions",
  (d) => ({
    id: d.text("id").primaryKey(),
    user_id: d
      .text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    language: d.varchar("language", { length: 50 }).notNull(),
    code: d.text("code").notNull(),
    status: sandboxExecutionStatusEnum("status").notNull().default("pending"),
    output: d.text("output"),
    error: d.text("error"),
    exit_code: d.integer("exit_code"),
    execution_time_ms: d.integer("execution_time_ms"),
    created_at: d
      .timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    completed_at: d.timestamp("completed_at", { withTimezone: true }),
  }),
  (t) => [
    index("sandbox_executions_user_id_idx").on(t.user_id),
    index("sandbox_executions_status_idx").on(t.status),
    index("sandbox_executions_created_at_idx").on(t.created_at),
  ],
);

export const sandboxExecutionsRelations = relations(sandbox_executions, ({ one }) => ({
  user: one(user, { fields: [sandbox_executions.user_id], references: [user.id] }),
}));

// GitHub Repos
// - One row per GitHub repo (github_repo_id is globally unique)
// - A chat can have multiple repo rows over time, but only one has is_active = true
// - When user links a new repo to a chat, old row is set to is_active = false
// - All pushes target the active repo for the chat
export const github_repos = createTable(
  "github_repos",
  (d) => ({
    id: d.text("id").primaryKey(),
    chat_id: d
      .text("chat_id")
      .notNull()
      .references(() => user_chats.id, { onDelete: "cascade" }),
    user_id: d
      .text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // GitHub's own repo ID — enforces one chat per repo globally
    github_repo_id: d.text("github_repo_id").notNull(),
    repo_name: d.text("repo_name").notNull(),
    repo_full_name: d.text("repo_full_name").notNull(),
    repo_url: d.text("repo_url").notNull(),
    // Kept for future: allow changing visibility from the app
    visibility: d
      .text("visibility", { enum: ["public", "private"] })
      .notNull()
      .default("public"),
    // Only one repo per chat can be active at a time.
    // Deactivated repos are kept for history but never pushed to.
    is_active: d.boolean("is_active").notNull().default(true),
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
    // A GitHub repo can only ever belong to one chat
    unique("github_repos_github_repo_id_unique").on(t.github_repo_id),
    index("github_repos_user_id_idx").on(t.user_id),
    index("github_repos_chat_id_idx").on(t.chat_id),
    // Composite index for the most common query: active repo for a given chat
    index("github_repos_chat_id_is_active_idx").on(t.chat_id, t.is_active),
  ],
);

export const githubReposRelations = relations(github_repos, ({ one }) => ({
  user: one(user, { fields: [github_repos.user_id], references: [user.id] }),
  chat: one(user_chats, { fields: [github_repos.chat_id], references: [user_chats.id] }),
}))

// Studio Layouts — stores published pages built in Buildify Studio
export const studio_layouts = createTable(
  "persona_layouts", // DB table name — do not rename without migration
  (d) => ({
    id: d.text("id").primaryKey(),
    user_id: d
      .text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    slug: d.text("slug").unique(), // null for drafts, set at publish time
    title: d.text("title").notNull().default("Untitled"),
    layout: d.text("layout").notNull().default("[]"), // JSON string of CanvasElement[]
    background: d.text("background"), // nullable JSON string of CanvasBackground
    is_published: d.boolean("is_published").notNull().default(false),
    published_at: d.timestamp("published_at", { withTimezone: true }),
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
    index("persona_layouts_user_id_idx").on(t.user_id),
    index("persona_layouts_slug_idx").on(t.slug),
  ],
)

export const studioLayoutsRelations = relations(studio_layouts, ({ one }) => ({
  user: one(user, { fields: [studio_layouts.user_id], references: [user.id] }),
}));
