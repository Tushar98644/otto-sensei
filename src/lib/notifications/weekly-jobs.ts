import { and, asc, desc, eq, inArray, isNull, lte, notInArray, or, sql } from "drizzle-orm";
import { ROUTES } from "@/components/site/routes";
import { FREE_JOB_MATCHES, hasProTools, type PlanId } from "@/config/plans";
import { getDb, type Db, type Tx } from "@/db/client";
import { lockUser } from "@/db/locks";
import { applications, jobs, notificationSettings, resumes, users } from "@/db/schema";
import { normalizeJobUrl } from "@/lib/applications/schema";
import type { CronContext, CronOutcome } from "@/lib/cron/run";
import { readWorkProfile } from "@/lib/eligibility/records";
import { lookingForOf } from "@/lib/job-feed/looking-for";
import { readStoredCounts, type StoredCounts } from "@/lib/job-feed/match-index";
import { matchProfileOf } from "@/lib/job-feed/profile";
import { rankJobs } from "@/lib/job-feed/rank";
import { DEFAULT_FILTERS, type MatchedJob } from "@/lib/job-feed/types";
import { log } from "@/lib/log";
import type { Resume } from "@/lib/resume/schema";
import { ResumeSchema } from "@/lib/resume/validation";
import { DAY_MS, HOUR_MS } from "@/lib/time";
import { clip, NAME_CHARS } from "./follow-up";
import { insertNotification } from "./records";
import { NOTIFICATION_LIMITS } from "./types";

// Once a week the bell says how many new matches the account's resume has, ranked the way the Jobs tab does them, among jobs posted in the past week.

export const WEEKLY_JOBS = {
  // A little under a week, so next week's run at about the same hour still counts.
  everyMs: 7 * DAY_MS - 6 * HOUR_MS,
  // An account with nothing new is looked at again the next day, never twice in one run.
  recheckMs: 20 * HOUR_MS,
  // The cron runs soon after the daily jobs read (05:40 UTC), so few jobs read since the last note were posted before this.
  postedWithinDays: 7,
  // Jobs named in the bell row; the count covers the rest.
  named: 2,
  usersPerBatch: 20,
  maxChecksPerRun: 300,
} as const;

// jobs_emailed_at keeps its name from the old email: it is when the last weekly note went out.
type Due = { userId: string; plan: PlanId; notedAt: number | null };

type Found = { fresh: number; names: string[]; free: boolean };

type Check = { kind: "found"; found: Found } | { kind: "no_resume" } | { kind: "nothing_new" };

