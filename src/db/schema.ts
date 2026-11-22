import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import {
  APPLICATION_STAGES,
  APPLICATION_STATUSES,
  type ApplicationStage,
  type ApplicationStatus,
  type StatusEvent,
} from "@/lib/applications/status";
import { WORK_REGIONS, WORK_RIGHTS } from "@/lib/eligibility/profile";
import type { JobSite } from "@/lib/extension/urls";
import { EMAIL_CHANGES, EMAIL_KINDS, EMAIL_TRUST, type HiringSystem } from "@/lib/inbound/types";
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
import { EMAIL_LOG_KINDS, NOTIFICATION_KINDS } from "@/lib/notifications/types";
import { PORTFOLIO_TEMPLATE_IDS } from "@/lib/portfolio/types";
import type { Recap } from "@/lib/recap/types";
import { REFERRAL_BLOCK_REASONS, REFERRAL_STATUSES } from "@/lib/referrals/referrals";
import type { Resume } from "@/lib/resume/schema";
import { COUNTRY_SOURCES, SETUP_STEP_OUTCOMES } from "@/lib/setup/types";
import { SPELLINGS, WRITING_LENGTHS, WRITING_TONES } from "@/lib/writing-style/schema";
import { WRITING_KINDS } from "@/lib/writings/schema";

// Mirrors supabase/migrations (which own FKs and RLS): change both together.

const epochMs = (name: string) => bigint(name, { mode: "number" });

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    // Not unique: auth.users owns uniqueness, and a stale copy must never block a sign-in.
    email: text("email").notNull(),
    plan: text("plan", { enum: ["free", "pro", "max"] })
      .notNull()
      .default("free"),
    planStatus: text("plan_status"),
    planRenewsAt: epochMs("plan_renews_at"),
    planInterval: text("plan_interval", { enum: ["month", "year"] }),
    trialEndsAt: epochMs("trial_ends_at"),
    planPeriodStartsAt: epochMs("plan_period_starts_at"),
    planPeriodEndsAt: epochMs("plan_period_ends_at"),
    billingCustomerId: text("billing_customer_id"),
    billingSubscriptionId: text("billing_subscription_id"),
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

