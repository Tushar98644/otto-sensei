import { createHash } from "node:crypto";
import { and, asc, eq, gt, inArray, lte, ne, sql } from "drizzle-orm";
import { ROUTES } from "@/components/site/routes";
import { PRO_TRIAL, type BillingInterval, type PaidPlanId } from "@/config/plans";
import { getDb } from "@/db/client";
import { lockUser } from "@/db/locks";
import { users, userSettings } from "@/db/schema";
import { emailLink } from "@/lib/analytics/landing";
import { MOCK_STATUS } from "@/lib/billing/mock";
import { appUrl } from "@/lib/env";
import { log } from "@/lib/log";
import { EMAIL_BATCH_MAX, type EmailMessage, type EmailSender } from "@/lib/notifications/email";
import { OTTO_HEAD_EMAIL_PATH } from "@/lib/notifications/follow-up";
import { insertNotification } from "@/lib/notifications/records";
import { trialEndingEmail, trialEndingNotice } from "@/lib/notifications/trial-ending";
import { DAY_MS, HOUR_MS } from "@/lib/time";
import type { CronContext, CronOutcome } from "./run";

// Dodo's trial-ending email is off (it goes out as a short trial starts), so this reminds once per trial.

export const TRIAL_REMINDER = {
  // The day before's run reached 12 h past this run's hour: normally 12 to 36 hours' notice.
  latestMs: 36 * HOUR_MS,
  // A trial a failed or cut-short run missed is still reminded while this much is left.
  minNoticeMs: HOUR_MS,
  // An end date this close to one already reminded is the same trial, moved.
  sameTrialMs: PRO_TRIAL.days * DAY_MS,
  usersPerBatch: EMAIL_BATCH_MAX,
  maxBatchesPerRun: 20,
} as const;

// A Dodo trial, or a mock one in development. A trial set to cancel is "scheduled_cancel".
const TRIALING = ["trialing", MOCK_STATUS.trialing];

export type TrialReminderDeps = {
  sender: EmailSender | null;
};

type Window = { after: number; until: number };

type Claimed = {
  userId: string;
  email: string;
  plan: PaidPlanId;
  interval: BillingInterval;
  endsAt: number;
  timeZone: string | null;
  notificationId: string;
};

// Up to the start of the hour + 36 h, so daily runs leave no gap whatever minute they start.
function reminderWindow(now: number): Window {
  const hour = now - (now % HOUR_MS);
  return { after: now + TRIAL_REMINDER.minNoticeMs, until: hour + TRIAL_REMINDER.latestMs };
}

function dueFor({ after, until }: Window) {
  return and(
    inArray(users.planStatus, TRIALING),
    ne(users.plan, "free"),
    gt(users.trialEndsAt, after),
    lte(users.trialEndsAt, until),
  );
}

function notRemindedYet() {
  const near = TRIAL_REMINDER.sameTrialMs;
  return sql`not exists (select 1 from ${userSettings} s where s.user_id = ${users.id} and s.trial_reminded_for > ${users.trialEndsAt} - ${near} and s.trial_reminded_for < ${users.trialEndsAt} + ${near})`;
}

async function claimForUser(userId: string, window: Window, now: number): Promise<Claimed | null> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    if (!(await lockUser(tx, userId))) return null;
    // Read again under the lock: the plan may have changed, or an overlapping run reminded it.
    const [row] = await tx
      .select({
        email: users.email,
        plan: users.plan,
        interval: users.planInterval,
        endsAt: users.trialEndsAt,
        timeZone: userSettings.timeZone,
      })
      .from(users)
      .leftJoin(userSettings, eq(userSettings.userId, users.id))
      .where(and(eq(users.id, userId), dueFor(window), notRemindedYet()))
      .limit(1);
    if (!row || row.plan === "free" || row.endsAt === null) return null;
    const recorded = await tx
      .insert(userSettings)
      .values({ userId, trialRemindedFor: row.endsAt, updatedAt: now })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: { trialRemindedFor: row.endsAt },
        setWhere: sql`${userSettings.trialRemindedFor} is distinct from ${row.endsAt}::bigint`,
      })
      .returning({ userId: userSettings.userId });
    if (recorded.length === 0) return null;
    const trial = {
      plan: row.plan,
      interval: row.interval ?? PRO_TRIAL.interval,
      endsAt: row.endsAt,
      timeZone: row.timeZone || null,
    };
    const notificationId = await insertNotification(
      tx,
      { userId, kind: "trial_ending", ...trialEndingNotice(trial) },
      now,
    );
    return { userId, email: row.email, ...trial, notificationId };
  });
}

// Same batch, same key: a retried run inside Resend's 24-hour window can't send it twice.
function batchKey(claimed: readonly Claimed[]): string {
  const ids = claimed
    .map((item) => item.notificationId)
    .sort()
    .join(",");
  return `trial-ending-${createHash("sha256").update(ids).digest("hex").slice(0, 40)}`;
}

function emailFor(item: Claimed): EmailMessage {
  const base = appUrl();
  return trialEndingEmail({
    ...item,
    to: item.email,
    accountUrl: emailLink(new URL(ROUTES.account, base).toString(), "trial_ending", "account"),
    ottoHeadUrl: new URL(OTTO_HEAD_EMAIL_PATH, base).toString(),
  });
}

export async function runTrialReminders(
  { now, deadline }: CronContext,
  { sender }: TrialReminderDeps,
): Promise<CronOutcome> {
  const db = await getDb();
  const window = reminderWindow(now);
  const stats = { users: 0, emailsSent: 0, emailsFailed: 0, emailsSkipped: 0 };
  const failed = new Set<string>();
  let cursor: string | null = null;
  let complete = false;

  for (let batch = 0; batch < TRIAL_REMINDER.maxBatchesPerRun; batch++) {
    if (Date.now() >= deadline) break;
    const rows = await db
      .select({ userId: users.id })
      .from(users)
      .where(
        and(dueFor(window), notRemindedYet(), cursor === null ? undefined : gt(users.id, cursor)),
      )
      .orderBy(asc(users.id))
      .limit(TRIAL_REMINDER.usersPerBatch);
    cursor = rows.at(-1)?.userId ?? cursor;

    const claimed: Claimed[] = [];
    for (const { userId } of rows) {
      try {
        const result = await claimForUser(userId, window, now);
        if (!result) continue;
        claimed.push(result);
        stats.users += 1;
      } catch (error) {
        log.error("cron.trial_reminders.claim_failed", error, { userId });
        failed.add("claim");
      }
    }

    const mail = claimed.filter((item) => item.email);
    stats.emailsSkipped += claimed.length - (sender ? mail.length : 0);
    if (sender && mail.length > 0) {
      try {
        const result = await sender.sendBatch(mail.map(emailFor), batchKey(mail));
        stats.emailsSent += result.sent;
        stats.emailsFailed += result.failed;
      } catch (error) {
        log.error("cron.trial_reminders.email_failed", error, { messages: mail.length });
        stats.emailsFailed += mail.length;
      }
    }

    if (rows.length < TRIAL_REMINDER.usersPerBatch) {
      complete = true;
      break;
    }
  }

  return { stats, complete, failed: [...failed] };
}
