import {
  bigint,
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import {
  APPLICATION_STAGES,
  APPLICATION_STATUSES,
  type StatusEvent,
} from "@/lib/applications/status";
import { WORK_RIGHTS } from "@/lib/eligibility/profile";
import { FEEDBACK_KINDS } from "@/lib/feedback/types";
import {
  ASKED_APPLIED_ANSWERS,
  EMPLOYMENT_TYPES,
  JOB_SOURCES,
  MATCH_EVENT_KINDS,
  NOT_FIT_REASONS,
  ROLE_FAMILIES,
  SENIORITIES,
} from "@/lib/job-feed/types";
import type { InterviewPrep } from "@/lib/insights/prep";
import { NOTIFICATION_KINDS } from "@/lib/notifications/types";
import { PORTFOLIO_TEMPLATE_IDS } from "@/lib/portfolio/types";
import { REFERRAL_BLOCK_REASONS, REFERRAL_STATUSES } from "@/lib/referrals/referrals";
import type { Resume } from "@/lib/resume/schema";
import { SETUP_STEP_OUTCOMES } from "@/lib/setup/types";
import { WRITING_KINDS } from "@/lib/writings/schema";

// Mirrors supabase/migrations, which also own foreign keys and RLS: change both together.
// Timestamps are epoch ms as bigint, read back as JS numbers.

const epochMs = (name: string) => bigint(name, { mode: "number" });

// Same id as the Supabase Auth user; deleting it cascades to everything the account owns.
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    // Not unique: auth.users owns uniqueness, and a stale copy must never block a sign-in.
    email: text("email").notNull(),
    plan: text("plan", { enum: ["free", "pro", "max"] })
      .notNull()
      .default("free"),
    // Provider subscription status as last reported by a webhook, e.g. "active", "trialing", "canceled".
    planStatus: text("plan_status"),
    planRenewsAt: epochMs("plan_renews_at"),
    planInterval: text("plan_interval", { enum: ["month", "year", "week"] }),
    trialEndsAt: epochMs("trial_ends_at"),
    // Start of Creem's current billing period, which the AI allowance counts in. Null on Free.
    planPeriodStartsAt: epochMs("plan_period_starts_at"),
    planPeriodEndsAt: epochMs("plan_period_ends_at"),
    billingCustomerId: text("billing_customer_id"),
    billingSubscriptionId: text("billing_subscription_id"),
    // The newest subscription event applied, so a late retry of an older one is ignored.
    billingEventAt: epochMs("billing_event_at"),
    createdAt: epochMs("created_at").notNull(),
    updatedAt: epochMs("updated_at").notNull(),
  },
  (t) => [
    index("users_email_idx").on(t.email),
    index("users_billing_customer_idx").on(t.billingCustomerId),
    index("users_billing_subscription_idx").on(t.billingSubscriptionId),
  ],
);

// period: "cycle:<ISO start>" (a monthly or yearly billing month), "YYYY-MM" (a UTC month: Free, or
// no billing period yet), "week:<ISO end>" (weekly) or "trial". See src/lib/usage.ts.
export const usage = pgTable(
  "usage",
  {
    subject: uuid("subject").notNull(),
    feature: text("feature").notNull(),
    period: text("period").notNull(),
    count: integer("count").notNull().default(0),
    // Extra units from invites, on top of the plan's limit.
    bonus: integer("bonus").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.subject, t.feature, t.period] })],
);

// Fixed-window counters: key like "import:ip:1.2.3.4", windowStart = floor(now / windowMs) * windowMs.
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").notNull(),
    windowStart: epochMs("window_start").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.key, t.windowStart] }),
    index("rate_limits_window_idx").on(t.windowStart),
  ],
);

