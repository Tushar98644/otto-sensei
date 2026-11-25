import { and, asc, eq, isNotNull, notInArray } from "drizzle-orm";
import { z } from "zod";
import { ROUTES } from "@/components/site/routes";
import { hasProTools, type PlanId } from "@/config/plans";
import { getDb, type Db, type Tx } from "@/db/client";
import { lockUser } from "@/db/locks";
import { resumes, users, userSettings } from "@/db/schema";
import type { Locale } from "@/i18n/config";
import { fmt } from "@/i18n/format";
import { formatFor } from "@/i18n/intl";
import type { CronContext, CronOutcome } from "@/lib/cron/run";
import { readWorkProfile } from "@/lib/eligibility/records";
import { log } from "@/lib/log";
import { clip, NAME_CHARS } from "@/lib/notifications/follow-up";
import { emailLocale, emailMessages } from "@/lib/notifications/locale";
import { insertNotification } from "@/lib/notifications/records";
import { NOTIFICATION_LIMITS } from "@/lib/notifications/types";
import { appliedTo, defaultResume, firstSeenAfter, jobName } from "@/lib/notifications/weekly-jobs";
import type { Resume } from "@/lib/resume/schema";
import { ResumeSchema } from "@/lib/resume/validation";
import { DAY_MS, HOUR_MS } from "@/lib/time";
import { lookingForOf } from "./looking-for";
import { readStoredCounts, type StoredCounts } from "./match-index";
import { matchProfileOf } from "./profile";
import { rankJobs } from "./rank";
import { JobFiltersSchema, LookingForChoiceSchema } from "./validation";

// A saved search the bell watches: once a day, new jobs that match it ring one note (in-app only).
export const JOB_ALERTS = {
  perAccount: 5,
  nameChars: 80,
  // A little under a day, so tomorrow's run at about the same hour still counts.
  everyMs: 20 * HOUR_MS,
  postedWithinDays: 7,
  named: 2,
  usersPerBatch: 20,
  maxChecksPerRun: 600,
} as const;

// A city is kept, never a point: the person's own location isn't stored.
const AlertFiltersSchema = JobFiltersSchema.refine(
  (filters) => filters.near === null || filters.near.city !== null,
  { message: "Pick a city to get alerts near it." },
);

export const NewJobAlertSchema = z.object({
  name: z.string().trim().min(1).max(JOB_ALERTS.nameChars),
  filters: AlertFiltersSchema,
  choice: LookingForChoiceSchema,
  resumeId: z.string().min(1).max(64).nullable().default(null),
});

const JobAlertSchema = NewJobAlertSchema.extend({
  id: z.uuid(),
  createdAt: z.number().int().nonnegative(),
  checkedAt: z.number().int().nonnegative().nullable(),
  notedAt: z.number().int().nonnegative().nullable(),
});

type JobAlert = z.output<typeof JobAlertSchema>;
export type { JobAlertsResponse } from "./alert-types";

