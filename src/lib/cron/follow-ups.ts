import { createHash } from "node:crypto";
import { and, asc, eq, notInArray, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { lockUser } from "@/db/locks";
import { applications, users, workProfiles } from "@/db/schema";
import { ROUTES } from "@/components/site/routes";
import { hasProTools } from "@/config/plans";
import { emailLink } from "@/lib/analytics/landing";
import { appUrl } from "@/lib/env";
import { log } from "@/lib/log";
import { EMAIL_BATCH_MAX, type EmailMessage, type EmailSender } from "@/lib/notifications/email";
import {
  followUpEmail,
  followUpNotices,
  OTTO_HEAD_EMAIL_PATH,
  type DueApplication,
} from "@/lib/notifications/follow-up";
import {
  interviewEmailLine,
  interviewSoonNotice,
  type InterviewSoon,
} from "@/lib/notifications/interview-soon";
import { followUpWritePath } from "@/lib/notifications/links";
import { emailRemindersOn, insertNotification } from "@/lib/notifications/records";
import {
  followUpActionUrl,
  unsubscribePageUrl,
  unsubscribeUrl,
} from "@/lib/notifications/unsubscribe";
import { HOUR_MS } from "@/lib/time";
import type { CronContext, CronOutcome } from "./run";

// Claiming is the idempotency: one statement stamps reminded_at only on unreminded rows.

export const FOLLOW_UP = {
  usersPerBatch: EMAIL_BATCH_MAX,
  maxBatchesPerRun: 20,
  // A day saved as local noon is 12 to 36 hours off on the daily run the day before, in every zone.
  interviewAheadMs: 36 * HOUR_MS,
} as const;

export type FollowUpDeps = {
  sender: EmailSender | null;
};

type Claimed = {
  userId: string;
  email: string;
  emailReminders: boolean;
  canWrite: boolean;
  timeZone: string | null;
  due: DueApplication[];
  interviews: InterviewSoon[];
  notificationIds: string[];
};

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
    const [owner] = await tx
      .select({ email: users.email, plan: users.plan, timeZone: workProfiles.timeZone })
      .from(users)
      .leftJoin(workProfiles, eq(workProfiles.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1);
    if (!owner) return null;
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
    const timeZone = owner.timeZone || null;
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
    const notificationIds: string[] = [];
    // A millisecond apart, so the bell lists them in this order: interviews, then the oldest follow-up.
    for (const [index, notice] of notices.entries()) {
      notificationIds.push(await insertNotification(tx, { userId, ...notice }, now - index));
    }
    return {
      userId,
      email: owner.email,
      emailReminders: await emailRemindersOn(tx, userId),
      canWrite: hasProTools(owner.plan),
      timeZone,
      due,
      interviews,
      notificationIds,
    };
  });
}

// Same batch, same key: a retried run inside Resend's 24-hour window can't send it twice.
function batchKey(claimed: readonly Claimed[]): string {
  const ids = claimed
    .flatMap((item) => item.notificationIds)
    .sort()
    .join(",");
  return `follow-up-${createHash("sha256").update(ids).digest("hex").slice(0, 40)}`;
}

function emailFor(item: Claimed, now: number): EmailMessage {
  const base = appUrl();
  const at = (path: string) => new URL(path, base).toString();
  return followUpEmail({
    to: item.email,
    applications: item.due,
    interviews: item.interviews.map((interview) => {
      const line = interviewEmailLine(interview, now, item.timeZone, base);
      return { ...line, prepUrl: emailLink(line.prepUrl, "follow_up", "prep") };
    }),
    now,
    applicationsUrl: emailLink(at(ROUTES.dashboardApplications), "follow_up", "applications"),
    settingsUrl: emailLink(at(`${ROUTES.dashboardAccount}#reminders`), "follow_up", "settings"),
    actionUrls: (applicationId) => ({
      done: followUpActionUrl(item.userId, applicationId, "done"),
      snooze: followUpActionUrl(item.userId, applicationId, "snooze"),
      write: item.canWrite
        ? emailLink(at(followUpWritePath(applicationId)), "follow_up", "write")
        : null,
    }),
    unsubscribeUrl: unsubscribeUrl(item.userId),
    unsubscribePageUrl: unsubscribePageUrl(item.userId),
    ottoHeadUrl: new URL(OTTO_HEAD_EMAIL_PATH, base).toString(),
  });
}

export async function runFollowUps(
  { now, deadline }: CronContext,
  { sender }: FollowUpDeps,
): Promise<CronOutcome> {
  const db = await getDb();
  const stats = {
    users: 0,
    applications: 0,
    interviews: 0,
    emailsSent: 0,
    emailsFailed: 0,
    emailsSkipped: 0,
  };
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

    const claimed: Claimed[] = [];
    for (const { userId } of rows) {
      try {
        const result = await claimForUser(userId, now);
        if (!result) continue;
        claimed.push(result);
        stats.users += 1;
        stats.applications += result.due.length;
        stats.interviews += result.interviews.length;
      } catch (error) {
        log.error("cron.follow_ups.claim_failed", error);
        failed.add("claim");
        skipped.push(userId);
      }
    }

    const mail = claimed.filter((item) => item.emailReminders && item.email);
    stats.emailsSkipped += claimed.length - (sender ? mail.length : 0);
    if (sender && mail.length > 0) {
      try {
        const result = await sender.sendBatch(
          mail.map((item) => emailFor(item, now)),
          batchKey(mail),
        );
        stats.emailsSent += result.sent;
        stats.emailsFailed += result.failed;
      } catch (error) {
        log.error("cron.follow_ups.email_failed", error, { messages: mail.length });
        stats.emailsFailed += mail.length;
      }
    }

    if (rows.length < FOLLOW_UP.usersPerBatch && skipped.length === 0) {
      complete = true;
      break;
    }
  }

  return { stats, complete, failed: [...failed] };
}
