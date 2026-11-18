import { createHash } from "node:crypto";
import { and, asc, desc, eq, inArray, isNull, lte, notInArray, or, sql } from "drizzle-orm";
import { accountSectionHref } from "@/components/setup/links";
import { ROUTES } from "@/components/site/routes";
import { FREE_JOB_MATCHES, hasProTools, type PlanId } from "@/config/plans";
import { getDb, type Db } from "@/db/client";
import { lockUser } from "@/db/locks";
import { applications, jobs, notificationSettings, resumes, users } from "@/db/schema";
import { normalizeJobUrl } from "@/lib/applications/schema";
import type { CronContext, CronOutcome } from "@/lib/cron/run";
import { readWorkProfile } from "@/lib/eligibility/records";
import { appUrl } from "@/lib/env";
import { lookingForOf } from "@/lib/job-feed/looking-for";
import { readStoredCounts, type StoredCounts } from "@/lib/job-feed/match-index";
import { matchProfileOf } from "@/lib/job-feed/profile";
import { rankJobs } from "@/lib/job-feed/rank";
import { DEFAULT_FILTERS, type MatchedJob } from "@/lib/job-feed/types";
import { log } from "@/lib/log";
import type { Resume } from "@/lib/resume/schema";
import { ResumeSchema } from "@/lib/resume/validation";
import { DAY_MS, HOUR_MS } from "@/lib/time";
import { optionalEmailRoom } from "./budget";
import { EMAIL_BATCH_MAX, type EmailMessage, type EmailSender } from "./email";
import { OTTO_HEAD_EMAIL_PATH } from "./follow-up";
import { unsubscribeUrl } from "./unsubscribe";
import { weeklyJobsEmail, type DigestJob } from "./weekly-jobs-email";

// Ranks each opted-in account's resume the way the Jobs tab does, limited to jobs posted in the past week.

export const WEEKLY_JOBS = {
  // A little under a week, so next week's run at about the same hour still counts.
  everyMs: 7 * DAY_MS - 6 * HOUR_MS,
  // An account with nothing new is looked at again the next day, never twice in one run.
  recheckMs: 20 * HOUR_MS,
  // The cron runs soon after the daily jobs read (05:40 UTC), so few jobs read since the last email were posted before this.
  postedWithinDays: 7,
  listed: 5,
  usersPerBatch: 20,
  maxChecksPerRun: 300,
} as const;

type WeeklyJobsDeps = { sender: EmailSender | null };

type Due = { userId: string; plan: PlanId; emailedAt: number | null };

type Found = { found: number; jobs: DigestJob[]; free: boolean };

type Check = { kind: "found"; found: Found } | { kind: "no_resume" } | { kind: "nothing_new" };

type Claimed = Found & { userId: string; email: string; emailedAt: number | null };

function dueFor(now: number) {
  return and(
    eq(notificationSettings.jobEmails, true),
    or(
      isNull(notificationSettings.jobsEmailedAt),
      lte(notificationSettings.jobsEmailedAt, now - WEEKLY_JOBS.everyMs),
    ),
    or(
      isNull(notificationSettings.jobsCheckedAt),
      lte(notificationSettings.jobsCheckedAt, now - WEEKLY_JOBS.recheckMs),
    ),
  );
}

// The Jobs tab's default: the newest resume that isn't a tailored copy, else the newest.
async function defaultResume(db: Db, userId: string): Promise<Resume | null> {
  const [pick] = await db
    .select({ id: resumes.id })
    .from(resumes)
    .where(eq(resumes.userId, userId))
    .orderBy(
      sql`coalesce(jsonb_typeof(${resumes.data} -> 'tailor') = 'object', false)`,
      desc(resumes.updatedAt),
    )
    .limit(1);
  if (!pick) return null;
  const [row] = await db
    .select({ data: resumes.data })
    .from(resumes)
    .where(and(eq(resumes.userId, userId), eq(resumes.id, pick.id)))
    .limit(1);
  const parsed = ResumeSchema.safeParse(row?.data);
  return parsed.success ? parsed.data : null;
}

function toDigestJob(job: MatchedJob): DigestJob {
  const { title, company, location, remote, source, url } = job;
  return { title, company, location, remote, source, url };
}

