import { createHash } from "node:crypto";
import { and, asc, eq, gt, isNull, lte, ne, or, sql } from "drizzle-orm";
import { accountSectionHref } from "@/components/setup/links";
import { getDb } from "@/db/client";
import { lockUser } from "@/db/locks";
import { users, userSettings } from "@/db/schema";
import type { Locale } from "@/i18n/config";
import { emailLink } from "@/lib/analytics/landing";
import type { CronContext, CronOutcome } from "@/lib/cron/run";
import { appUrl } from "@/lib/env";
import { log } from "@/lib/log";
import { optionalEmailRoom } from "@/lib/notifications/budget";
import { EMAIL_BATCH_MAX, type EmailMessage, type EmailSender } from "@/lib/notifications/email";
import { OTTO_HEAD_EMAIL_PATH } from "@/lib/notifications/follow-up";
import { emailLocale, localizedPath } from "@/lib/notifications/locale";
import { insertNotification } from "@/lib/notifications/records";
import { unsubscribeUrl } from "@/lib/notifications/unsubscribe";
import { DAY_MS } from "@/lib/time";
import { checkinEmail, checkinNotice } from "./checkin-email";
import { checkinPath } from "./links";
import { addDays } from "./month";
import { decideCheckin, type CheckinDecision } from "./schedule";
import type { LocalDate, Month } from "./types";

// The monthly check-in: a bell note on the person's chosen day, then its email. Idempotent, so a repeated or late run never asks twice.

export const CHECKINS = {
  rowsPerBatch: 100,
  maxBatches: 20,
  // A check-in email that couldn't go out (no room left today) is tried again for this long.
  emailForMs: 3 * DAY_MS,
  emailsPerBatch: EMAIL_BATCH_MAX,
} as const;

type DueRow = {
  userId: string;
  week: number;
  weekday: number;
  timeZone: string;
  nextCheckinOn: LocalDate | null;
  pausedUntil: LocalDate | null;
  lastCheckinMonth: Month | null;
  locale: string | null;
};

// Only while the row still says what was read, so two runs at once ask once.
async function settle(
  row: DueRow,
  decision: Exclude<CheckinDecision, { action: "wait" }>,
  now: number,
) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    if (!(await lockUser(tx, row.userId))) return false;
    const sent = decision.action === "send";
    const moved = await tx
      .update(userSettings)
      .set({
        careerNextOn: decision.next,
        ...(sent ? { careerLastMonth: decision.month, careerLastAt: now } : {}),
      })
      .where(
        and(
          eq(userSettings.userId, row.userId),
          eq(userSettings.careerCheckins, true),
          row.nextCheckinOn === null
            ? isNull(userSettings.careerNextOn)
            : eq(userSettings.careerNextOn, row.nextCheckinOn),
        ),
      )
      .returning({ userId: userSettings.userId });
    if (moved.length === 0 || !sent) return false;
    await insertNotification(
      tx,
      {
        userId: row.userId,
        kind: "career_checkin",
        ...checkinNotice(decision.month, emailLocale(row.locale)),
        link: checkinPath(decision.month),
      },
      now,
    );
    return true;
  });
}

async function ringBells({ now, deadline }: CronContext) {
  const db = await getDb();
  const stats = { checked: 0, bells: 0, skipped: 0 };
  // No time zone is a day ahead of UTC, so anything later can't be due anywhere yet.
  const horizon = addDays(new Date(now).toISOString().slice(0, 10), 1);
  let after: { on: LocalDate; userId: string } | null = null;
  for (let batch = 0; batch < CHECKINS.maxBatches; batch += 1) {
    if (Date.now() >= deadline) return { stats, complete: false };
    const rows: DueRow[] = await db
      .select({
        userId: userSettings.userId,
        week: userSettings.careerWeek,
        weekday: userSettings.careerWeekday,
        timeZone: userSettings.careerTimeZone,
        nextCheckinOn: userSettings.careerNextOn,
        pausedUntil: userSettings.careerPausedUntil,
        lastCheckinMonth: userSettings.careerLastMonth,
        locale: userSettings.locale,
      })
      .from(userSettings)
      .where(
        and(
          eq(userSettings.careerCheckins, true),
          lte(userSettings.careerNextOn, horizon),
          after === null
            ? undefined
            : sql`(${userSettings.careerNextOn}, ${userSettings.userId}) > (${after.on}::date, ${after.userId}::uuid)`,
        ),
      )
      .orderBy(asc(userSettings.careerNextOn), asc(userSettings.userId))
      .limit(CHECKINS.rowsPerBatch);
    for (const row of rows) {
      stats.checked += 1;
      const decision = decideCheckin(
        {
          day: { week: row.week, weekday: row.weekday },
          timeZone: row.timeZone,
          nextCheckinOn: row.nextCheckinOn,
          pausedUntil: row.pausedUntil,
          lastCheckinMonth: row.lastCheckinMonth,
        },
        now,
      );
      if (decision.action === "wait") continue;
      if (await settle(row, decision, now)) stats.bells += 1;
      else if (decision.action === "skip") stats.skipped += 1;
    }
    const last = rows.at(-1);
    if (rows.length < CHECKINS.rowsPerBatch || !last?.nextCheckinOn) {
      return { stats, complete: true };
    }
    after = { on: last.nextCheckinOn, userId: last.userId };
  }
  return { stats, complete: false };
}

