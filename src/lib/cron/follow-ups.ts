import { createHash } from "node:crypto";
import { and, asc, eq, notInArray, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { lockUser } from "@/db/locks";
import { applications, users } from "@/db/schema";
import { ROUTES } from "@/components/site/routes";
import { appUrl } from "@/lib/env";
import { log } from "@/lib/log";
import { EMAIL_BATCH_MAX, type EmailMessage, type EmailSender } from "@/lib/notifications/email";
import {
  followUpEmail,
  followUpNotice,
  OTTO_HEAD_EMAIL_PATH,
  type DueApplication,
} from "@/lib/notifications/follow-up";
import { emailRemindersOn, insertNotification } from "@/lib/notifications/records";
import {
  followUpActionUrl,
  unsubscribePageUrl,
  unsubscribeUrl,
} from "@/lib/notifications/unsubscribe";
import type { CronContext, CronOutcome } from "./run";

// Server-only. The daily follow-up: every application still on "applied" whose follow-up date
// (applications.follow_up_at, set when it was marked applied) has come and hasn't been reminded
// yet gets its owner one notification per run (all of that account's newly due applications
// together), plus one email when email is set up and the user turned reminder emails on.
//
// Claiming is the idempotency: one statement stamps reminded_at only on rows whose date is still
// unreminded, so a repeated or overlapping run finds nothing left to claim. The notification is
// written in the same transaction. Email goes after commit, at most once: a failed send is
// logged, never retried on a later day, because the bell already has the reminder. A snooze sets
// a later date, which the stamp is behind, so that date is reminded once in its turn.
//
// Every plan gets reminders: Free for its one tracked application (FREE_APPLICATIONS), paid plans
// for all of them. An account kept past Free's limit after a paid plan ended is reminded too, since
// the dates were set while it paid.

export const FOLLOW_UP = {
  usersPerBatch: EMAIL_BATCH_MAX,
  maxBatchesPerRun: 20,
} as const;

export type FollowUpDeps = {
  // null: no email this run (not configured); reminders stay in-app.
  sender: EmailSender | null;
};

type Claimed = {
  userId: string;
  email: string;
  emailReminders: boolean;
  due: DueApplication[];
  notificationId: string;
};

// The index's own predicate is written out rather than bound, so the planner can match the
// partial index applications_follow_up_due_idx.
function dueFor(now: number) {
  return and(
    sql`${applications.status} = 'applied'`,
    sql`${applications.followUpAt} is not null`,
    sql`(${applications.remindedAt} is null or ${applications.remindedAt} < ${applications.followUpAt})`,
    sql`${applications.followUpAt} <= ${now}`,
  );
}

/** Claims every due application of one account and writes its notification, or null if none. */
async function claimForUser(userId: string, now: number): Promise<Claimed | null> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    // Queues behind an account deletion, so the insert below can't hit a vanished user.
    if (!(await lockUser(tx, userId))) return null;
    const [owner] = await tx
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!owner) return null;
    const claimed = await tx
      .update(applications)
      .set({ remindedAt: now })
      .where(and(eq(applications.userId, userId), dueFor(now)))
      .returning({
        id: applications.id,
        company: applications.company,
        role: applications.role,
        appliedAt: applications.appliedAt,
      });
    if (claimed.length === 0) return null;
    const emailReminders = await emailRemindersOn(tx, userId);
    const notice = followUpNotice(claimed, now);
    const notificationId = await insertNotification(
      tx,
      { userId, kind: "application_follow_up", ...notice },
      now,
    );
    return { userId, email: owner.email, emailReminders, due: claimed, notificationId };
  });
}

// Same batch, same key: a retried run inside Resend's 24-hour window can't send it twice.
function batchKey(claimed: readonly Claimed[]): string {
  const ids = claimed
    .map((item) => item.notificationId)
    .sort()
    .join(",");
  return `follow-up-${createHash("sha256").update(ids).digest("hex").slice(0, 40)}`;
}

function emailFor(item: Claimed, now: number): EmailMessage {
  const base = appUrl();
  return followUpEmail({
    to: item.email,
    applications: item.due,
    now,
    applicationsUrl: new URL(ROUTES.dashboardApplications, base).toString(),
    settingsUrl: new URL(`${ROUTES.dashboardAccount}#reminders`, base).toString(),
    actionUrls: (applicationId) => ({
      done: followUpActionUrl(item.userId, applicationId, "done"),
      snooze: followUpActionUrl(item.userId, applicationId, "snooze"),
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
    emailsSent: 0,
    emailsFailed: 0,
    // Reminder emails not turned on, or email not set up.
    emailsSkipped: 0,
  };
  const failed = new Set<string>();
  // Accounts that threw this run, so the loop moves past them instead of retrying forever.
  const skipped: string[] = [];
  let complete = false;

  for (let batch = 0; batch < FOLLOW_UP.maxBatchesPerRun; batch++) {
    if (Date.now() >= deadline) break;
    // Through applications_follow_up_due_idx: only rows not yet reminded are in it.
    const rows = await db
      .selectDistinct({ userId: applications.userId })
      .from(applications)
      .where(
        and(dueFor(now), skipped.length > 0 ? notInArray(applications.userId, skipped) : undefined),
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

  // Emails that didn't go out don't fail the run: the reminders are in the bell either way.
  return { stats, complete, failed: [...failed] };
}