// One row of settings per account; a column at its default means that setting was never changed.
export const userSettings = pgTable(
  "user_settings",
  {
    userId: uuid("user_id").primaryKey(),
    updatedAt: epochMs("updated_at").notNull(),
    country: text("country").notNull().default(""),
    timeZone: text("time_zone").notNull().default(""),
    workUs: text("work_us", { enum: WORK_RIGHTS }),
    workUk: text("work_uk", { enum: WORK_RIGHTS }),
    workEu: text("work_eu", { enum: WORK_RIGHTS }),
    workCa: text("work_ca", { enum: WORK_RIGHTS }),
    fullTime: boolean("full_time").notNull().default(true),
    contract: boolean("contract").notNull().default(true),
    remoteOnly: boolean("remote_only").notNull().default(false),
    targetTitle: text("target_title"),
    targetFamily: text("target_family", { enum: ROLE_FAMILIES }),
    targetOccupation: text("target_occupation"),
    targetLevel: text("target_level", { enum: SENIORITIES }),
    targetPlace: text("target_place"),
    workUpdatedAt: epochMs("work_updated_at"),
    emailReminders: boolean("email_reminders").notNull().default(false),
    followUpDays: smallint("follow_up_days").notNull().default(7),
    remindersChosen: boolean("reminders_chosen").notNull().default(false),
    reminderPromptSnoozedAt: epochMs("reminder_prompt_snoozed_at"),
    jobsNotedAt: epochMs("jobs_noted_at"),
    jobsCheckedAt: epochMs("jobs_checked_at"),
    jobEmails: boolean("job_emails").notNull().default(false),
    tipEmails: boolean("tip_emails").notNull().default(true),
    viewEmails: boolean("view_emails").notNull().default(false),
    writingTone: text("writing_tone", { enum: WRITING_TONES }).notNull().default("natural"),
    writingLength: text("writing_length", { enum: WRITING_LENGTHS }).notNull().default("standard"),
    writingSpelling: text("writing_spelling", { enum: SPELLINGS }).notNull().default("us"),
    writingSignOff: text("writing_sign_off").notNull().default(""),
    writingNotes: text("writing_notes").notNull().default(""),
    writingUpdatedAt: epochMs("writing_updated_at"),
    setupStepAt: epochMs("setup_step_at"),
    setupStepOutcome: text("setup_step_outcome", { enum: SETUP_STEP_OUTCOMES }),
    checklistHiddenAt: epochMs("checklist_hidden_at"),
    setupDefaultsAt: epochMs("setup_defaults_at"),
    setupLookingForAt: epochMs("setup_looking_for_at"),
    countryGuess: text("country_guess"),
    countryGuessFrom: text("country_guess_from", { enum: COUNTRY_SOURCES }),
    regionGuess: text("region_guess", { enum: WORK_REGIONS }),
    careerCheckins: boolean("career_checkins").notNull().default(false),
    careerEmails: boolean("career_emails").notNull().default(true),
    careerWeek: smallint("career_week").notNull().default(1),
    careerWeekday: smallint("career_weekday").notNull().default(1),
    careerTimeZone: text("career_time_zone").notNull().default("UTC"),
    careerNextOn: date("career_next_on", { mode: "string" }),
    careerPausedUntil: date("career_paused_until", { mode: "string" }),
    careerJobRole: text("career_job_role").notNull().default(""),
    careerJobCompany: text("career_job_company").notNull().default(""),
    careerLastMonth: text("career_last_month"),
    careerLastAt: epochMs("career_last_at"),
    careerEmailedMonth: text("career_emailed_month"),
    careerEmailedAt: epochMs("career_emailed_at"),
    careerPromptClosedAt: epochMs("career_prompt_closed_at"),
    careerPromptSnoozedAt: epochMs("career_prompt_snoozed_at"),
    applyAnswers: jsonb("apply_answers").$type<Record<string, unknown>>(),
    applyAnswersAt: epochMs("apply_answers_at"),
    activeOn: date("active_on", { mode: "string" }),
  },
  (t) => [
    index("user_settings_career_due_idx")
      .on(t.careerNextOn)
      .where(sql`career_checkins`),
    index("user_settings_career_emailed_idx")
      .on(t.careerEmailedAt)
      .where(sql`career_emailed_at is not null`),
  ],
);

export const usage = pgTable(
  "usage",
  {
    subject: uuid("subject").notNull(),
    feature: text("feature").notNull(),
    period: text("period").notNull(),
    count: integer("count").notNull().default(0),
    bonus: integer("bonus").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.subject, t.feature, t.period] })],
);

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