// Cloud backup for signed-in users. Scoped by user so a client-chosen id can't collide across users.
export const resumes = pgTable(
  "resumes",
  {
    userId: uuid("user_id").notNull(),
    id: text("id").notNull(),
    // Validated with ResumeSchema on write and on read.
    data: jsonb("data").$type<Resume>().notNull(),
    createdAt: epochMs("created_at").notNull(),
    updatedAt: epochMs("updated_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.id] })],
);

// So another device's stale copy can't bring a deleted resume back. Pruned by age and count.
export const resumeTombstones = pgTable(
  "resume_tombstones",
  {
    userId: uuid("user_id").notNull(),
    id: text("id").notNull(),
    deletedAt: epochMs("deleted_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.id] }),
    // Covers "newest first per user" for the list and both prunes without touching the table.
    index("resume_tombstones_user_deleted_idx").on(t.userId, t.deletedAt, t.id),
  ],
);

// Webhook ids already processed, for idempotency.
export const billingEvents = pgTable("billing_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  receivedAt: epochMs("received_at").notNull(),
});

// A Pro trial ended early by buying another plan, and whether it has been cancelled yet.
export const trialReplacements = pgTable("trial_replacements", {
  replacedSubscriptionId: text("replaced_subscription_id").primaryKey(),
  subscriptionId: text("subscription_id").notNull(),
  userId: uuid("user_id").notNull(),
  attempts: integer("attempts").notNull().default(0),
  createdAt: epochMs("created_at").notNull(),
  cancelledAt: epochMs("cancelled_at"),
});

// One trial per person, by email hash. Not tied to users: it outlives a deleted account.
export const trialHistory = pgTable("trial_history", {
  emailHash: text("email_hash").primaryKey(),
  kind: text("kind", { enum: ["trial", "paid"] }).notNull(),
  createdAt: epochMs("created_at").notNull(),
});

// Job applications a user logs, each tied to the resume version that was sent.
export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id").notNull(),
    resumeId: text("resume_id"),
    resumeTitle: text("resume_title").notNull().default(""),
    company: text("company").notNull(),
    role: text("role").notNull().default(""),
    jobUrl: text("job_url").notNull().default(""),
    appliedAt: epochMs("applied_at").notNull(),
    status: text("status", { enum: APPLICATION_STATUSES }).notNull().default("applied"),
    stageReached: text("stage_reached", { enum: APPLICATION_STAGES }).notNull().default("applied"),
    statusChangedAt: epochMs("status_changed_at").notNull(),
    notes: text("notes").notNull().default(""),
    // Validated with InterviewPrepSchema; read with readPrep, which also reads v1 packs.
    prep: jsonb("prep").$type<InterviewPrep>(),
    remindedAt: epochMs("reminded_at"),
    // Reminded once per date: remindedAt at or past it means that date is done.
    followUpAt: epochMs("follow_up_at"),
    jobId: uuid("job_id"),
    statusHistory: jsonb("status_history").$type<StatusEvent[]>().notNull().default([]),
    interviewAt: epochMs("interview_at"),
    createdAt: epochMs("created_at").notNull(),
    updatedAt: epochMs("updated_at").notNull(),
  },
  (t) => [
    // id last so the newest-first list pages by (applied_at, id) straight off the index.
    index("applications_user_applied_idx").on(t.userId, t.appliedAt, t.id),
    index("applications_user_resume_idx").on(t.userId, t.resumeId),
  ],
);

export const workProfiles = pgTable("work_profiles", {
  userId: uuid("user_id").primaryKey(),
  country: text("country").notNull().default(""),
  timeZone: text("time_zone").notNull().default(""),
  // Per region: may work there without a sponsored visa, or would need one. null: not answered.
  workUs: text("work_us", { enum: WORK_RIGHTS }),
  workUk: text("work_uk", { enum: WORK_RIGHTS }),
  workEu: text("work_eu", { enum: WORK_RIGHTS }),
  workCa: text("work_ca", { enum: WORK_RIGHTS }),
  fullTime: boolean("full_time").notNull().default(true),
  contract: boolean("contract").notNull().default(true),
  remoteOnly: boolean("remote_only").notNull().default(false),
  // Only the "Looking for" fields the person changed; null follows the resume.
  targetTitle: text("target_title"),
  targetFamily: text("target_family", { enum: ROLE_FAMILIES }),
  targetOccupation: text("target_occupation"),
  targetLevel: text("target_level", { enum: SENIORITIES }),
  targetPlace: text("target_place"),
  createdAt: epochMs("created_at").notNull(),
  updatedAt: epochMs("updated_at").notNull(),
});

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id").notNull(),
    kind: text("kind", { enum: NOTIFICATION_KINDS }).notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    // An in-app path such as "/dashboard/applications", or null.
    link: text("link"),
    readAt: epochMs("read_at"),
    createdAt: epochMs("created_at").notNull(),
  },
  (t) => [
    index("notifications_user_created_idx").on(t.userId, t.createdAt, t.id),
    index("notifications_created_idx").on(t.createdAt),
  ],
);