type Claimed = {
  userId: string;
  email: string;
  month: Month;
  locale: Locale;
  before: { month: Month | null; at: number | null };
};

async function claimEmail(
  userId: string,
  month: Month,
  before: Claimed["before"],
  now: number,
): Promise<Claimed | null> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    if (!(await lockUser(tx, userId))) return null;
    const stamped = await tx
      .update(userSettings)
      .set({ careerEmailedMonth: month, careerEmailedAt: now })
      .where(
        and(
          eq(userSettings.userId, userId),
          eq(userSettings.careerCheckins, true),
          eq(userSettings.careerEmails, true),
          eq(userSettings.careerLastMonth, month),
          before.month === null
            ? isNull(userSettings.careerEmailedMonth)
            : eq(userSettings.careerEmailedMonth, before.month),
        ),
      )
      .returning({ userId: userSettings.userId, locale: userSettings.locale });
    const [settings] = stamped;
    if (!settings) return null;
    const [owner] = await tx.select({ email: users.email }).from(users).where(eq(users.id, userId));
    const locale = emailLocale(settings.locale);
    return owner ? { userId, email: owner.email, month, locale, before } : null;
  });
}

async function release(batch: readonly Claimed[], now: number): Promise<void> {
  const db = await getDb();
  for (const item of batch) {
    await db
      .update(userSettings)
      .set({ careerEmailedMonth: item.before.month, careerEmailedAt: item.before.at })
      .where(and(eq(userSettings.userId, item.userId), eq(userSettings.careerEmailedAt, now)));
  }
}

function emailFor(item: Claimed): EmailMessage {
  const base = appUrl();
  const at = (path: string) => new URL(path, base).toString();
  const page = (path: string) => at(localizedPath(item.locale, path));
  return checkinEmail({
    to: item.email,
    month: item.month,
    url: emailLink(page(checkinPath(item.month)), "career_checkin", "checkin"),
    links: {
      ottoHeadUrl: at(OTTO_HEAD_EMAIL_PATH),
      settingsUrl: emailLink(page(accountSectionHref("careerLog")), "career_checkin", "settings"),
      unsubscribeUrl: unsubscribeUrl(item.userId, "career"),
    },
    locale: item.locale,
  });
}

function batchKey(claimed: readonly Claimed[], now: number): string {
  const ids = claimed
    .map((item) => `${item.userId}:${item.month}`)
    .sort()
    .join(",");
  return `career-${createHash("sha256").update(`${now}:${ids}`).digest("hex").slice(0, 40)}`;
}

async function sendEmails({ now, deadline }: CronContext, sender: EmailSender) {
  const db = await getDb();
  const stats = { emailsSent: 0, emailsFailed: 0, released: 0 };
  const cap = await optionalEmailRoom(now);
  if (cap === 0) return { stats, complete: false };
  const due = await db
    .select({
      userId: userSettings.userId,
      month: userSettings.careerLastMonth,
      emailedMonth: userSettings.careerEmailedMonth,
      emailedAt: userSettings.careerEmailedAt,
    })
    .from(userSettings)
    .where(
      and(
        eq(userSettings.careerCheckins, true),
        eq(userSettings.careerEmails, true),
        gt(userSettings.careerLastAt, now - CHECKINS.emailForMs),
        or(
          isNull(userSettings.careerEmailedMonth),
          ne(userSettings.careerEmailedMonth, userSettings.careerLastMonth),
        ),
      ),
    )
    .orderBy(asc(userSettings.careerLastAt), asc(userSettings.userId))
    .limit(cap);
  const claimed: Claimed[] = [];
  for (const row of due) {
    if (Date.now() >= deadline || !row.month) break;
    const item = await claimEmail(
      row.userId,
      row.month,
      { month: row.emailedMonth, at: row.emailedAt },
      now,
    );
    if (item) claimed.push(item);
  }
  for (let start = 0; start < claimed.length; start += CHECKINS.emailsPerBatch) {
    const batch = claimed.slice(start, start + CHECKINS.emailsPerBatch);
    try {
      const result = await sender.sendBatch(batch.map(emailFor), batchKey(batch, now));
      stats.emailsSent += result.sent;
      stats.emailsFailed += result.failed;
      if (result.refused) {
        await release(batch, now);
        stats.released += batch.length;
      }
    } catch (error) {
      log.error("cron.career_checkins.email_failed", error, { messages: batch.length });
      stats.emailsFailed += batch.length;
    }
  }
  return { stats, complete: due.length < cap };
}

export type CheckinDeps = { sender: EmailSender | null };

export async function runCareerCheckins(
  context: CronContext,
  { sender }: CheckinDeps,
): Promise<CronOutcome> {
  const failed: string[] = [];
  let stats: Record<string, number> = {};
  let complete = true;
  try {
    const bells = await ringBells(context);
    stats = { ...stats, ...bells.stats };
    complete &&= bells.complete;
  } catch (error) {
    log.error("cron.career_checkins.bells_failed", error);
    failed.push("bells");
  }
  if (!sender) return { stats: { ...stats, emailOff: 1 }, complete, failed };
  try {
    const emails = await sendEmails(context, sender);
    stats = { ...stats, ...emails.stats };
    complete &&= emails.complete;
  } catch (error) {
    log.error("cron.career_checkins.emails_failed", error);
    failed.push("emails");
  }
  return { stats, complete, failed };
}