function parseAlerts(raw: unknown): JobAlert[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    const parsed = JobAlertSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

async function storedAlerts(db: Db | Tx, userId: string): Promise<JobAlert[]> {
  const [row] = await db
    .select({ alerts: userSettings.jobAlerts })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  return parseAlerts(row?.alerts);
}

async function writeAlerts(tx: Tx, userId: string, alerts: JobAlert[], now: number) {
  const value = alerts.length > 0 ? alerts : null;
  await tx
    .insert(userSettings)
    .values({ userId, jobAlerts: value, updatedAt: now })
    .onConflictDoUpdate({ target: userSettings.userId, set: { jobAlerts: value, updatedAt: now } });
}

export const listAlerts = (db: Db, userId: string) => storedAlerts(db, userId);

export async function addAlert(
  db: Db,
  userId: string,
  input: z.output<typeof NewJobAlertSchema>,
  now: number,
): Promise<{ kind: "added"; alerts: JobAlert[] } | { kind: "full" } | { kind: "no_user" }> {
  return db.transaction(async (tx) => {
    if (!(await lockUser(tx, userId))) return { kind: "no_user" as const };
    const alerts = await storedAlerts(tx, userId);
    if (alerts.length >= JOB_ALERTS.perAccount) return { kind: "full" as const };
    const next = [
      ...alerts,
      { ...input, id: crypto.randomUUID(), createdAt: now, checkedAt: null, notedAt: null },
    ];
    await writeAlerts(tx, userId, next, now);
    return { kind: "added" as const, alerts: next };
  });
}

export async function removeAlert(
  db: Db,
  userId: string,
  id: string,
  now: number,
): Promise<JobAlert[]> {
  return db.transaction(async (tx) => {
    if (!(await lockUser(tx, userId))) return [];
    const alerts = await storedAlerts(tx, userId);
    const next = alerts.filter((alert) => alert.id !== id);
    if (next.length !== alerts.length) await writeAlerts(tx, userId, next, now);
    return next;
  });
}

type Found = { fresh: number; names: string[] };

export function alertNotice(
  alert: Pick<JobAlert, "name">,
  found: Found,
  locale: Locale,
): { title: string; body: string } {
  const t = emailMessages(locale).jobs;
  const format = formatFor(locale);
  const name = clip(alert.name, NAME_CHARS);
  const more = found.fresh - found.names.length;
  const [first, second] = found.names;
  const body =
    first === undefined
      ? ""
      : more > 0
        ? fmt(t.andMore, { names: found.names.join(", "), count: format.number(more) })
        : second === undefined
          ? fmt(t.single, { name: first })
          : fmt(t.pair, { first, second });
  return {
    title: clip(fmt(format.plural(t.alert, found.fresh), { name }), NOTIFICATION_LIMITS.title),
    body: clip(body, NOTIFICATION_LIMITS.body),
  };
}

async function resumeFor(db: Db, userId: string, id: string | null): Promise<Resume | null> {
  if (id) {
    const [row] = await db
      .select({ data: resumes.data })
      .from(resumes)
      .where(and(eq(resumes.userId, userId), eq(resumes.id, id)))
      .limit(1);
    const parsed = ResumeSchema.safeParse(row?.data);
    if (parsed.success) return parsed.data;
  }
  return defaultResume(db, userId);
}

// New means Otto first read it after the alert last rang, or was made.
async function newFor(
  db: Db,
  userId: string,
  alert: JobAlert,
  locale: Locale,
  now: number,
  counts: StoredCounts | null,
): Promise<Found | null> {
  const resume = await resumeFor(db, userId, alert.resumeId);
  if (!resume) return null;
  const profile = matchProfileOf(resume, Math.floor(now / DAY_MS) * DAY_MS);
  const work = await readWorkProfile(userId);
  const lookingFor = lookingForOf(profile, work.profile, alert.choice);
  const ranked = await rankJobs(db, {
    userId,
    view: "matches",
    profile,
    filters: { ...alert.filters, postedWithin: JOB_ALERTS.postedWithinDays },
    page: 1,
    workProfile: work.profile,
    lookingFor,
    deviceTimeZone: "",
    now,
    cache: false,
    counts,
  });
  const shown = ranked.jobs.filter(
    (job) => !job.closed && !job.match.blocked && !job.saved && /^https?:\/\//.test(job.url),
  );
  const [fresh, applied] = await Promise.all([
    firstSeenAfter(
      db,
      shown.map((job) => job.id),
      alert.notedAt ?? alert.createdAt,
    ),
    appliedTo(db, userId),
  ]);
  const listed = shown.filter((job) => fresh.has(job.id) && !applied(job));
  if (listed.length === 0) return null;
  return {
    fresh: listed.length,
    names: listed.slice(0, JOB_ALERTS.named).map((job) => jobName(job, locale)),
  };
}

const due = (alert: JobAlert, now: number) =>
  alert.checkedAt === null || alert.checkedAt <= now - JOB_ALERTS.everyMs;

// Stamped under the account's lock, and only while the alert is still due, so overlapping runs ring once.
async function settle(
  userId: string,
  id: string,
  found: Found | null,
  locale: Locale,
  now: number,
): Promise<boolean> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    if (!(await lockUser(tx, userId))) return false;
    const alerts = await storedAlerts(tx, userId);
    const alert = alerts.find((item) => item.id === id);
    if (!alert || !due(alert, now)) return false;
    const next = alerts.map((item) =>
      item.id === id ? { ...item, checkedAt: now, notedAt: found ? now : item.notedAt } : item,
    );
    await writeAlerts(tx, userId, next, now);
    if (!found) return false;
    await insertNotification(
      tx,
      {
        userId,
        kind: "job_matches",
        ...alertNotice(alert, found, locale),
        link: ROUTES.dashboardJobs,
      },
      now,
    );
    return true;
  });
}

type Due = { userId: string; plan: PlanId; alerts: unknown; locale: Locale };

export async function runJobAlerts({ now, deadline }: CronContext): Promise<CronOutcome> {
  const stats = { checked: 0, rang: 0, users: 0 };
  const db = await getDb();
  const counts = await readStoredCounts(db);
  const failed = new Set<string>();
  const seen: string[] = [];
  let complete = false;

  while (stats.checked < JOB_ALERTS.maxChecksPerRun) {
    if (Date.now() >= deadline) break;
    const rows: Due[] = await db
      .select({
        userId: users.id,
        plan: users.plan,
        alerts: userSettings.jobAlerts,
        locale: userSettings.locale,
      })
      .from(users)
      .innerJoin(userSettings, eq(userSettings.userId, users.id))
      .where(
        and(
          isNotNull(userSettings.jobAlerts),
          seen.length > 0 ? notInArray(users.id, seen) : undefined,
        ),
      )
      .orderBy(asc(users.id))
      .limit(JOB_ALERTS.usersPerBatch)
      .then((found) => found.map((row) => ({ ...row, locale: emailLocale(row.locale) })));
    if (rows.length === 0) {
      complete = true;
      break;
    }
    for (const row of rows) {
      seen.push(row.userId);
      // Filters, and so alerts, come with Pro; an account back on Free keeps them, quiet.
      if (!hasProTools(row.plan)) continue;
      stats.users += 1;
      for (const alert of parseAlerts(row.alerts)) {
        if (Date.now() >= deadline || stats.checked >= JOB_ALERTS.maxChecksPerRun) break;
        if (!due(alert, now)) continue;
        stats.checked += 1;
        try {
          const found = await newFor(db, row.userId, alert, row.locale, now, counts);
          if (await settle(row.userId, alert.id, found, row.locale, now)) stats.rang += 1;
        } catch (error) {
          log.error("cron.job_alerts.alert_failed", error);
          failed.add("alert");
        }
      }
    }
  }
  return { stats, complete, failed: [...failed] };
}