// No row means the defaults: a follow-up 7 days after applying, and no email.
export const notificationSettings = pgTable("notification_settings", {
  userId: uuid("user_id").primaryKey(),
  emailReminders: boolean("email_reminders").notNull().default(false),
  followUpDays: integer("follow_up_days").notNull().default(7),
  updatedAt: epochMs("updated_at").notNull(),
});

// First-login step and Home "Get set up" list. No row: neither answered, skipped nor hidden.
export const accountSetup = pgTable("account_setup", {
  userId: uuid("user_id").primaryKey(),
  stepAt: epochMs("step_at"),
  stepOutcome: text("step_outcome", { enum: SETUP_STEP_OUTCOMES }),
  checklistHiddenAt: epochMs("checklist_hidden_at"),
  createdAt: epochMs("created_at").notNull(),
  updatedAt: epochMs("updated_at").notNull(),
});

// The migration keeps one live link per (user_id, resume_id); snapshot is null once turned off.
export const shares = pgTable(
  "shares",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id").notNull(),
    resumeId: text("resume_id").notNull(),
    slug: text("slug").notNull().unique(),
    // Validated with ResumeSchema on write and on read.
    snapshot: jsonb("snapshot").$type<Resume>(),
    showContact: boolean("show_contact").notNull().default(false),
    allowIndexing: boolean("allow_indexing").notNull().default(false),
    views: integer("views").notNull().default(0),
    lastViewedAt: epochMs("last_viewed_at"),
    createdAt: epochMs("created_at").notNull(),
    updatedAt: epochMs("updated_at").notNull(),
    revokedAt: epochMs("revoked_at"),
  },
  (t) => [index("shares_user_created_idx").on(t.userId, t.createdAt, t.id)],
);

// userId is null when sent signed out.
export const feedback = pgTable(
  "feedback",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id"),
    kind: text("kind", { enum: FEEDBACK_KINDS }).notNull(),
    message: text("message").notNull(),
    pagePath: text("page_path"),
    createdAt: epochMs("created_at").notNull(),
  },
  (t) => [index("feedback_created_idx").on(t.createdAt)],
);

// Device cookies the code was opened from: newest last, at most 10.
export const referralCodes = pgTable("referral_codes", {
  userId: uuid("user_id").primaryKey(),
  code: text("code").notNull().unique(),
  deviceIds: text("device_ids").array().notNull().default([]),
  createdAt: epochMs("created_at").notNull(),
});

export const referrals = pgTable(
  "referrals",
  {
    referredId: uuid("referred_id").primaryKey(),
    referrerId: uuid("referrer_id").notNull(),
    status: text("status", { enum: REFERRAL_STATUSES }).notNull().default("pending"),
    blockedReason: text("blocked_reason", { enum: REFERRAL_BLOCK_REASONS }),
    deviceId: text("device_id"),
    rewardedPeriod: text("rewarded_period"),
    rewardedAt: epochMs("rewarded_at"),
    createdAt: epochMs("created_at").notNull(),
  },
  (t) => [index("referrals_referrer_status_idx").on(t.referrerId, t.status)],
);

// Postgres full-text search vector. Written with to_tsvector() in SQL, never read back by the app.
const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });

