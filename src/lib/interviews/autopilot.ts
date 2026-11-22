import { createHash } from "node:crypto";
import { and, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { accountSectionHref } from "@/components/setup/links";
import { ROUTES } from "@/components/site/routes";
import { hasProTools } from "@/config/plans";
import { getDb, type Tx } from "@/db/client";
import { lockUser } from "@/db/locks";
import { applications, notificationSettings, users, workProfiles } from "@/db/schema";
import { emailLink } from "@/lib/analytics/landing";
import { AFTER_INTERVIEW_BUSINESS_DAYS } from "@/lib/applications/follow-up";
import { applicationHref } from "@/lib/applications/thread";
import { prepPath } from "@/lib/calendar/feed";
import {
  addBusinessDays,
  dayKey,
  interviewStart,
  minutesIntoDay,
  wallTime,
  zonedInstant,
  zoneOrUtc,
} from "@/lib/calendar/zones";
import type { CronContext, CronOutcome } from "@/lib/cron/run";
import { appUrl } from "@/lib/env";
import { readPrep, type InterviewPrep } from "@/lib/insights/prep";
import { log } from "@/lib/log";
import { optionalEmailRoom } from "@/lib/notifications/budget";
import { EMAIL_BATCH_MAX, type EmailMessage, type EmailSender } from "@/lib/notifications/email";
import { clip, NAME_CHARS, OTTO_HEAD_EMAIL_PATH } from "@/lib/notifications/follow-up";
import { interviewPrepPath, thankYouWritePath } from "@/lib/notifications/links";
import { insertNotification } from "@/lib/notifications/records";
import { NOTIFICATION_LIMITS } from "@/lib/notifications/types";
import { unsubscribeUrl } from "@/lib/notifications/unsubscribe";
import { DAY_MS, HOUR_MS } from "@/lib/time";
import { briefEmail, type AskItem, type BriefItem } from "./brief-email";

// Runs hourly: the morning brief on an interview's day, and "How did it go?" the morning after. Stamping each interview day is the idempotency.

export const AUTOPILOT = {
  // About 7:00 on the person's own clock.
  morningMinutes: 7 * 60,
  // A timed interview before 9:00 gets its brief two hours ahead instead.
  leadMs: 2 * HOUR_MS,
  // A day with no time set: a run that missed the morning still sends it until noon.
  dayBriefUntilMinutes: 12 * 60,
  // Older interviews are never asked about, so a day logged long after doesn't ring the bell.
  askWithinMs: 7 * DAY_MS,
  maxCandidates: 2_000,
} as const;

export type Candidate = {
  id: string;
  userId: string;
  interviewAt: number;
  interviewTime: number | null;
  interviewZone: string | null;
  briefedFor: number | null;
  askedFor: number | null;
  profileZone: string | null;
  briefsOn: boolean;
};

// A typed time keeps the zone it was typed in; a day alone reads in the account's zone.
export function zoneFor(
  candidate: Pick<Candidate, "interviewTime" | "interviewZone" | "profileZone">,
): string {
  if (candidate.interviewTime !== null && candidate.interviewZone)
    return zoneOrUtc(candidate.interviewZone);
  return zoneOrUtc(candidate.profileZone);
}

export function briefDue(candidate: Candidate, now: number): boolean {
  if (!candidate.briefsOn || candidate.briefedFor === candidate.interviewAt) return false;
  const zone = zoneFor(candidate);
  if (dayKey(candidate.interviewAt, zone) !== dayKey(now, zone)) return false;
  const start = interviewStart(candidate.interviewAt, candidate.interviewTime, zone);
  const minutes = minutesIntoDay(now, zone);
  if (start !== null) {
    return now < start && (minutes >= AUTOPILOT.morningMinutes || now >= start - AUTOPILOT.leadMs);
  }
  return minutes >= AUTOPILOT.morningMinutes && minutes < AUTOPILOT.dayBriefUntilMinutes;
}

// The morning after, or later the same week when a run missed it.
export function askDue(candidate: Candidate, now: number): boolean {
  if (candidate.askedFor === candidate.interviewAt) return false;
  if (now - candidate.interviewAt > AUTOPILOT.askWithinMs) return false;
  const zone = zoneFor(candidate);
  const day = dayKey(candidate.interviewAt, zone);
  if (day >= dayKey(now, zone)) return false;
  if (day < dayKey(now - DAY_MS, zone)) return true;
  return minutesIntoDay(now, zone) >= AUTOPILOT.morningMinutes;
}

// Five business days after the interview's own day, from the start of that day.
export function followUpAfter(interviewAt: number, zone: string): number {
  const { year, month, day } = wallTime(interviewAt, zone);
  const due = addBusinessDays(
    { year, month, day, hour: 0, minute: 0 },
    AFTER_INTERVIEW_BUSINESS_DAYS,
  );
  return zonedInstant(due, zone);
}

const DAY_FORMATS = new Map<string, Intl.DateTimeFormat>();

export function shortDay(at: number, zone: string): string {
  let format = DAY_FORMATS.get(zone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: zone,
    });
    DAY_FORMATS.set(zone, format);
  }
  return format.format(at);
}