export const usagePasses = pgTable(
  "usage_passes",
  {
    userId: uuid("user_id").notNull(),
    feature: text("feature").notNull(),
    subject: text("subject").notNull(),
    usesLeft: integer("uses_left").notNull(),
    expiresAt: epochMs("expires_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.feature, t.subject] }),
    index("usage_passes_expires_idx").on(t.expiresAt),
  ],
);

export const meteredResults = pgTable(
  "metered_results",
  {
    userId: uuid("user_id").notNull(),
    requestKey: text("request_key").notNull(),
    result: jsonb("result"),
    demo: boolean("demo").notNull().default(false),
    startedAt: epochMs("started_at").notNull(),
    expiresAt: epochMs("expires_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.requestKey] }),
    index("metered_results_expires_idx").on(t.expiresAt),
  ],
);

export const resumes = pgTable(
  "resumes",
  {
    userId: uuid("user_id").notNull(),
    id: text("id").notNull(),
    data: jsonb("data").$type<Resume>().notNull(),
    createdAt: epochMs("created_at").notNull(),
    updatedAt: epochMs("updated_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.id] })],
);

export const resumeTombstones = pgTable(
  "resume_tombstones",
  {
    userId: uuid("user_id").notNull(),
    id: text("id").notNull(),
    deletedAt: epochMs("deleted_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.id] }),
    index("resume_tombstones_user_deleted_idx").on(t.userId, t.deletedAt, t.id),
  ],
);

export const billingEvents = pgTable("billing_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  receivedAt: epochMs("received_at").notNull(),
});

export const trialReplacements = pgTable("trial_replacements", {
  replacedSubscriptionId: text("replaced_subscription_id").primaryKey(),
  subscriptionId: text("subscription_id").notNull(),
  userId: uuid("user_id").notNull(),
  attempts: integer("attempts").notNull().default(0),
  createdAt: epochMs("created_at").notNull(),
  cancelledAt: epochMs("cancelled_at"),
});

// Not tied to users: one trial per email hash must outlive a deleted account.
export const trialHistory = pgTable("trial_history", {
  emailHash: text("email_hash").primaryKey(),
  kind: text("kind", { enum: ["trial", "paid"] }).notNull(),
  createdAt: epochMs("created_at").notNull(),
});

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
    prep: jsonb("prep").$type<InterviewPrep>(),
    remindedAt: epochMs("reminded_at"),
    followUpAt: epochMs("follow_up_at"),
    jobId: uuid("job_id"),
    statusHistory: jsonb("status_history").$type<StatusEvent[]>().notNull().default([]),
    interviewAt: epochMs("interview_at"),
    // The interview day last reminded, so a moved interview is reminded again.
    interviewRemindedFor: epochMs("interview_reminded_for"),
    // Minutes after midnight in interviewZone; null is a day with no time set.
    interviewTime: smallint("interview_time"),
    interviewZone: text("interview_zone"),
    interviewBriefedFor: epochMs("interview_briefed_for"),
    interviewAskedFor: epochMs("interview_asked_for"),
    interviewAnsweredFor: epochMs("interview_answered_for"),
    createdAt: epochMs("created_at").notNull(),
    updatedAt: epochMs("updated_at").notNull(),
  },
  (t) => [index("applications_user_applied_idx").on(t.userId, t.appliedAt, t.id)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id").notNull(),
    kind: text("kind", { enum: NOTIFICATION_KINDS }).notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    link: text("link"),
    applicationId: uuid("application_id"),
    readAt: epochMs("read_at"),
    createdAt: epochMs("created_at").notNull(),
  },
  (t) => [
    index("notifications_user_created_idx").on(t.userId, t.createdAt, t.id),
    index("notifications_created_idx").on(t.createdAt),
  ],
);

export const trialReminders = pgTable(
  "trial_reminders",
  {
    userId: uuid("user_id").notNull(),
    trialEndsAt: epochMs("trial_ends_at").notNull(),
    createdAt: epochMs("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.trialEndsAt] })],
);

export const emailLog = pgTable(
  "email_log",
  {
    userId: uuid("user_id").notNull(),
    kind: text("kind", { enum: EMAIL_LOG_KINDS }).notNull(),
    occasion: text("occasion").notNull(),
    createdAt: epochMs("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.kind, t.occasion] })],
);

export const shares = pgTable(
  "shares",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id").notNull(),
    resumeId: text("resume_id").notNull(),
    slug: text("slug").notNull().unique(),
    snapshot: jsonb("snapshot").$type<Resume>(),
    showContact: boolean("show_contact").notNull().default(false),
    allowIndexing: boolean("allow_indexing").notNull().default(false),
    views: integer("views").notNull().default(0),
    lastViewedAt: epochMs("last_viewed_at"),
    viewAlertedAt: epochMs("view_alerted_at"),
    createdAt: epochMs("created_at").notNull(),
    updatedAt: epochMs("updated_at").notNull(),
    revokedAt: epochMs("revoked_at"),
  },
  (t) => [index("shares_user_created_idx").on(t.userId, t.createdAt, t.id)],
);

export const feedback = pgTable("feedback", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id"),
  kind: text("kind", { enum: FEEDBACK_KINDS }).notNull(),
  message: text("message").notNull(),
  pagePath: text("page_path"),
  createdAt: epochMs("created_at").notNull(),
});

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

const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });

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

export const jobSkills = pgTable("job_skills", {
  skill: text("skill").primaryKey(),
  openJobs: integer("open_jobs").notNull(),
  weight: real("weight").notNull(),
  updatedAt: epochMs("updated_at").notNull(),
});

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

export const companyVisa = pgTable("company_visa", {
  companyKey: text("company_key").primaryKey(),
  ukName: text("uk_name"),
  h1bYear: smallint("h1b_year"),
  h1bApprovals: integer("h1b_approvals"),
  usName: text("us_name"),
  checkedAt: epochMs("checked_at").notNull(),
});

// Never holds the resume or contact details.
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

export const portfolios = pgTable("portfolios", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull().unique(),
  resumeId: text("resume_id").notNull(),
  slug: text("slug").notNull().unique(),
  template: text("template", { enum: PORTFOLIO_TEMPLATE_IDS }).notNull().default("navy"),
  snapshot: jsonb("snapshot").$type<Resume>().notNull(),
  showEmail: boolean("show_email").notNull().default(false),
  showPhone: boolean("show_phone").notNull().default(false),
  hiddenSections: text("hidden_sections").array().notNull().default([]),
  sync: boolean("sync").notNull().default(true),
  published: boolean("published").notNull().default(false),
  allowIndexing: boolean("allow_indexing").notNull().default(false),
  content: jsonb("content").$type<Record<string, unknown>>().notNull().default({}),
  github: jsonb("github").$type<Record<string, unknown>>(),
  githubCheckedAt: epochMs("github_checked_at"),
  views: integer("views").notNull().default(0),
  viewsNoted: integer("views_noted").notNull().default(0),
  viewsNotedAt: epochMs("views_noted_at"),
  createdAt: epochMs("created_at").notNull(),
  updatedAt: epochMs("updated_at").notNull(),
  publishedAt: epochMs("published_at"),
});

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
    subject: text("subject").notNull().default(""),
    note: text("note").notNull().default(""),
    jobId: uuid("job_id"),
    warnings: jsonb("warnings").$type<string[]>().notNull().default([]),
    demo: boolean("demo").notNull().default(false),
    applicationId: uuid("application_id"),
    createdAt: epochMs("created_at").notNull(),
    updatedAt: epochMs("updated_at").notNull(),
  },
  (t) => [index("writings_user_created_idx").on(t.userId, t.createdAt, t.id)],
);