// Column docs and the partial indexes live in 20261108001000_jobs.sql.
export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey(),
  source: text("source", { enum: JOB_SOURCES }).notNull(),
  externalId: text("external_id").notNull(),
  board: text("board").notNull().default(""),
  company: text("company").notNull(),
  title: text("title").notNull(),
  location: text("location").notNull().default(""),
  remote: boolean("remote").notNull().default(false),
  employmentType: text("employment_type", { enum: EMPLOYMENT_TYPES }),
  seniority: text("seniority", { enum: SENIORITIES }).notNull().default("mid"),
  family: text("family", { enum: ROLE_FAMILIES }),
  // O*NET-SOC code the title names; null when it can't tell.
  occupation: text("occupation"),
  minYears: integer("min_years"),
  postedAt: epochMs("posted_at").notNull(),
  validThrough: epochMs("valid_through"),
  url: text("url").notNull(),
  description: text("description").notNull().default(""),
  rulesText: text("rules_text").notNull().default(""),
  keywords: text("keywords").array().notNull().default([]),
  search: tsvector("search").notNull(),
  dedupeKey: text("dedupe_key").notNull(),
  // Location copies of one opening share it (20261109001000_match_quality.sql).
  groupKey: text("group_key").notNull().default(""),
  evergreen: boolean("evergreen").notNull().default(false),
  contentHash: text("content_hash").notNull(),
  firstSeenAt: epochMs("first_seen_at").notNull(),
  lastSeenAt: epochMs("last_seen_at").notNull(),
  missedRuns: integer("missed_runs").notNull().default(0),
  closedAt: epochMs("closed_at"),
  closeReason: text("close_reason", {
    enum: ["gone", "expired", "duplicate", "board_gone", "aged"],
  }),
  createdAt: epochMs("created_at").notNull(),
  updatedAt: epochMs("updated_at").notNull(),
});

// When each company board and feed was last read, so a run resumes where the last one stopped.
export const jobBoards = pgTable(
  "job_boards",
  {
    source: text("source", { enum: JOB_SOURCES }).notNull(),
    token: text("token").notNull(),
    company: text("company").notNull().default(""),
    lastFetchedAt: epochMs("last_fetched_at"),
    lastStatus: text("last_status", { enum: ["ok", "not_found", "failed"] }),
    failures: integer("failures").notNull().default(0),
    openJobs: integer("open_jobs").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.source, t.token] })],
);

// Rewritten after each ingest run.
export const jobSkills = pgTable("job_skills", {
  skill: text("skill").primaryKey(),
  openJobs: integer("open_jobs").notNull(),
  weight: real("weight").notNull(),
  updatedAt: epochMs("updated_at").notNull(),
});

// Ranking's narrow copy of the jobs, rebuilt after each ingest (src/lib/job-feed/match-index.ts).
export const matchSkills = pgTable("match_skills", {
  sid: integer("sid").primaryKey(),
  skill: text("skill").notNull(),
});

export const jobMatch = pgTable("job_match", {
  id: uuid("id").primaryKey(),
  grp: text("grp").notNull(),
  company: text("company").notNull(),
  family: text("family", { enum: ROLE_FAMILIES }),
  occ: text("occ"),
  occMinor: text("occ_minor"),
  occMajor: text("occ_major"),
  zone: smallint("zone"),
  level: smallint("level").notNull(),
  sids: integer("sids").array().notNull(),
  places: text("places").array().notNull().default([]),
  remote: boolean("remote").notNull(),
  postedAt: epochMs("posted_at").notNull(),
  seenAt: epochMs("seen_at").notNull(),
  ukSponsor: boolean("uk_sponsor").notNull().default(false),
  h1bYear: smallint("h1b_year"),
});

export const jobCountsRow = pgTable("job_counts", {
  id: smallint("id").primaryKey().default(1),
  openJobs: integer("open_jobs").notNull(),
  matchable: integer("matchable").notNull(),
  checkedAt: epochMs("checked_at"),
  builtAt: epochMs("built_at").notNull(),
});