export function clockTime(at: number, zone: string, profileZone: string | null): string {
  const showZone = zoneOrUtc(profileZone) !== zone;
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: zone,
    ...(showZone ? { timeZoneName: "short" as const } : {}),
  }).format(at);
}

export function askedWhen(interviewAt: number, now: number, zone: string): string {
  if (dayKey(interviewAt, zone) === dayKey(now - DAY_MS, zone)) return "yesterday";
  return `on ${new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: zone }).format(interviewAt)}`;
}

export type AfterNotice = { title: string; body: string; link: string; applicationId: string };

export function afterInterviewNotice(
  item: { id: string; company: string },
  followUpDay: string | null,
): AfterNotice {
  const company = clip(item.company, NAME_CHARS);
  const title = company
    ? `How did your interview with ${company} go?`
    : "How did your interview go?";
  const remind = followUpDay
    ? ` I'll remind you to follow up on ${followUpDay} unless you hear back.`
    : "";
  return {
    title: clip(title, NOTIFICATION_LIMITS.title),
    body: clip(
      `Tell me in one tap. A thank-you sent today helps.${remind}`,
      NOTIFICATION_LIMITS.body,
    ),
    link: applicationHref(item.id),
    applicationId: item.id,
  };
}

type ClaimedRow = {
  id: string;
  company: string;
  role: string;
  interviewAt: number;
  interviewTime: number | null;
  zone: string;
  prep: InterviewPrep | null;
  briefedBefore: number | null;
  followUpAt: number | null;
};

type Claimed = {
  userId: string;
  email: string;
  canWrite: boolean;
  profileZone: string | null;
  briefs: ClaimedRow[];
  asks: ClaimedRow[];
  emailed: boolean;
};

async function candidates(now: number): Promise<Candidate[]> {
  const db = await getDb();
  const briefsOn = sql<boolean>`coalesce(${notificationSettings.interviewBriefs}, false)`;
  const rows = await db
    .select({
      id: applications.id,
      userId: applications.userId,
      interviewAt: applications.interviewAt,
      interviewTime: applications.interviewTime,
      interviewZone: applications.interviewZone,
      briefedFor: applications.interviewBriefedFor,
      askedFor: applications.interviewAskedFor,
      profileZone: workProfiles.timeZone,
      briefsOn,
    })
    .from(applications)
    .leftJoin(workProfiles, eq(workProfiles.userId, applications.userId))
    .leftJoin(notificationSettings, eq(notificationSettings.userId, applications.userId))
    .where(
      and(
        // Written out so the planner can use the partial index on interviews.
        sql`${applications.status} = 'interview'`,
        sql`${applications.interviewAt} is not null`,
        gte(applications.interviewAt, now - AUTOPILOT.askWithinMs - DAY_MS),
        lte(applications.interviewAt, now + 2 * DAY_MS),
        or(
          sql`${applications.interviewAskedFor} is distinct from ${applications.interviewAt}`,
          and(
            sql`${applications.interviewBriefedFor} is distinct from ${applications.interviewAt}`,
            briefsOn,
          ),
        ),
      ),
    )
    .orderBy(applications.userId, applications.interviewAt)
    .limit(AUTOPILOT.maxCandidates);
  return rows.flatMap((row) =>
    row.interviewAt === null
      ? []
      : [
          {
            ...row,
            interviewAt: row.interviewAt,
            profileZone: row.profileZone || null,
            briefsOn: Boolean(row.briefsOn),
          },
        ],
  );
}

