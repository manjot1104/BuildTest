import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  pgTableCreator,
  real,
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
  accessibilityTestRuns: many(accessibility_test_runs),
  testRuns: many(test_runs),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));
export const chatTypeEnum = pgEnum("chat_type", ["BUILDER", "OPENROUTER"]);

export const messageRoleEnum = pgEnum("message_role", [
  "USER",
  "ASSISTANT",
  "SYSTEM",
]);

export const conversations = createTable(
  "conversations",
  (d) => ({
    id: d.text("id").primaryKey(),

    user_id: d
      .text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    model_name: d.text("model_name"),

    created_at: d
      .timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),

    updated_at: d
      .timestamp("updated_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    title: text("title"),
  }),
  (t) => [index("conversations_user_id_idx").on(t.user_id)],
);

export const conversation_messages = createTable(
  "conversation_messages",
  (d) => ({
    id: d.text("id").primaryKey(),

    conversation_id: d
      .text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),

    role: messageRoleEnum("role").notNull(),

    content: d.text("content").notNull(),

    created_at: d
      .timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("conversation_messages_conversation_id_idx").on(t.conversation_id),
  ],
);

// ─── Chat Folders ────────────────────────────────────────────────────────────

export const chat_folders = createTable(
  "chat_folders",
  (d) => ({
    id: d.text("id").primaryKey(),
    user_id: d
      .text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: d.varchar("name", { length: 100 }).notNull(),
    color: d.varchar("color", { length: 7 }), // hex color e.g. "#3B82F6"
    position: d.integer("position").notNull().default(0),
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
    index("chat_folders_user_id_idx").on(t.user_id),
    unique("chat_folders_user_name_uniq").on(t.user_id, t.name),
  ],
);

export const chatFoldersRelations = relations(chat_folders, ({ one }) => ({
  user: one(user, { fields: [chat_folders.user_id], references: [user.id] }),
}));

// User chats - stores chat data locally for efficient history retrieval
// Maps V0 chat IDs to user IDs and stores chat metadata
export const user_chats = createTable(
  "user_chats",
  (d) => ({
    id: d.text("id").primaryKey(),
    v0_chat_id: d.varchar("v0_chat_id", { length: 255 }),
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
    demo_html: d.text("demo_html"),
    // Timestamps
    created_at: d
      .timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updated_at: d
      .timestamp("updated_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    is_starred: d.boolean("is_starred").default(false).notNull(),
    chat_type: chatTypeEnum("chat_type").notNull().default("BUILDER"),

    model_name: d.text("model_name"),

    prompt_metadata: d.jsonb("prompt_metadata"), // store JSON string

conversation_id: d
  .text("conversation_id")
  .references(() => conversations.id, { onDelete: "set null" }),

folder_id: d
  .text("folder_id")
  .references(() => chat_folders.id, { onDelete: "set null" }),
  }),
  (t) => [
    unique().on(t.v0_chat_id), // Ensure each v0 chat can only be owned by one user
    index("user_chats_user_id_idx").on(t.user_id),
    index("user_chats_v0_chat_id_idx").on(t.v0_chat_id),
    index("user_chats_created_at_idx").on(t.created_at),
    index("user_chats_chat_type_idx").on(t.chat_type),
index("user_chats_conversation_id_idx").on(t.conversation_id),
index("user_chats_folder_id_idx").on(t.folder_id),
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
    subscription_credits: d
      .integer("subscription_credits")
      .notNull()
      .default(0),
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
    razorpay_subscription_id: d.varchar("razorpay_subscription_id", {
      length: 255,
    }),
    razorpay_plan_id: d.varchar("razorpay_plan_id", { length: 255 }),
    // Plan details
    plan_id: d.varchar("plan_id", { length: 50 }).notNull(), // starter, pro, enterprise
    plan_name: d.varchar("plan_name", { length: 100 }).notNull(),
    plan_price: d.integer("plan_price").notNull(), // Price in paise/cents
    credits_per_month: d.integer("credits_per_month").notNull(),
    // Status
    status: subscriptionStatusEnum("status").notNull().default("pending"),
    // Billing cycle
    current_period_start: d.timestamp("current_period_start", {
      withTimezone: true,
    }),
    current_period_end: d.timestamp("current_period_end", {
      withTimezone: true,
    }),
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
    index("subscriptions_razorpay_subscription_id_idx").on(
      t.razorpay_subscription_id,
    ),
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
    subscription_id: d
      .text("subscription_id")
      .references(() => subscriptions.id),
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
    index("payment_transactions_razorpay_payment_id_idx").on(
      t.razorpay_payment_id,
    ),
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
    subscription_credits_remaining: d
      .integer("subscription_credits_remaining")
      .notNull(),
    additional_credits_remaining: d
      .integer("additional_credits_remaining")
      .notNull(),
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

// Accessibility Tester
export const a11yTestStatusEnum = pgEnum("a11y_test_status", [
  "pending", "crawling", "testing", "generating_report", "completed", "failed",
])

export const accessibility_test_runs = createTable(
  "accessibility_test_runs",
  (d) => ({
    id: d.text("id").primaryKey(),
    user_id: d
      .text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    target_url: d.text("target_url").notNull(),
    standards: d.text("standards").notNull(), // JSON string array
    status: a11yTestStatusEnum("status").notNull().default("pending"),
    max_pages: d.integer("max_pages").notNull().default(20),
    max_depth: d.integer("max_depth").notNull().default(3),
    total_pages_tested: d.integer("total_pages_tested").default(0),
    total_violations: d.integer("total_violations").default(0),
    total_passes: d.integer("total_passes").default(0),
    total_incomplete: d.integer("total_incomplete").default(0),
    logs: d.text("logs"), // JSON array of SSEEvent objects
    pdf_report_base64: d.text("pdf_report_base64"),
    error_message: d.text("error_message"),
    started_at: d.timestamp("started_at", { withTimezone: true }),
    completed_at: d.timestamp("completed_at", { withTimezone: true }),
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
    index("a11y_test_runs_user_id_idx").on(t.user_id),
    index("a11y_test_runs_created_at_idx").on(t.created_at),
    index("a11y_test_runs_status_idx").on(t.status),
  ],
)

export const accessibility_page_results = createTable(
  "accessibility_page_results",
  (d) => ({
    id: d.text("id").primaryKey(),
    test_run_id: d
      .text("test_run_id")
      .notNull()
      .references(() => accessibility_test_runs.id, { onDelete: "cascade" }),
    page_url: d.text("page_url").notNull(),
    page_title: d.text("page_title"),
    violation_count: d.integer("violation_count").notNull().default(0),
    pass_count: d.integer("pass_count").notNull().default(0),
    incomplete_count: d.integer("incomplete_count").notNull().default(0),
    inapplicable_count: d.integer("inapplicable_count").notNull().default(0),
    violations: d.text("violations").notNull().default("[]"), // JSON
    passes: d.text("passes").notNull().default("[]"), // JSON
    incomplete: d.text("incomplete").notNull().default("[]"), // JSON
    tested_at: d
      .timestamp("tested_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("a11y_page_results_test_run_id_idx").on(t.test_run_id),
  ],
)

export const accessibilityTestRunsRelations = relations(accessibility_test_runs, ({ one, many }) => ({
  user: one(user, { fields: [accessibility_test_runs.user_id], references: [user.id] }),
  pageResults: many(accessibility_page_results),
}))

export const accessibilityPageResultsRelations = relations(accessibility_page_results, ({ one }) => ({
  testRun: one(accessibility_test_runs, {
    fields: [accessibility_page_results.test_run_id],
    references: [accessibility_test_runs.id],
  }),
}))

export const demoTypeEnum = pgEnum("demo_type", ["featured", "community"]);

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

export const subscriptionsRelations = relations(
  subscriptions,
  ({ one, many }) => ({
    user: one(user, { fields: [subscriptions.user_id], references: [user.id] }),
    transactions: many(payment_transactions),
  }),
);

export const paymentTransactionsRelations = relations(
  payment_transactions,
  ({ one }) => ({
    user: one(user, {
      fields: [payment_transactions.user_id],
      references: [user.id],
    }),
    subscription: one(subscriptions, {
      fields: [payment_transactions.subscription_id],
      references: [subscriptions.id],
    }),
  }),
);

export const creditUsageLogsRelations = relations(
  credit_usage_logs,
  ({ one }) => ({
    user: one(user, {
      fields: [credit_usage_logs.user_id],
      references: [user.id],
    }),
  }),
);

// Resume Builder Tables
export const resume_templates = createTable("resume_templates", (d) => ({
  id: d.text("id").primaryKey(),
  name: d.varchar("name", { length: 255 }).notNull(),
  description: d.text("description"),
  latex_template: d.text("latex_template").notNull(),
  is_default: d.boolean("is_default").default(false).notNull(),
  created_at: d
    .timestamp("created_at", { withTimezone: true })
    .$defaultFn(() => new Date())
    .notNull(),
  updated_at: d
    .timestamp("updated_at", { withTimezone: true })
    .$defaultFn(() => new Date())
    .notNull(),
}));

export const user_resumes = createTable(
  "user_resumes",
  (d) => ({
    id: d.text("id").primaryKey(),
    user_id: d
      .text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    template_id: d.text("template_id").references(() => resume_templates.id),
    resume_data: d.text("resume_data").notNull(), // JSON string
    latex_content: d.text("latex_content"),
    pdf_url: d.text("pdf_url"),
    title: d.varchar("title", { length: 255 }),
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
    index("user_resumes_user_id_idx").on(t.user_id),
    index("user_resumes_created_at_idx").on(t.created_at),
  ],
);
export const userResumesRelations = relations(user_resumes, ({ one }) => ({
  user: one(user, { fields: [user_resumes.user_id], references: [user.id] }),
  template: one(resume_templates, {
    fields: [user_resumes.template_id],
    references: [resume_templates.id],
  }),
}));

export const resumeTemplatesRelations = relations(
  resume_templates,
  ({ many }) => ({
    resumes: many(user_resumes),
  }),
);

// GitHub Repos — one row per GitHub repo linked to a chat
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
    // A chat can't link the same GitHub repo twice, but different chats/users
    // can each independently link the same repo.
    unique("github_repos_chat_id_github_repo_id_unique").on(t.chat_id, t.github_repo_id),
    index("github_repos_user_id_idx").on(t.user_id),
    index("github_repos_chat_id_idx").on(t.chat_id),
    // Composite index for the most common query: active repo for a given chat
    index("github_repos_chat_id_is_active_idx").on(t.chat_id, t.is_active),
  ],
);

export const githubReposRelations = relations(github_repos, ({ one }) => ({
  user: one(user, { fields: [github_repos.user_id], references: [user.id] }),
  chat: one(user_chats, {
    fields: [github_repos.chat_id],
    references: [user_chats.id],
  }),
}));

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
);

export const studioLayoutsRelations = relations(studio_layouts, ({ one }) => ({
  user: one(user, { fields: [studio_layouts.user_id], references: [user.id] }),
}));

// ─── Shared Chat Links ──────────────────────────────────────────────────────

export const shared_chat_links = createTable(
  "shared_chat_links",
  (d) => ({
    id: d.text("id").primaryKey(),
    token: d.varchar("token", { length: 64 }).notNull().unique(),
    user_id: d
      .text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    chat_type: chatTypeEnum("chat_type").notNull(),
    // For BUILDER chats: v0_chat_id; For OPENROUTER chats: conversation_id
    chat_id: d.text("chat_id").notNull(),
    title: d.text("title"),
    // Snapshot of messages at share time (JSON array)
    messages: d.text("messages").notNull(),
    created_at: d
      .timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    expires_at: d.timestamp("expires_at", { withTimezone: true }),
  }),
  (t) => [
    index("shared_chat_links_token_idx").on(t.token),
    index("shared_chat_links_user_id_idx").on(t.user_id),
  ],
);

// ─── Sandbox Executions ──────────────────────────────────────────────────────

export const sandbox_executions = createTable(
  "sandbox_executions",
  (d) => ({
    id: d.text("id").primaryKey(),
    user_id: d.text("user_id").notNull(),
    language: d.text("language").notNull(),
    code: d.text("code").notNull(),
    status: d.text("status").notNull().default("running"),
    output: d.text("output"),
    error: d.text("error"),
    exit_code: integer("exit_code"),
    execution_time_ms: integer("execution_time_ms"),
    created_at: d
      .timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    completed_at: d.timestamp("completed_at", { withTimezone: true }),
  }),
  (t) => [index("sandbox_executions_user_id_idx").on(t.user_id)],
);

// =============================================================================
// TINYFISH TESTING ENGINE
// =============================================================================

// -- Enums --------------------------------------------------------------------

export const testRunStatusEnum = pgEnum("test_run_status", [
  "crawling",
  "generating",
  "awaiting_review",  // — pipeline paused for user edits
  "executing",
  "reporting",
  "complete",
  "failed",
  "cancelled",  // required by cancel handler + pipeline catch block
]);

export const testPriorityEnum = pgEnum("test_priority", ["P0", "P1", "P2"]);

export const testResultStatusEnum = pgEnum("test_result_status", [
  "pending",
  "running",
  "passed",
  "failed",
  "flaky",   // passes on retry — prevents false positives
  "skipped",
]);

export const bugSeverityEnum = pgEnum("bug_severity", [
  "critical",
  "high",
  "medium",
  "low",
]);

export const bugStatusEnum = pgEnum("bug_status", ["open", "fixed", "ignored"]);

export const reportFormatEnum = pgEnum("report_format", [
  "pdf",
  "json",
  "html",
]);

// -- Tables -------------------------------------------------------------------

// Each full test execution
// Trend chart data is derived by ordering test_runs by started_at for the same user/project.
export const test_runs = createTable(
  "test_runs",
  (d) => ({
    id: d.text("id").primaryKey(),
    user_id: d
      .text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // null = external URL test, non-null = Buildify-generated app
    project_id: d.text("project_id"),
    target_url: d.text("target_url").notNull(),
    // Pipeline status: crawling → generating → executing → reporting → complete | failed
    status: testRunStatusEnum("status").notNull().default("crawling"),
    overall_score: d.integer("overall_score"), // 0-100; drives Score Hero gauge colour
    total_tests: d.integer("total_tests").default(0),
    passed: d.integer("passed").default(0),
    failed: d.integer("failed").default(0),
    // Skipped count — shown in live counter "X passed / Y failed / Z skipped"
    skipped: d.integer("skipped").default(0),
    // Running count — shown in live counter during SSE streaming
    running: d.integer("running").default(0),
    started_at: d
      .timestamp("started_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    completed_at: d.timestamp("completed_at", { withTimezone: true }),
  }),
  (t) => [
    index("test_runs_user_id_idx").on(t.user_id),
    index("test_runs_status_idx").on(t.status),
    index("test_runs_started_at_idx").on(t.started_at),
    index("test_runs_project_id_idx").on(t.project_id),
    // Composite index for trend chart query (user + time)
    index("test_runs_user_id_started_at_idx").on(t.user_id, t.started_at),
  ],
);

// Crawled site map data
export const crawl_results = createTable(
  "crawl_results",
  (d) => ({
    id: d.text("id").primaryKey(),
    test_run_id: d
      .text("test_run_id")
      .notNull()
      .references(() => test_runs.id, { onDelete: "cascade" }),
    pages: d.jsonb("pages"),         // all pages found
    elements: d.jsonb("elements"),   // buttons, inputs, links
    forms: d.jsonb("forms"),         // all forms found
    links: d.jsonb("links"),         // all internal/external links
    screenshots: d.jsonb("screenshots"), // baseline screenshots per page
    crawl_time_ms: d.integer("crawl_time_ms"),
    created_at: d
      .timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [index("crawl_results_test_run_id_idx").on(t.test_run_id)],
);

// AI-generated test cases
export const test_cases = createTable(
  "test_cases",
  (d) => ({
    id: d.text("id").primaryKey(),
    test_run_id: d
      .text("test_run_id")
      .notNull()
      .references(() => test_runs.id, { onDelete: "cascade" }),
    // navigation | forms | visual | performance | a11y | security
    // Maps 1-to-1 with the 6 Category Ring Charts on the dashboard
    category: d.varchar("category", { length: 50 }),
    title: d.text("title"),
    description: d.text("description"),
    steps: d.jsonb("steps"),          // array of natural-language step strings
    expected_result: d.text("expected_result"),
    priority: testPriorityEnum("priority").default("P1"),
    tags: d.jsonb("tags"),            // string[]
    estimated_duration: d.integer("estimated_duration"), // ms
    target_url: d.text("target_url"),    
    created_at: d
      .timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("test_cases_test_run_id_idx").on(t.test_run_id),
    index("test_cases_priority_idx").on(t.priority),
    index("test_cases_category_idx").on(t.category),
  ],
);

// Individual test execution outcomes
export const test_results = createTable(
  "test_results",
  (d) => ({
    id: d.text("id").primaryKey(),
    test_case_id: d
      .text("test_case_id")
      .notNull()
      .references(() => test_cases.id, { onDelete: "cascade" }),
    test_run_id: d
      .text("test_run_id")
      .notNull()
      .references(() => test_runs.id, { onDelete: "cascade" }),
    status: testResultStatusEnum("status").default("pending"),
    actual_result: d.text("actual_result"),
    duration_ms: d.integer("duration_ms"),
    screenshot_url: d.text("screenshot_url"), // Cloudflare R2 URL
    error_details: d.text("error_details"),
    console_logs: d.jsonb("console_logs"),    // captured browser console output
    // NEW: captured browser network errors/requests (shown in Bug Detail Modal)
    network_logs: d.jsonb("network_logs"),
    // retry_count: incremented on each retry; status set to "flaky" if passes on retry ≤ 2
    retry_count: d.integer("retry_count").default(0),
    tinyfish_job_id: d.text("tinyfish_job_id"), // TinyFish SSE job reference
    created_at: d
      .timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("test_results_test_run_id_idx").on(t.test_run_id),
    index("test_results_test_case_id_idx").on(t.test_case_id),
    index("test_results_status_idx").on(t.status),
  ],
);

// Found bugs (one per failed test result)
export const bug_reports = createTable(
  "bug_reports",
  (d) => ({
    id: d.text("id").primaryKey(),
    test_run_id: d
      .text("test_run_id")
      .notNull()
      .references(() => test_runs.id, { onDelete: "cascade" }),
    test_result_id: d
      .text("test_result_id")
      .references(() => test_results.id, { onDelete: "set null" }),
    severity: bugSeverityEnum("severity").default("medium"),
    // navigation | forms | visual | performance | a11y | security
    category: d.varchar("category", { length: 50 }),
    title: d.text("title"),
    description: d.text("description"),
    reproduction_steps: d.jsonb("reproduction_steps"), // ordered string[]
    screenshot_url: d.text("screenshot_url"),
    // NEW: bounding box for the red annotation overlay in Bug Detail Modal
    // Shape: { x: number, y: number, width: number, height: number }
    annotation_box: d.jsonb("annotation_box"),
    ai_fix_suggestion: d.text("ai_fix_suggestion"), // AI-generated fix with code snippet
    page_url: d.text("page_url"),
    status: bugStatusEnum("status").default("open"),
    created_at: d
      .timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("bug_reports_test_run_id_idx").on(t.test_run_id),
    index("bug_reports_severity_idx").on(t.severity),
    index("bug_reports_status_idx").on(t.status),
    // Composite index for bug list table filtered by category
    index("bug_reports_test_run_id_category_idx").on(
      t.test_run_id,
      t.category,
    ),
  ],
);

// Exported reports (PDF / JSON / HTML)
export const report_exports = createTable(
  "report_exports",
  (d) => ({
    id: d.text("id").primaryKey(),
    test_run_id: d
      .text("test_run_id")
      .notNull()
      .references(() => test_runs.id, { onDelete: "cascade" }),
    format: reportFormatEnum("format").notNull(),
    file_url: d.text("file_url"),   // Cloudflare R2 URL for the export file
    ai_summary: d.text("ai_summary"), // Plain-English executive summary
    // Shareable public report link — /report/[shareable_slug] requires no login
    shareable_slug: d.varchar("shareable_slug", { length: 100 }).unique(),
    is_public: d.boolean("is_public").default(false).notNull(),
    // NEW: opaque token used to render the "Tested by Buildify — Score: N" embed badge
    embed_badge_token: d.varchar("embed_badge_token", { length: 64 }).unique(),
    created_at: d
      .timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("report_exports_test_run_id_idx").on(t.test_run_id),
    index("report_exports_shareable_slug_idx").on(t.shareable_slug),
    index("report_exports_embed_badge_token_idx").on(t.embed_badge_token),
  ],
);

// =============================================================================
// per-page Core Web Vitals
// Powers the "Performance Gauges" dashboard section (LCP / FID / CLS / TTFB)
// with green / yellow / red thresholds per page.
// =============================================================================
export const performance_metrics = createTable(
  "performance_metrics",
  (d) => ({
    id: d.text("id").primaryKey(),
    test_run_id: d
      .text("test_run_id")
      .notNull()
      .references(() => test_runs.id, { onDelete: "cascade" }),
    // The specific page this measurement was taken on
    page_url: d.text("page_url").notNull(),
    // Core Web Vitals — all in milliseconds except CLS (unitless score)
    lcp_ms: real("lcp_ms"),   // Largest Contentful Paint  — green <2500, yellow <4000, red ≥4000
    fid_ms: real("fid_ms"),   // First Input Delay         — green <100,  yellow <300,  red ≥300
    cls: real("cls"),         // Cumulative Layout Shift   — green <0.1,  yellow <0.25, red ≥0.25
    ttfb_ms: real("ttfb_ms"), // Time to First Byte        — green <800,  yellow <1800, red ≥1800
    // Raw Lighthouse / Playwright timing data for future use
    raw_metrics: d.jsonb("raw_metrics"),
    created_at: d
      .timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("performance_metrics_test_run_id_idx").on(t.test_run_id),
    index("performance_metrics_page_url_idx").on(t.page_url),
  ],
);

// -- Relations ----------------------------------------------------------------

export const testRunsRelations = relations(test_runs, ({ one, many }) => ({
  user: one(user, { fields: [test_runs.user_id], references: [user.id] }),
  crawlResult: one(crawl_results, {
    fields: [test_runs.id],
    references: [crawl_results.test_run_id],
  }),
  testCases: many(test_cases),
  testResults: many(test_results),
  bugReports: many(bug_reports),
  reportExports: many(report_exports),
  performanceMetrics: many(performance_metrics),
}));

export const crawlResultsRelations = relations(crawl_results, ({ one }) => ({
  testRun: one(test_runs, {
    fields: [crawl_results.test_run_id],
    references: [test_runs.id],
  }),
}));

export const testCasesRelations = relations(test_cases, ({ one, many }) => ({
  testRun: one(test_runs, {
    fields: [test_cases.test_run_id],
    references: [test_runs.id],
  }),
  results: many(test_results),
}));

export const testResultsRelations = relations(test_results, ({ one }) => ({
  testCase: one(test_cases, {
    fields: [test_results.test_case_id],
    references: [test_cases.id],
  }),
  testRun: one(test_runs, {
    fields: [test_results.test_run_id],
    references: [test_runs.id],
  }),
  bugReport: one(bug_reports, {
    fields: [test_results.id],
    references: [bug_reports.test_result_id],
  }),
}));

export const bugReportsRelations = relations(bug_reports, ({ one }) => ({
  testRun: one(test_runs, {
    fields: [bug_reports.test_run_id],
    references: [test_runs.id],
  }),
  testResult: one(test_results, {
    fields: [bug_reports.test_result_id],
    references: [test_results.id],
  }),
}));

export const reportExportsRelations = relations(report_exports, ({ one }) => ({
  testRun: one(test_runs, {
    fields: [report_exports.test_run_id],
    references: [test_runs.id],
  }),
}));

export const performanceMetricsRelations = relations(
  performance_metrics,
  ({ one }) => ({
    testRun: one(test_runs, {
      fields: [performance_metrics.test_run_id],
      references: [test_runs.id],
    }),
  }),
);

// =============================================================================
// Video Generation
// =============================================================================

export const video_chats = createTable(
  "video_chats",
  (d) => ({
    id: d.text("id").primaryKey(),
    user_id: d
      .text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
 
    title: d.text("title"), // auto-generated from first prompt
 
    // ── Current video state ───────────────────────────────────────────────────
    // Completely rewritten on every follow-up prompt.
    video_json: d.text("video_json").notNull(),          // latest VideoJson as JSON string
    current_options: d.jsonb("current_options"),         // VideoOptions: { useTTS, useMusic, voiceId, musicGenre, ttsVolume, musicVolume }
    current_user_images: d.jsonb("current_user_images"), // UserImage[]: replaceable at any time (max 5)
    image_session_id: d.text("image_session_id"),        // tracks which upload session owns the current images (for S3 cleanup)
    
    // ── Prompt history (append-only log) ──────────────────────────────────────
    // Shape: { prompt: string, sentAt: string }[]
    // Never deleted — gives full history of how the video evolved.
    prompts: d.jsonb("prompts").notNull().default([]),
 
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
    index("video_chats_user_id_idx").on(t.user_id),
    index("video_chats_updated_at_idx").on(t.updated_at),
  ],
);
 
export const videoChatsRelations = relations(video_chats, ({ one }) => ({
  user: one(user, { fields: [video_chats.user_id], references: [user.id] }),
}));