export const extensionTokens = pgTable(
  "extension_tokens",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    scope: text("scope", { enum: ["extension"] })
      .notNull()
      .default("extension"),
    createdAt: epochMs("created_at").notNull(),
    lastUsedAt: epochMs("last_used_at").notNull(),
    expiresAt: epochMs("expires_at").notNull(),
  },
  (t) => [
    index("extension_tokens_user_idx").on(t.userId, t.createdAt),
    index("extension_tokens_expires_idx").on(t.expiresAt),
  ],
);

// One private calendar link per account: only the token's hash is kept.
export const calendarFeeds = pgTable("calendar_feeds", {
  userId: uuid("user_id").primaryKey(),
  feedId: uuid("feed_id").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  createdAt: epochMs("created_at").notNull(),
});

// Each day, in the person's own time zone, they opened an app page: the recap's days active.
export const activeDays = pgTable(
  "active_days",
  {
    userId: uuid("user_id").notNull(),
    day: date("day", { mode: "string" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] }), index("active_days_day_idx").on(t.day)],
);

export const weeklyRecaps = pgTable(
  "weekly_recaps",
  {
    userId: uuid("user_id").notNull(),
    weekStart: date("week_start", { mode: "string" }).notNull(),
    data: jsonb("data").$type<Recap>().notNull(),
    builtAt: epochMs("built_at").notNull(),
    seenAt: epochMs("seen_at"),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.weekStart] }),
    index("weekly_recaps_week_idx").on(t.weekStart),
  ],
);