// New means Otto first read it after the last email: a feed's post date can be older than the day it was read.
async function firstSeenAfter(db: Db, ids: string[], since: number): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await db
    .select({ id: jobs.id, firstSeenAt: jobs.firstSeenAt })
    .from(jobs)
    .where(inArray(jobs.id, ids));
  return new Set(rows.filter((row) => row.firstSeenAt > since).map((row) => row.id));
}

// Jobs the account already logged an application for, by job or by link, as the Jobs tab marks them.
async function appliedTo(db: Db, userId: string): Promise<(job: MatchedJob) => boolean> {
  const rows = await db
    .select({ jobId: applications.jobId, jobUrl: applications.jobUrl })
    .from(applications)
    .where(eq(applications.userId, userId));
  const ids = new Set(rows.map((row) => row.jobId).filter((id) => id !== null));
  const urls = new Set(rows.map((row) => normalizeJobUrl(row.jobUrl)).filter(Boolean));
  return (job) => ids.has(job.id) || urls.has(normalizeJobUrl(job.url));
}

async function newMatchesFor(
  db: Db,
  due: Due,
  now: number,
  counts: StoredCounts | null,
): Promise<Check> {
  const resume = await defaultResume(db, due.userId);
  if (!resume) return { kind: "no_resume" };
  const profile = matchProfileOf(resume, Math.floor(now / DAY_MS) * DAY_MS);
  const work = await readWorkProfile(due.userId);
  const free = !hasProTools(due.plan);
  const lookingFor = lookingForOf(profile, work.profile, work.lookingFor);
  const ranked = await rankJobs(db, {
    userId: due.userId,
    view: "matches",
    profile,
    filters: {
      ...DEFAULT_FILTERS,
      remote: lookingFor.remote,
      postedWithin: WEEKLY_JOBS.postedWithinDays,
    },
    page: 1,
    workProfile: free ? null : work.profile,
    lookingFor,
    deviceTimeZone: "",
    now,
    free,
    cache: false,
    counts,
  });
  // Free sees its closest few, as on the Jobs tab; nothing an earlier email listed comes again.
  const shown = (free ? ranked.jobs.slice(0, FREE_JOB_MATCHES) : ranked.jobs).filter(
    (job) => !job.closed && !job.match.blocked && !job.saved && /^https?:\/\//.test(job.url),
  );
  const [fresh, applied] = await Promise.all([
    firstSeenAfter(
      db,
      shown.map((job) => job.id),
      due.emailedAt ?? 0,
    ),
    appliedTo(db, due.userId),
  ]);
  const listed = shown
    .filter((job) => fresh.has(job.id) && !applied(job))
    .slice(0, WEEKLY_JOBS.listed);
  if (listed.length === 0) return { kind: "nothing_new" };
  return { kind: "found", found: { found: ranked.matching, jobs: listed.map(toDigestJob), free } };
}

async function markChecked(userId: string, now: number): Promise<void> {
  const db = await getDb();
  await db
    .update(notificationSettings)
    .set({ jobsCheckedAt: now })
    .where(eq(notificationSettings.userId, userId));
}

// Stamped under the account's lock, and only while still due, so overlapping runs send it once.
async function claim(
  { userId, emailedAt }: Due,
  found: Found,
  now: number,
): Promise<Claimed | null> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    if (!(await lockUser(tx, userId))) return null;
    const stamped = await tx
      .update(notificationSettings)
      .set({ jobsEmailedAt: now, jobsCheckedAt: now })
      .where(and(eq(notificationSettings.userId, userId), dueFor(now)))
      .returning({ userId: notificationSettings.userId });
    if (stamped.length === 0) return null;
    const [owner] = await tx
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return owner ? { ...found, userId, email: owner.email, emailedAt } : null;
  });
}

// Resend took none of the batch: each account gets its last email date back and is looked at again tomorrow.
async function release(batch: readonly Claimed[], now: number): Promise<void> {
  const db = await getDb();
  for (const item of batch) {
    await db
      .update(notificationSettings)
      .set({ jobsEmailedAt: item.emailedAt })
      .where(
        and(
          eq(notificationSettings.userId, item.userId),
          eq(notificationSettings.jobsEmailedAt, now),
        ),
      );
  }
}