async function stampBriefs(tx: Tx, userId: string, due: readonly Candidate[]) {
  const stamped: { id: string; briefedBefore: number | null }[] = [];
  for (const item of due) {
    const [row] = await tx
      .update(applications)
      .set({ interviewBriefedFor: item.interviewAt })
      .where(
        and(
          eq(applications.userId, userId),
          eq(applications.id, item.id),
          eq(applications.status, "interview"),
          eq(applications.interviewAt, item.interviewAt),
          sql`${applications.interviewBriefedFor} is distinct from ${item.interviewAt}`,
        ),
      )
      .returning({ id: applications.id });
    if (row) stamped.push({ id: row.id, briefedBefore: item.briefedFor });
  }
  return stamped;
}

// "How did it go?" sets the follow-up reminder too, unless one is already set.
async function stampAsks(tx: Tx, userId: string, due: readonly Candidate[]) {
  const stamped: { id: string; followUpAt: number | null }[] = [];
  for (const item of due) {
    const followUpAt = followUpAfter(item.interviewAt, zoneFor(item));
    const [row] = await tx
      .update(applications)
      .set({
        interviewAskedFor: item.interviewAt,
        followUpAt: sql`coalesce(${applications.followUpAt}, ${followUpAt}::bigint)`,
      })
      .where(
        and(
          eq(applications.userId, userId),
          eq(applications.id, item.id),
          eq(applications.status, "interview"),
          eq(applications.interviewAt, item.interviewAt),
          sql`${applications.interviewAskedFor} is distinct from ${item.interviewAt}`,
        ),
      )
      .returning({ id: applications.id, followUpAt: applications.followUpAt });
    if (row) stamped.push(row);
  }
  return stamped;
}

async function claimForUser(
  userId: string,
  due: readonly Candidate[],
  now: number,
  canEmail: boolean,
): Promise<Claimed | null> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    if (!(await lockUser(tx, userId))) return null;
    const [owner] = await tx
      .select({ email: users.email, plan: users.plan })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!owner) return null;
    const briefsWanted = due.filter((item) => briefDue(item, now));
    const asksWanted = due.filter((item) => askDue(item, now));
    // With no email room left, a brief waits for a later run before its interview starts.
    const briefs = canEmail ? await stampBriefs(tx, userId, briefsWanted) : [];
    const asks = await stampAsks(tx, userId, asksWanted);
    if (briefs.length === 0 && asks.length === 0) return null;
    const ids = [...briefs, ...asks].map((item) => item.id);
    const rows = await tx
      .select({
        id: applications.id,
        company: applications.company,
        role: applications.role,
        prep: applications.prep,
      })
      .from(applications)
      .where(and(eq(applications.userId, userId), inArray(applications.id, ids)));
    const byId = new Map(rows.map((row) => [row.id, row]));
    const profileZone = due[0]?.profileZone ?? null;
    const claimedRow = (id: string, extra: Partial<ClaimedRow>): ClaimedRow[] => {
      const row = byId.get(id);
      const candidate = due.find((item) => item.id === id);
      if (!row || !candidate) return [];
      return [
        {
          id,
          company: row.company,
          role: row.role,
          interviewAt: candidate.interviewAt,
          interviewTime: candidate.interviewTime,
          zone: zoneFor(candidate),
          prep: readPrep(row.prep),
          briefedBefore: null,
          followUpAt: null,
          ...extra,
        },
      ];
    };
    const claimedBriefs = briefs.flatMap((item) =>
      claimedRow(item.id, { briefedBefore: item.briefedBefore }),
    );
    const claimedAsks = asks.flatMap((item) =>
      claimedRow(item.id, { followUpAt: item.followUpAt }),
    );
    // A millisecond apart, oldest interview first, so the bell lists the newest on top.
    for (const [index, item] of claimedAsks.entries()) {
      const day = item.followUpAt === null ? null : shortDay(item.followUpAt, item.zone);
      await insertNotification(
        tx,
        { userId, kind: "interview_after", ...afterInterviewNotice(item, day) },
        now - claimedAsks.length + index,
      );
    }
    const emailed = canEmail && due[0]?.briefsOn === true && Boolean(owner.email);
    if (emailed) {
      await tx
        .update(notificationSettings)
        .set({ briefsEmailedAt: now })
        .where(eq(notificationSettings.userId, userId));
    }
    return {
      userId,
      email: owner.email,
      canWrite: hasProTools(owner.plan),
      profileZone,
      briefs: claimedBriefs,
      asks: claimedAsks,
      emailed,
    };
  });
}