export const savedPosts = pgTable(
  "saved_posts",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id").notNull(),
    url: text("url").notNull(),
    urlKey: text("url_key").notNull(),
    site: text("site").$type<JobSite>().notNull().default("other"),
    title: text("title").notNull().default(""),
    company: text("company").notNull().default(""),
    location: text("location").notNull().default(""),
    post: text("post").notNull().default(""),
    savedAt: epochMs("saved_at").notNull(),
    updatedAt: epochMs("updated_at").notNull(),
  },
  (t) => [
    unique("saved_posts_user_id_url_key_key").on(t.userId, t.urlKey),
    index("saved_posts_user_saved_idx").on(t.userId, t.savedAt),
  ],
);

export const inboundHandles = pgTable(
  "inbound_handles",
  {
    handle: text("handle").primaryKey(),
    // Null once the account is deleted: the handle stays held from everyone else.
    userId: uuid("user_id"),
    createdAt: epochMs("created_at").notNull(),
    retiredAt: epochMs("retired_at"),
    routesUntil: epochMs("routes_until"),
  },
  (t) => [index("inbound_handles_user_idx").on(t.userId)],
);

export const inboundAddresses = pgTable("inbound_addresses", {
  userId: uuid("user_id").primaryKey(),
  createdAt: epochMs("created_at").notNull(),
  confirmCode: text("confirm_code"),
  confirmUrl: text("confirm_url"),
  confirmSource: text("confirm_source"),
  confirmAt: epochMs("confirm_at"),
  confirmedAt: epochMs("confirmed_at"),
  sources: text("sources").array().notNull().default([]),
  testAt: epochMs("test_at"),
  lastEmailAt: epochMs("last_email_at"),
});

export type CardBefore = {
  status: ApplicationStatus;
  stageReached: ApplicationStage;
  statusChangedAt: number;
  statusHistory: StatusEvent[];
  followUpAt: number | null;
  interviewAt: number | null;
  // Missing from snapshots taken before emails kept a time.
  interviewTime?: number | null;
  interviewZone?: string | null;
};

export const inboundEmails = pgTable(
  "inbound_emails",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id").notNull(),
    messageKey: text("message_key").notNull(),
    sender: text("sender").notNull().default(""),
    subject: text("subject").notNull().default(""),
    kind: text("kind", { enum: EMAIL_KINDS }).notNull(),
    system: text("system").$type<HiringSystem>(),
    company: text("company").notNull().default(""),
    role: text("role").notNull().default(""),
    jobUrl: text("job_url").notNull().default(""),
    sentAt: epochMs("sent_at"),
    eventAt: epochMs("event_at"),
    // Minutes after midnight in eventZone; null is a day with no time.
    eventTime: smallint("event_time"),
    eventZone: text("event_zone"),
    eventText: text("event_text").notNull().default(""),
    trust: text("trust", { enum: EMAIL_TRUST }),
    applicationId: uuid("application_id"),
    change: text("change", { enum: EMAIL_CHANGES }).notNull().default("none"),
    fromStatus: text("from_status", { enum: APPLICATION_STATUSES }),
    toStatus: text("to_status", { enum: APPLICATION_STATUSES }),
    before: jsonb("before").$type<CardBefore>(),
    changedAt: epochMs("changed_at"),
    receivedAt: epochMs("received_at").notNull(),
    undoneAt: epochMs("undone_at"),
    dismissedAt: epochMs("dismissed_at"),
  },
  (t) => [
    unique("inbound_emails_user_id_message_key_key").on(t.userId, t.messageKey),
    index("inbound_emails_user_received_idx").on(t.userId, t.receivedAt),
    index("inbound_emails_received_idx").on(t.receivedAt),
  ],
);

// The career log (src/lib/career-log): one note per month, text only.
export const careerLogEntries = pgTable(
  "career_log_entries",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id").notNull(),
    month: text("month").notNull(),
    shipped: text("shipped").notNull().default(""),
    numbers: text("numbers").notNull().default(""),
    learned: text("learned").notNull().default(""),
    nothingNew: boolean("nothing_new").notNull().default(false),
    createdAt: epochMs("created_at").notNull(),
    updatedAt: epochMs("updated_at").notNull(),
  },
  (t) => [unique("career_log_entries_user_id_month_key").on(t.userId, t.month)],
);

export type UserRow = typeof users.$inferSelect;