function emailFor(item: Claimed): EmailMessage {
  const base = appUrl();
  const at = (path: string) => new URL(path, base).toString();
  return weeklyJobsEmail({
    to: item.email,
    found: item.found,
    jobs: item.jobs,
    free: item.free,
    jobsUrl: at(ROUTES.dashboardJobs),
    links: {
      ottoHeadUrl: at(OTTO_HEAD_EMAIL_PATH),
      settingsUrl: at(accountSectionHref("reminders")),
      unsubscribeUrl: unsubscribeUrl(item.userId, "jobs"),
    },
  });
}

function batchKey(claimed: readonly Claimed[], now: number): string {
  const ids = claimed
    .map((item) => item.userId)
    .sort()
    .join(",");
  return `weekly-jobs-${createHash("sha256").update(`${now}:${ids}`).digest("hex").slice(0, 40)}`;
}

export async function runWeeklyJobEmails(
  { now, deadline }: CronContext,
  { sender }: WeeklyJobsDeps,
): Promise<CronOutcome> {
  const stats = {
    checked: 0,
    noResume: 0,
    nothingNew: 0,
    users: 0,
    emailsSent: 0,
    emailsFailed: 0,
    emailsSkipped: 0,
    released: 0,
  };
  // Nothing is stamped without a way to send it, so opting in still works once email is set up.
  if (!sender) return { stats: { ...stats, emailOff: 1 }, complete: true, failed: [] };
  const db = await getDb();
  const counts = await readStoredCounts(db);
  const failed = new Set<string>();
  const skipped: string[] = [];
  const cap = await optionalEmailRoom("jobs", now);
  let complete = false;
  let refused = false;

  while (stats.users < cap && stats.checked < WEEKLY_JOBS.maxChecksPerRun && !refused) {
    if (Date.now() >= deadline) break;
    const rows: Due[] = await db
      .select({
        userId: notificationSettings.userId,
        plan: users.plan,
        emailedAt: notificationSettings.jobsEmailedAt,
      })
      .from(notificationSettings)
      .innerJoin(users, eq(users.id, notificationSettings.userId))
      .where(
        and(
          dueFor(now),
          skipped.length > 0 ? notInArray(notificationSettings.userId, skipped) : undefined,
        ),
      )
      .orderBy(
        sql`coalesce(${notificationSettings.jobsCheckedAt}, 0)`,
        asc(notificationSettings.userId),
      )
      .limit(WEEKLY_JOBS.usersPerBatch);
    if (rows.length === 0) {
      complete = true;
      break;
    }

    const claimed: Claimed[] = [];
    for (const due of rows) {
      if (Date.now() >= deadline || stats.users >= cap) break;
      try {
        stats.checked += 1;
        const check = await newMatchesFor(db, due, now, counts);
        if (check.kind !== "found") {
          await markChecked(due.userId, now);
          stats[check.kind === "no_resume" ? "noResume" : "nothingNew"] += 1;
          continue;
        }
        const result = await claim(due, check.found, now);
        if (!result) {
          skipped.push(due.userId);
          continue;
        }
        stats.users += 1;
        if (result.email) claimed.push(result);
        else stats.emailsSkipped += 1;
      } catch (error) {
        log.error("cron.job_emails.user_failed", error);
        failed.add("match");
        skipped.push(due.userId);
      }
    }

    for (let start = 0; start < claimed.length; start += EMAIL_BATCH_MAX) {
      const batch = claimed.slice(start, start + EMAIL_BATCH_MAX);
      try {
        const result = await sender.sendBatch(batch.map(emailFor), batchKey(batch, now));
        stats.emailsSent += result.sent;
        stats.emailsFailed += result.failed;
        if (result.refused) {
          refused = true;
          await release(batch, now);
          stats.released += batch.length;
        }
      } catch (error) {
        log.error("cron.job_emails.email_failed", error, { messages: batch.length });
        stats.emailsFailed += batch.length;
      }
    }
  }

  return { stats, complete, failed: [...failed] };
}
