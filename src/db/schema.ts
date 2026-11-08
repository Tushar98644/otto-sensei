import { bigint, boolean, index, integer, jsonb, pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core";
import { APPLICATION_STAGES, APPLICATION_STATUSES } from "@/lib/applications/status";
import { WORK_RIGHTS } from "@/lib/eligibility/profile";
import { FEEDBACK_KINDS } from "@/lib/feedback/types";
import type { InterviewPrep } from "@/lib/insights/prep";
import { NOTIFICATION_KINDS } from "@/lib/notifications/types";
import { REFERRAL_BLOCK_REASONS, REFERRAL_STATUSES } from "@/lib/referrals/referrals";
import type { Resume } from "@/lib/resume/schema";

// Mirrors supabase/migrations, which create these tables (with their foreign keys and RLS). Change
// both together: a new migration file for the database, then the matching columns here.
// Timestamps are epoch milliseconds as bigint, read back as JS numbers.

const epochMs = (name: string) => bigint(name, { mode: "number" });

// One row per Supabase Auth user, same id. Created on the first signed-in request; deleting the
// auth user cascades here and, through the foreign keys below, to everything the account owns.
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    // A copy of the auth user's address, kept in sync on sign-in. Not unique: auth.users owns
    // uniqueness, and a stale copy must never block someone else's sign-in.
    email: text("email").notNull(),
    plan: text("plan", { enum: ["free", "pro", "max"] }).notNull().default("free"),
    // Provider subscription status as last reported by a webhook, e.g. "active", "on_hold", "cancelled".
    planStatus: text("plan_status"),
    planRenewsAt: epochMs("plan_renews_at"),
    // How often the paid plan bills; null on Free (20261108000900_plan_interval.sql).
    planInterval: text("plan_interval", { enum: ["month", "year", "week"] }),
    billingCustomerId: text("billing_customer_id"),
    billingSubscriptionId: text("billing_subscription_id"),
    createdAt: epochMs("created_at").notNull(),
    updatedAt: epochMs("updated_at").notNull(),
  },
  (t) => [
    index("users_email_idx").on(t.email),
    index("users_billing_customer_idx").on(t.billingCustomerId),
    index("users_billing_subscription_idx").on(t.billingSubscriptionId),
  ],
);

// subject is a user id; period is "YYYY-MM" (a UTC calendar month) or "week:<ISO end instant>" (a
// weekly subscriber's billing week, src/lib/usage.ts).
export const usage = pgTable(
  "usage",
  {
    subject: uuid("subject").notNull(),
    feature: text("feature").notNull(),
    period: text("period").notNull(),
    count: integer("count").notNull().default(0),
    // Extra units from invites on top of the plan's limit (20261108000200_feedback_referrals.sql).
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

// Resumes deleted from the cloud backup, so another device's stale copy can't bring one back.
// Written in the same transaction that deletes the resumes row; pruned by age and count.
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
    // Interview prep pack (20261108000600_application_prep.sql). Validated with InterviewPrepSchema
    // on write and on read; null until one is made.
    prep: jsonb("prep").$type<InterviewPrep>(),
    // When the daily follow-up job last reminded the user about it (20261108000300_notifications.sql).
    remindedAt: epochMs("reminded_at"),
    // When the next follow-up reminder is due (20261108000700_follow_up_dates.sql); null for none.
    // Reminded once per date: remindedAt at or past it means that date is done.
    followUpAt: epochMs("follow_up_at"),
    createdAt: epochMs("created_at").notNull(),
    updatedAt: epochMs("updated_at").notNull(),
  },
  (t) => [
    // id last so the newest-first list pages by (applied_at, id) straight off the index.
    index("applications_user_applied_idx").on(t.userId, t.appliedAt, t.id),
    index("applications_user_resume_idx").on(t.userId, t.resumeId),
  ],
);

// One work profile per account (PUT /api/profile), read by the job post eligibility check.
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
  createdAt: epochMs("created_at").notNull(),
  updatedAt: epochMs("updated_at").notNull(),
});

// What Otto tells a user in the dashboard bell (20261108000300_notifications.sql). Written by the
// daily jobs in src/lib/cron; read and marked read through /api/notifications.
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

// Reminder settings, one row per account that changed one. No row: the defaults, which are a
// follow-up 7 days after applying and no email (20261108000700_follow_up_dates.sql).
export const notificationSettings = pgTable("notification_settings", {
  userId: uuid("user_id").primaryKey(),
  emailReminders: boolean("email_reminders").notNull().default(false),
  followUpDays: integer("follow_up_days").notNull().default(7),
  updatedAt: epochMs("updated_at").notNull(),
});

// Public share links (20261108000100_share_links.sql), read by slug on /s/<slug>. The migration
// also keeps one live link per (user_id, resume_id). snapshot is null once the link is turned off.
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

// "Send feedback" notes (20261108000200_feedback_referrals.sql). userId is null when signed out.
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

// Each account's invite code and the device cookies it was opened from (newest last, at most 10).
export const referralCodes = pgTable("referral_codes", {
  userId: uuid("user_id").primaryKey(),
  code: text("code").notNull().unique(),
  deviceIds: text("device_ids").array().notNull().default([]),
  createdAt: epochMs("created_at").notNull(),
});

// One row per account that signed up through an invite (see the migration for each status).
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

export type UserRow = typeof users.$inferSelect;
