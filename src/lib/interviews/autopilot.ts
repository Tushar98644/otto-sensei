import { and, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { hasProTools } from "@/config/plans";
import { getDb, type Tx } from "@/db/client";
import { lockUser } from "@/db/locks";
import { applications, users, workProfiles } from "@/db/schema";
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
import { log } from "@/lib/log";
import { clip, NAME_CHARS } from "@/lib/notifications/follow-up";
import { insertNotification } from "@/lib/notifications/records";
import { NOTIFICATION_LIMITS } from "@/lib/notifications/types";
import { DAY_MS, HOUR_MS } from "@/lib/time";

// Runs hourly, in the bell only: the morning brief on an interview's day, and "How did it go?" the morning after. Stamping each interview day is the idempotency.

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
  if (candidate.briefedFor === candidate.interviewAt) return false;
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

// The morning of the interview: the bell points at the prep, where today's brief waits.
export function todayNotice(
  item: { id: string; company: string; hasPrep: boolean; canPrep: boolean },
  time: string | null,
): AfterNotice {
  const company = clip(item.company, NAME_CHARS);
  const who = company ? `your interview with ${company}` : "your interview";
  const body = item.hasPrep
    ? "Your strongest stories, likely questions and questions to ask are on your prep page."
    : item.canPrep
      ? "There's no prep pack for it yet. One click makes one: likely questions, stories from your own resume lines, and questions to ask."
      : "Read the job post once more and pick two stories from your resume to tell.";
  return {
    title: clip(`Today: ${who}${time ? ` at ${time}` : ""}`, NOTIFICATION_LIMITS.title),
    body: clip(body, NOTIFICATION_LIMITS.body),
    link: prepPath(item.id),
    applicationId: item.id,
  };
}

type Claimed = { briefs: number; asks: number };

async function candidates(now: number): Promise<Candidate[]> {
  const db = await getDb();
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
    })
    .from(applications)
    .leftJoin(workProfiles, eq(workProfiles.userId, applications.userId))
    .where(
      and(
        // Written out so the planner can use the partial index on interviews.
        sql`${applications.status} = 'interview'`,
        sql`${applications.interviewAt} is not null`,
        gte(applications.interviewAt, now - AUTOPILOT.askWithinMs - DAY_MS),
        lte(applications.interviewAt, now + 2 * DAY_MS),
        or(
          sql`${applications.interviewAskedFor} is distinct from ${applications.interviewAt}`,
          sql`${applications.interviewBriefedFor} is distinct from ${applications.interviewAt}`,
        ),
      ),
    )
    .orderBy(applications.userId, applications.interviewAt)
    .limit(AUTOPILOT.maxCandidates);
  return rows.flatMap((row) =>
    row.interviewAt === null
      ? []
      : [{ ...row, interviewAt: row.interviewAt, profileZone: row.profileZone || null }],
  );
}

async function stampBriefs(tx: Tx, userId: string, due: readonly Candidate[]) {
  const stamped: { id: string }[] = [];
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
    if (row) stamped.push(row);
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

type Notice = { kind: "interview_today" | "interview_after" } & AfterNotice;

async function claimForUser(
  userId: string,
  due: readonly Candidate[],
  now: number,
): Promise<Claimed | null> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    if (!(await lockUser(tx, userId))) return null;
    const [owner] = await tx
      .select({ plan: users.plan })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!owner) return null;
    const briefs = await stampBriefs(
      tx,
      userId,
      due.filter((item) => briefDue(item, now)),
    );
    const asks = await stampAsks(
      tx,
      userId,
      due.filter((item) => askDue(item, now)),
    );
    if (briefs.length === 0 && asks.length === 0) return null;
    const ids = [...briefs, ...asks].map((item) => item.id);
    const rows = await tx
      .select({
        id: applications.id,
        company: applications.company,
        hasPrep: sql<boolean>`${applications.prep} is not null`.mapWith(Boolean),
      })
      .from(applications)
      .where(and(eq(applications.userId, userId), inArray(applications.id, ids)));
    const byId = new Map(rows.map((row) => [row.id, row]));
    const candidate = (id: string) => due.find((item) => item.id === id);
    const notices: Notice[] = [];
    // Oldest interview first, so the bell lists the newest on top.
    for (const item of asks) {
      const row = byId.get(item.id);
      const found = candidate(item.id);
      if (!row || !found) continue;
      const day = item.followUpAt === null ? null : shortDay(item.followUpAt, zoneFor(found));
      notices.push({ kind: "interview_after", ...afterInterviewNotice(row, day) });
    }
    for (const item of briefs) {
      const row = byId.get(item.id);
      const found = candidate(item.id);
      if (!row || !found) continue;
      const zone = zoneFor(found);
      const start = interviewStart(found.interviewAt, found.interviewTime, zone);
      const time = start === null ? null : clockTime(start, zone, found.profileZone);
      notices.push({
        kind: "interview_today",
        ...todayNotice({ ...row, canPrep: hasProTools(owner.plan) }, time),
      });
    }
    // A millisecond apart, today's interviews last so they sit on top.
    for (const [index, notice] of notices.entries()) {
      await insertNotification(tx, { userId, ...notice }, now - notices.length + 1 + index);
    }
    return { briefs: briefs.length, asks: asks.length };
  });
}

export async function runInterviewAutopilot({ now, deadline }: CronContext): Promise<CronOutcome> {
  const stats = { candidates: 0, users: 0, briefs: 0, asks: 0 };
  const failed = new Set<string>();
  const found = await candidates(now);
  stats.candidates = found.length;
  const byUser = new Map<string, Candidate[]>();
  for (const item of found) {
    if (!briefDue(item, now) && !askDue(item, now)) continue;
    byUser.set(item.userId, [...(byUser.get(item.userId) ?? []), item]);
  }
  let complete = true;
  for (const [userId, due] of byUser) {
    if (Date.now() >= deadline) {
      complete = false;
      break;
    }
    try {
      const result = await claimForUser(userId, due, now);
      if (!result) continue;
      stats.users += 1;
      stats.briefs += result.briefs;
      stats.asks += result.asks;
    } catch (error) {
      log.error("cron.interview_briefs.claim_failed", error);
      failed.add("claim");
    }
  }
  if (found.length >= AUTOPILOT.maxCandidates) complete = false;
  return { stats, complete, failed: [...failed] };
}
