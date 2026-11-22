import { and, asc, eq, notInArray, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { lockUser } from "@/db/locks";
import { applications, userSettings } from "@/db/schema";
import { log } from "@/lib/log";
import { followUpNotices } from "@/lib/notifications/follow-up";
import { interviewSoonNotice } from "@/lib/notifications/interview-soon";
import { insertNotification } from "@/lib/notifications/records";
import { HOUR_MS } from "@/lib/time";
import type { CronContext, CronOutcome } from "./run";

// In the bell only. Claiming is the idempotency: one statement stamps reminded_at only on unreminded rows.

export const FOLLOW_UP = {
  usersPerBatch: 100,
  maxBatchesPerRun: 20,
  // A day saved as local noon is 12 to 36 hours off on the daily run the day before, in every zone.
  interviewAheadMs: 36 * HOUR_MS,
} as const;

type Claimed = { applications: number; interviews: number };

// Written out rather than bound, so the planner can match each status's partial index.
function dueIn(status: "applied" | "interview", now: number) {
  return and(
    status === "applied"
      ? sql`${applications.status} = 'applied'`
      : sql`${applications.status} = 'interview'`,
    sql`${applications.followUpAt} is not null`,
    sql`(${applications.remindedAt} is null or ${applications.remindedAt} < ${applications.followUpAt})`,
    sql`${applications.followUpAt} <= ${now}`,
  );
}

function dueFor(now: number) {
  return or(dueIn("applied", now), dueIn("interview", now));
}

// Up to the start of the hour + 36 h, so daily runs leave no gap whatever minute they start.
function interviewSoonFor(now: number) {
  const until = now - (now % HOUR_MS) + FOLLOW_UP.interviewAheadMs;
  return and(
    sql`${applications.status} = 'interview'`,
    sql`${applications.interviewAt} is not null`,
    sql`${applications.interviewAt} > ${now}`,
    sql`${applications.interviewAt} <= ${until}`,
    sql`${applications.interviewRemindedFor} is distinct from ${applications.interviewAt}`,
  );
}

async function claimForUser(userId: string, now: number): Promise<Claimed | null> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    if (!(await lockUser(tx, userId))) return null;
    const [profile] = await tx
      .select({ timeZone: userSettings.timeZone })
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);
    const due = await tx
      .update(applications)
      .set({ remindedAt: now })
      .where(and(eq(applications.userId, userId), dueFor(now)))
      .returning({
        id: applications.id,
        company: applications.company,
        role: applications.role,
        appliedAt: applications.appliedAt,
        status: applications.status,
        interviewAt: applications.interviewAt,
      })
      .then((rows) =>
        rows.map(({ status, interviewAt, ...row }) => ({
          ...row,
          interviewedAt: status === "interview" ? interviewAt : null,
        })),
      );
    const soon = await tx
      .update(applications)
      .set({ interviewRemindedFor: sql`${applications.interviewAt}` })
      .where(and(eq(applications.userId, userId), interviewSoonFor(now)))
      .returning({
        id: applications.id,
        company: applications.company,
        role: applications.role,
        interviewAt: applications.interviewAt,
      });
    const interviews = soon
      .flatMap((row) =>
        row.interviewAt === null ? [] : [{ ...row, interviewAt: row.interviewAt }],
      )
      .sort((a, b) => a.interviewAt - b.interviewAt);
    if (due.length === 0 && interviews.length === 0) return null;
    const timeZone = profile?.timeZone || null;
    const notices = [
      ...interviews.map((item) => ({
        kind: "interview_soon" as const,
        ...interviewSoonNotice(item, now, timeZone),
      })),
      ...followUpNotices(due, now).map((notice) => ({
        kind: "application_follow_up" as const,
        ...notice,
      })),
    ];
    // A millisecond apart, so the bell lists them in this order: interviews, then the oldest follow-up.
    for (const [index, notice] of notices.entries()) {
      await insertNotification(tx, { userId, ...notice }, now - index);
    }
    return { applications: due.length, interviews: interviews.length };
  });
}

export async function runFollowUps({ now, deadline }: CronContext): Promise<CronOutcome> {
  const db = await getDb();
  const stats = { users: 0, applications: 0, interviews: 0 };
  const failed = new Set<string>();
  const skipped: string[] = [];
  let complete = false;

  for (let batch = 0; batch < FOLLOW_UP.maxBatchesPerRun; batch++) {
    if (Date.now() >= deadline) break;
    const rows = await db
      .selectDistinct({ userId: applications.userId })
      .from(applications)
      .where(
        and(
          or(dueFor(now), interviewSoonFor(now)),
          skipped.length > 0 ? notInArray(applications.userId, skipped) : undefined,
        ),
      )
      .orderBy(asc(applications.userId))
      .limit(FOLLOW_UP.usersPerBatch);
    if (rows.length === 0) {
      complete = true;
      break;
    }

    for (const { userId } of rows) {
      try {
        const result = await claimForUser(userId, now);
        if (!result) continue;
        stats.users += 1;
        stats.applications += result.applications;
        stats.interviews += result.interviews;
      } catch (error) {
        log.error("cron.follow_ups.claim_failed", error);
        failed.add("claim");
        skipped.push(userId);
      }
    }

    if (rows.length < FOLLOW_UP.usersPerBatch && skipped.length === 0) {
      complete = true;
      break;
    }
  }

  return { stats, complete, failed: [...failed] };
}