function emailFor(item: Claimed, now: number): EmailMessage {
  const base = appUrl();
  const at = (path: string, link: string) =>
    emailLink(new URL(path, base).toString(), "interview_brief", link);
  return briefEmail({
    to: item.email,
    briefs: item.briefs.map((row): BriefItem => ({
      company: row.company,
      role: row.role,
      time: (() => {
        const start = interviewStart(row.interviewAt, row.interviewTime, row.zone);
        return start === null ? null : clockTime(start, row.zone, item.profileZone);
      })(),
      prep: row.prep,
      prepUrl: at(prepPath(row.id), "prep"),
      makeUrl: item.canWrite ? at(interviewPrepPath(row.id), "make_prep") : null,
    })),
    asks: item.asks.map((row): AskItem => ({
      company: row.company,
      role: row.role,
      when: askedWhen(row.interviewAt, now, row.zone),
      followUpDay: row.followUpAt === null ? null : shortDay(row.followUpAt, row.zone),
      answerUrl: at(applicationHref(row.id), "answer"),
      thankYouUrl: item.canWrite ? at(thankYouWritePath(row.id), "thank_you") : null,
    })),
    interviewsUrl: at(ROUTES.dashboardInterview, "interviews"),
    links: {
      ottoHeadUrl: new URL(OTTO_HEAD_EMAIL_PATH, base).toString(),
      settingsUrl: at(accountSectionHref("reminders"), "settings"),
      unsubscribeUrl: unsubscribeUrl(item.userId, "briefs"),
    },
  });
}

function batchKey(batch: readonly Claimed[]): string {
  const ids = batch
    .flatMap((item) => [
      ...item.briefs.map((row) => `b:${row.id}:${row.interviewAt}`),
      ...item.asks.map((row) => `a:${row.id}:${row.interviewAt}`),
    ])
    .sort()
    .join(",");
  return `interview-brief-${createHash("sha256").update(ids).digest("hex").slice(0, 40)}`;
}

// Resend took none of it, so the briefs can go on a later run.
async function release(batch: readonly Claimed[]): Promise<void> {
  const db = await getDb();
  for (const item of batch) {
    for (const row of item.briefs) {
      await db
        .update(applications)
        .set({ interviewBriefedFor: row.briefedBefore })
        .where(
          and(
            eq(applications.userId, item.userId),
            eq(applications.id, row.id),
            eq(applications.interviewBriefedFor, row.interviewAt),
          ),
        );
    }
  }
}

export type AutopilotDeps = { sender: EmailSender | null };

export async function runInterviewAutopilot(
  { now, deadline }: CronContext,
  { sender }: AutopilotDeps,
): Promise<CronOutcome> {
  const stats = {
    candidates: 0,
    users: 0,
    briefs: 0,
    asks: 0,
    emailsSent: 0,
    emailsFailed: 0,
    released: 0,
  };
  const failed = new Set<string>();
  const found = await candidates(now);
  stats.candidates = found.length;
  const byUser = new Map<string, Candidate[]>();
  for (const item of found) {
    if (!briefDue(item, now) && !askDue(item, now)) continue;
    byUser.set(item.userId, [...(byUser.get(item.userId) ?? []), item]);
  }
  let room = sender ? await optionalEmailRoom("briefs", now) : 0;
  const claimed: Claimed[] = [];
  let complete = true;
  for (const [userId, due] of byUser) {
    if (Date.now() >= deadline) {
      complete = false;
      break;
    }
    try {
      const canEmail = room > 0 && due[0]?.briefsOn === true;
      const result = await claimForUser(userId, due, now, canEmail);
      if (!result) continue;
      claimed.push(result);
      stats.users += 1;
      stats.briefs += result.briefs.length;
      stats.asks += result.asks.length;
      if (result.emailed) room -= 1;
    } catch (error) {
      log.error("cron.interview_briefs.claim_failed", error);
      failed.add("claim");
    }
  }
  const mail = claimed.filter((item) => item.emailed);
  if (sender) {
    for (let start = 0; start < mail.length; start += EMAIL_BATCH_MAX) {
      const batch = mail.slice(start, start + EMAIL_BATCH_MAX);
      try {
        const result = await sender.sendBatch(
          batch.map((item) => emailFor(item, now)),
          batchKey(batch),
        );
        stats.emailsSent += result.sent;
        stats.emailsFailed += result.failed;
        if (result.refused) {
          await release(batch);
          stats.released += batch.length;
        }
      } catch (error) {
        log.error("cron.interview_briefs.email_failed", error, { messages: batch.length });
        stats.emailsFailed += batch.length;
      }
    }
  }
  if (found.length >= AUTOPILOT.maxCandidates) complete = false;
  return { stats, complete, failed: [...failed] };
}