function dueFor(now: number) {
  return and(
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

const hasResume = sql`exists (select 1 from ${resumes} where ${resumes.userId} = ${users.id})`;

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

// New means Otto first read it after the last note: a feed's post date can be older than the day it was read.
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
  // Free counts its closest few, as on the Jobs tab; nothing an earlier note counted comes again.
  const shown = (free ? ranked.jobs.slice(0, FREE_JOB_MATCHES) : ranked.jobs).filter(
    (job) => !job.closed && !job.match.blocked && !job.saved && /^https?:\/\//.test(job.url),
  );
  const [fresh, applied] = await Promise.all([
    firstSeenAfter(
      db,
      shown.map((job) => job.id),
      due.notedAt ?? 0,
    ),
    appliedTo(db, due.userId),
  ]);
  const listed = shown.filter((job) => fresh.has(job.id) && !applied(job));
  if (listed.length === 0) return { kind: "nothing_new" };
  const names = listed.slice(0, WEEKLY_JOBS.named).map((job) => jobName(job));
  return { kind: "found", found: { fresh: listed.length, names, free } };
}

function jobName(job: Pick<MatchedJob, "title" | "company">): string {
  const title = clip(job.title, NAME_CHARS);
  const company = clip(job.company, NAME_CHARS);
  return company ? `${title} at ${company}` : title;
}

export function matchesNotice(found: Found): { title: string; body: string } {
  const { fresh, names, free } = found;
  const more = fresh - names.length;
  const listed =
    names.length === 0
      ? ""
      : more > 0
        ? `${names.join(", ")} and ${more} more.`
        : names.length === 2
          ? `${names[0]} and ${names[1]}.`
          : `${names[0]}.`;
  const tail = free ? " On Free, Jobs shows your closest few." : "";
  return {
    title: `${fresh} new ${fresh === 1 ? "match" : "matches"} this week`,
    body: clip(`${listed}${tail}`.trim(), NOTIFICATION_LIMITS.body),
  };
}

async function settingsRow(tx: Tx, userId: string) {
  const [row] = await tx
    .select({
      notedAt: notificationSettings.jobsEmailedAt,
      checkedAt: notificationSettings.jobsCheckedAt,
    })
    .from(notificationSettings)
    .where(eq(notificationSettings.userId, userId))
    .limit(1);
  return row ?? null;
}

// A new row leaves the follow-up reminder choice unmade, as choosing an email did.
async function markChecked(userId: string, now: number): Promise<void> {
  const db = await getDb();
  await db
    .insert(notificationSettings)
    .values({ userId, remindersChosen: false, jobsCheckedAt: now, updatedAt: now })
    .onConflictDoUpdate({ target: notificationSettings.userId, set: { jobsCheckedAt: now } });
}

// Stamped under the account's lock, and only while still due, so overlapping runs ring once.
async function claim(userId: string, found: Found, now: number): Promise<boolean> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    if (!(await lockUser(tx, userId))) return false;
    const row = await settingsRow(tx, userId);
    const due =
      !row ||
      ((row.notedAt === null || row.notedAt <= now - WEEKLY_JOBS.everyMs) &&
        (row.checkedAt === null || row.checkedAt <= now - WEEKLY_JOBS.recheckMs));
    if (!due) return false;
    await tx
      .insert(notificationSettings)
      .values({
        userId,
        remindersChosen: false,
        jobsEmailedAt: now,
        jobsCheckedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: notificationSettings.userId,
        set: { jobsEmailedAt: now, jobsCheckedAt: now },
      });
    await insertNotification(
      tx,
      { userId, kind: "job_matches", ...matchesNotice(found), link: ROUTES.dashboardJobs },
      now,
    );
    return true;
  });
}

export async function runWeeklyMatches({ now, deadline }: CronContext): Promise<CronOutcome> {
  const stats = { checked: 0, noResume: 0, nothingNew: 0, users: 0 };
  const db = await getDb();
  const counts = await readStoredCounts(db);
  const failed = new Set<string>();
  const skipped: string[] = [];
  let complete = false;

  while (stats.checked < WEEKLY_JOBS.maxChecksPerRun) {
    if (Date.now() >= deadline) break;
    const rows: Due[] = await db
      .select({
        userId: users.id,
        plan: users.plan,
        notedAt: notificationSettings.jobsEmailedAt,
      })
      .from(users)
      .leftJoin(notificationSettings, eq(notificationSettings.userId, users.id))
      .where(
        and(hasResume, dueFor(now), skipped.length > 0 ? notInArray(users.id, skipped) : undefined),
      )
      .orderBy(sql`coalesce(${notificationSettings.jobsCheckedAt}, 0)`, asc(users.id))
      .limit(WEEKLY_JOBS.usersPerBatch);
    if (rows.length === 0) {
      complete = true;
      break;
    }

    for (const due of rows) {
      if (Date.now() >= deadline || stats.checked >= WEEKLY_JOBS.maxChecksPerRun) break;
      try {
        stats.checked += 1;
        const check = await newMatchesFor(db, due, now, counts);
        if (check.kind !== "found") {
          await markChecked(due.userId, now);
          stats[check.kind === "no_resume" ? "noResume" : "nothingNew"] += 1;
          continue;
        }
        if (await claim(due.userId, check.found, now)) stats.users += 1;
        else skipped.push(due.userId);
      } catch (error) {
        log.error("cron.job_matches.user_failed", error);
        failed.add("match");
        skipped.push(due.userId);
      }
    }
  }

  return { stats, complete, failed: [...failed] };
}