// One page of Matches kept a day (unlogged; the cleanup cron deletes old rows).
export const matchCache = pgTable(
  "match_cache",
  {
    userId: uuid("user_id").notNull(),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    createdAt: epochMs("created_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.key] }),
    index("match_cache_created_idx").on(t.createdAt),
  ],
);

// Companies on public visa registers (scripts/visa-registers.ts).
export const companyVisa = pgTable("company_visa", {
  companyKey: text("company_key").primaryKey(),
  ukName: text("uk_name"),
  h1bYear: smallint("h1b_year"),
  h1bApprovals: integer("h1b_approvals"),
  usName: text("us_name"),
  checkedAt: epochMs("checked_at").notNull(),
});

// What the Jobs tab showed and what was done with it. Never the resume or contact details.
export const matchEvents = pgTable(
  "match_events",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id").notNull(),
    requestId: uuid("request_id"),
    kind: text("kind", { enum: MATCH_EVENT_KINDS }).notNull(),
    jobId: uuid("job_id").notNull(),
    position: integer("position"),
    label: text("label", { enum: ["strong", "good", "stretch"] }),
    variant: text("variant").notNull(),
    resumeHash: text("resume_hash"),
    reason: text("reason", { enum: NOT_FIT_REASONS }),
    answer: text("answer", { enum: ASKED_APPLIED_ANSWERS }),
    createdAt: epochMs("created_at").notNull(),
  },
  (t) => [index("match_events_created_idx").on(t.createdAt)],
);

export const savedJobs = pgTable(
  "saved_jobs",
  {
    userId: uuid("user_id").notNull(),
    jobId: uuid("job_id").notNull(),
    savedAt: epochMs("saved_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.jobId] }),
    index("saved_jobs_user_saved_idx").on(t.userId, t.savedAt),
  ],
);

export const portfolios = pgTable(
  "portfolios",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id").notNull().unique(),
    resumeId: text("resume_id").notNull(),
    slug: text("slug").notNull().unique(),
    template: text("template", { enum: PORTFOLIO_TEMPLATE_IDS }).notNull().default("navy"),
    // Validated with ResumeSchema on write and on read.
    snapshot: jsonb("snapshot").$type<Resume>().notNull(),
    showEmail: boolean("show_email").notNull().default(false),
    showPhone: boolean("show_phone").notNull().default(false),
    hiddenSections: text("hidden_sections").array().notNull().default([]),
    sync: boolean("sync").notNull().default(true),
    published: boolean("published").notNull().default(false),
    allowIndexing: boolean("allow_indexing").notNull().default(false),
    // What rich templates show beyond the resume, checked with PortfolioContentSchema.
    content: jsonb("content").$type<Record<string, unknown>>().notNull().default({}),
    github: jsonb("github").$type<Record<string, unknown>>(),
    githubCheckedAt: epochMs("github_checked_at"),
    views: integer("views").notNull().default(0),
    createdAt: epochMs("created_at").notNull(),
    updatedAt: epochMs("updated_at").notNull(),
    publishedAt: epochMs("published_at"),
  },
  (t) => [index("portfolios_user_resume_idx").on(t.userId, t.resumeId)],
);

// A portfolio's old addresses, redirecting to its current one until expires_at.
export const portfolioRedirects = pgTable(
  "portfolio_redirects",
  {
    slug: text("slug").primaryKey(),
    portfolioId: uuid("portfolio_id").notNull(),
    userId: uuid("user_id").notNull(),
    createdAt: epochMs("created_at").notNull(),
    expiresAt: epochMs("expires_at").notNull(),
  },
  (t) => [index("portfolio_redirects_portfolio_idx").on(t.portfolioId, t.createdAt)],
);

// Cover letters and application answers. Written only through /api/writings.
export const writings = pgTable(
  "writings",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id").notNull(),
    kind: text("kind", { enum: WRITING_KINDS }).notNull(),
    resumeId: text("resume_id"),
    resumeTitle: text("resume_title").notNull().default(""),
    company: text("company").notNull().default(""),
    role: text("role").notNull().default(""),
    jobUrl: text("job_url").notNull().default(""),
    question: text("question").notNull().default(""),
    body: text("body").notNull(),
    warnings: jsonb("warnings").$type<string[]>().notNull().default([]),
    demo: boolean("demo").notNull().default(false),
    applicationId: uuid("application_id"),
    createdAt: epochMs("created_at").notNull(),
    updatedAt: epochMs("updated_at").notNull(),
  },
  (t) => [index("writings_user_created_idx").on(t.userId, t.createdAt, t.id)],
);

export type UserRow = typeof users.$inferSelect;
