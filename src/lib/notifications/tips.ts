import { createHash } from "node:crypto";
import { and, asc, eq, gt, inArray, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";
import { accountSectionHref } from "@/components/setup/links";
import { ROUTES } from "@/components/site/routes";
import { getDb } from "@/db/client";
import { lockUser } from "@/db/locks";
import {
  accountSetup,
  applications,
  emailLog,
  matchEvents,
  notifications,
  notificationSettings,
  portfolios,
  resumes,
  resumeTombstones,
  savedJobs,
  shares,
  trialWatch,
  usage,
  users,
  workProfiles,
  writings,
} from "@/db/schema";
import type { CronContext, CronOutcome } from "@/lib/cron/run";
import { appUrl } from "@/lib/env";
import { emailLink } from "@/lib/analytics/landing";
import { log } from "@/lib/log";
import { DAY_MS, HOUR_MS } from "@/lib/time";
import { cycleKey, monthKey } from "@/lib/usage";
import { optionalEmailRoom } from "./budget";
import { EMAIL_BATCH_MAX, senderPostalAddress, type EmailMessage, type EmailSender } from "./email";
import { OTTO_HEAD_EMAIL_PATH } from "./follow-up";
import { tipEmail } from "./tip-emails";
import type { TipEmailKind } from "./types";
import { unsubscribeUrl } from "./unsubscribe";

// Each tip is logged (user, kind, occasion) under the account's lock before it is sent, so it goes out once.

const TIPS = {
  // At most one tip per account in this long, whatever the kind.
  gapMs: 3 * DAY_MS,
  noResume: { afterMs: 2 * DAY_MS, untilMs: 7 * DAY_MS },
  // Free's line fixes come back on the 1st (UTC); a run in the first days of the month says so.
  fixesBackWithinMs: 5 * DAY_MS,
  trialEnded: { afterMs: 18 * HOUR_MS, untilMs: 4 * DAY_MS },
  // Quiet for a month, but not so long that the email would come out of nowhere.
  winBack: { afterMs: 30 * DAY_MS, untilMs: 60 * DAY_MS },
  trialWatchKeepMs: 30 * DAY_MS,
  pageSize: 100,
} as const;

type TipDeps = { sender: EmailSender | null };

type Claimed = {
  userId: string;
  email: string;
  kind: TipEmailKind;
  occasion: string;
  trialEndsAt: number | null;
  timeZone: string | null;
};

type Occasion = { kind: TipEmailKind; occasion: string; where: SQL };

const ONCE = "once";

function monthStart(now: number): number {
  const date = new Date(now);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

const tipsOn = sql`coalesce((select ${notificationSettings.tipEmails} from ${notificationSettings} where ${notificationSettings.userId} = ${users.id}), true)`;

function notLogged(kind: TipEmailKind, occasion: string): SQL {
  return sql`not exists (select 1 from ${emailLog} where ${emailLog.userId} = ${users.id} and ${emailLog.kind} = ${kind} and ${emailLog.occasion} = ${occasion})`;
}

function quietSince(now: number): SQL {
  return sql`not exists (select 1 from ${emailLog} where ${emailLog.userId} = ${users.id} and ${emailLog.createdAt} > ${now - TIPS.gapMs}::bigint)`;
}

function fixUsedIn(period: string): SQL {
  return sql`exists (select 1 from ${usage} where ${usage.subject} = ${users.id} and ${usage.feature} = 'fix' and ${usage.period} = ${period} and ${usage.count} > 0)`;
}

// Usage has no dates, only periods (a calendar month on Free, a billing month on a paid plan): any that may overlap the past month counts.
function usedAfter(at: number, now: number): SQL {
  const months: string[] = [];
  for (let month = monthStart(at); month <= now; month = monthStart(month + 32 * DAY_MS)) {
    months.push(monthKey(month));
  }
  return sql`exists (select 1 from ${usage} where ${usage.subject} = ${users.id} and ${usage.count} > 0
    and (${inArray(usage.period, months)}
      or ${usage.period} between ${cycleKey(at - 31 * DAY_MS)} and ${cycleKey(now)}))`;
}

function latest(table: PgTable, owner: AnyPgColumn, at: AnyPgColumn): SQL {
  return sql`(select max(${at}) from ${table} where ${owner} = ${users.id})`;
}

// What counts as using Otto: anything the account saved or changed, or a notification it read.
function lastActive(): SQL {
  return sql`greatest(${users.createdAt},
    ${latest(resumes, resumes.userId, resumes.updatedAt)},
    ${latest(resumeTombstones, resumeTombstones.userId, resumeTombstones.deletedAt)},
    ${latest(applications, applications.userId, applications.updatedAt)},
    ${latest(writings, writings.userId, writings.updatedAt)},
    ${latest(savedJobs, savedJobs.userId, savedJobs.savedAt)},
    ${latest(shares, shares.userId, shares.updatedAt)},
    ${latest(portfolios, portfolios.userId, portfolios.updatedAt)},
    ${latest(notifications, notifications.userId, notifications.readAt)},
    ${latest(workProfiles, workProfiles.userId, workProfiles.updatedAt)},
    ${latest(notificationSettings, notificationSettings.userId, notificationSettings.updatedAt)},
    ${latest(accountSetup, accountSetup.userId, accountSetup.updatedAt)})`;
}

// In the order they're sent when the run's allowance is short: the most time-bound first.
function tipOccasions(now: number): Occasion[] {
  const list: Occasion[] = [
    {
      kind: "trial_ended",
      occasion: ONCE,
      where: sql`${users.plan} = 'free' and exists (select 1 from ${trialWatch} where ${trialWatch.userId} = ${users.id} and ${trialWatch.trialEndsAt} <= ${now - TIPS.trialEnded.afterMs}::bigint and ${trialWatch.trialEndsAt} > ${now - TIPS.trialEnded.untilMs}::bigint)`,
    },
    {
      kind: "no_resume",
      occasion: ONCE,
      where: sql`${users.createdAt} <= ${now - TIPS.noResume.afterMs}::bigint and ${users.createdAt} > ${now - TIPS.noResume.untilMs}::bigint
        and not exists (select 1 from ${resumes} where ${resumes.userId} = ${users.id})
        and not exists (select 1 from ${resumeTombstones} where ${resumeTombstones.userId} = ${users.id})`,
    },
  ];
  const start = monthStart(now);
  if (now - start < TIPS.fixesBackWithinMs) {
    list.push({
      kind: "fixes_back",
      occasion: monthKey(now),
      where: sql`${users.plan} = 'free' and ${fixUsedIn(monthKey(start - 1))} and not ${fixUsedIn(monthKey(now))}`,
    });
  }
  list.push({
    kind: "win_back",
    occasion: ONCE,
    where: sql`${lastActive()} between ${now - TIPS.winBack.untilMs}::bigint and ${now - TIPS.winBack.afterMs}::bigint
      and coalesce((select ${notificationSettings.jobsEmailedAt} from ${notificationSettings} where ${notificationSettings.userId} = ${users.id}), 0) <= ${now - TIPS.winBack.afterMs}::bigint
      and not ${usedAfter(now - TIPS.winBack.afterMs, now)}`,
  });
  return list;
}

function eligible(occasion: Occasion, now: number): SQL | undefined {
  return and(
    sql`${users.email} <> ''`,
    occasion.where,
    tipsOn,
    notLogged(occasion.kind, occasion.occasion),
    quietSince(now),
  );
}

// The Jobs tab logs what it shows, so a recent view counts as using Otto too.
async function browsedJobsLately(userIds: string[], now: number): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const db = await getDb();
  const rows = await db
    .selectDistinct({ userId: matchEvents.userId })
    .from(matchEvents)
    .where(
      and(
        gt(matchEvents.createdAt, now - TIPS.winBack.afterMs),
        inArray(matchEvents.userId, userIds),
      ),
    );
  return new Set(rows.map((row) => row.userId));
}

async function claim(userId: string, occasion: Occasion, now: number): Promise<Claimed | null> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    if (!(await lockUser(tx, userId))) return null;
    // Read again under the lock: the plan, the setting or another run may have changed it.
    const [row] = await tx
      .select({
        email: users.email,
        trialEndsAt: trialWatch.trialEndsAt,
        timeZone: workProfiles.timeZone,
      })
      .from(users)
      .leftJoin(trialWatch, eq(trialWatch.userId, users.id))
      .leftJoin(workProfiles, eq(workProfiles.userId, users.id))
      .where(and(eq(users.id, userId), eligible(occasion, now)))
      .limit(1);
    if (!row) return null;
    const logged = await tx
      .insert(emailLog)
      .values({ userId, kind: occasion.kind, occasion: occasion.occasion, createdAt: now })
      .onConflictDoNothing()
      .returning({ userId: emailLog.userId });
    if (logged.length === 0) return null;
    return {
      userId,
      email: row.email,
      kind: occasion.kind,
      occasion: occasion.occasion,
      trialEndsAt: row.trialEndsAt,
      timeZone: row.timeZone || null,
    };
  });
}

// Remembers each trial's end while it runs, only with tips on: an unpaid trial clears it from the account when it ends.
async function watchTrials(now: number): Promise<void> {
  const db = await getDb();
  await db.execute(sql`insert into ${trialWatch} (user_id, trial_ends_at, seen_at)
    select ${users.id}, ${users.trialEndsAt}, ${now}::bigint from ${users}
    where ${users.plan} <> 'free' and ${users.trialEndsAt} is not null and ${tipsOn}
    on conflict (user_id) do update set trial_ends_at = excluded.trial_ends_at, seen_at = excluded.seen_at
    where ${trialWatch.trialEndsAt} <> excluded.trial_ends_at`);
  await db.execute(
    sql`delete from ${trialWatch} where ${trialWatch.trialEndsAt} < ${now - TIPS.trialWatchKeepMs}::bigint
      or exists (select 1 from ${notificationSettings} where ${notificationSettings.userId} = ${trialWatch.userId} and not ${notificationSettings.tipEmails})`,
  );
}

// Resend took none of the batch, so its tips can go on a later run.
async function release(batch: readonly Claimed[], now: number): Promise<void> {
  const db = await getDb();
  await db.delete(emailLog).where(
    and(
      eq(emailLog.createdAt, now),
      inArray(
        emailLog.userId,
        batch.map((item) => item.userId),
      ),
    ),
  );
}

function emailFor(item: Claimed, now: number): EmailMessage {
  const base = appUrl();
  const at = (path: string) => new URL(path, base).toString();
  return tipEmail({
    to: item.email,
    kind: item.kind,
    trialEndsAt: item.trialEndsAt,
    timeZone: item.timeZone,
    month: now,
    urls: {
      resumes: emailLink(at(ROUTES.dashboardResumes), "tips", item.kind),
      jobs: emailLink(at(ROUTES.dashboardJobs), "tips", item.kind),
      plans: emailLink(at(ROUTES.pricing), "tips", item.kind),
    },
    links: {
      ottoHeadUrl: at(OTTO_HEAD_EMAIL_PATH),
      settingsUrl: emailLink(at(accountSectionHref("reminders")), "tips", "settings"),
      unsubscribeUrl: unsubscribeUrl(item.userId, "tips"),
    },
  });
}

// Same batch, same key: a retried run inside Resend's 24-hour window can't send it twice.
function batchKey(claimed: readonly Claimed[]): string {
  const ids = claimed
    .map((item) => `${item.userId}:${item.kind}:${item.occasion}`)
    .sort()
    .join(",");
  return `tips-${createHash("sha256").update(ids).digest("hex").slice(0, 40)}`;
}

type Stats = Record<"users" | "emailsSent" | "emailsFailed" | "released" | TipEmailKind, number>;

async function claimOccasion(
  occasion: Occasion,
  room: number,
  { now, deadline }: CronContext,
  failed: Set<string>,
): Promise<{ claimed: Claimed[]; done: boolean }> {
  const db = await getDb();
  const claimed: Claimed[] = [];
  let cursor: string | null = null;
  while (claimed.length < room) {
    if (Date.now() >= deadline) return { claimed, done: false };
    const rows: { userId: string }[] = await db
      .select({ userId: users.id })
      .from(users)
      .where(and(eligible(occasion, now), cursor === null ? undefined : gt(users.id, cursor)))
      .orderBy(asc(users.id))
      .limit(TIPS.pageSize);
    cursor = rows.at(-1)?.userId ?? cursor;
    const ids = rows.map((row) => row.userId);
    const busy =
      occasion.kind === "win_back" ? await browsedJobsLately(ids, now) : new Set<string>();
    for (const userId of ids) {
      if (claimed.length >= room) return { claimed, done: false };
      if (busy.has(userId)) continue;
      try {
        const result = await claim(userId, occasion, now);
        if (result) claimed.push(result);
      } catch (error) {
        log.error("cron.tip_emails.claim_failed", error, { kind: occasion.kind });
        failed.add("claim");
      }
    }
    if (rows.length < TIPS.pageSize) return { claimed, done: true };
  }
  return { claimed, done: false };
}

export async function runTipEmails(
  context: CronContext,
  { sender }: TipDeps,
): Promise<CronOutcome> {
  const stats: Stats = {
    users: 0,
    emailsSent: 0,
    emailsFailed: 0,
    released: 0,
    trial_ended: 0,
    no_resume: 0,
    fixes_back: 0,
    win_back: 0,
  };
  // Nothing is logged without a way to send it, so each tip still goes out once email is set up.
  if (!sender) return { stats: { ...stats, emailOff: 1 }, complete: true, failed: [] };
  // Tips promote the service, so they wait for a sender address to put in the footer.
  if (!senderPostalAddress()) {
    return { stats: { ...stats, noAddress: 1 }, complete: true, failed: [] };
  }
  const failed = new Set<string>();
  await watchTrials(context.now);

  const claimed: Claimed[] = [];
  const allowed = await optionalEmailRoom("tips", context.now);
  let complete = true;
  for (const occasion of tipOccasions(context.now)) {
    const room = allowed - claimed.length;
    if (room <= 0) {
      complete = false;
      break;
    }
    const result = await claimOccasion(occasion, room, context, failed);
    claimed.push(...result.claimed);
    stats[occasion.kind] += result.claimed.length;
    if (!result.done) complete = false;
  }
  stats.users = claimed.length;

  for (let start = 0; start < claimed.length; start += EMAIL_BATCH_MAX) {
    const batch = claimed.slice(start, start + EMAIL_BATCH_MAX);
    try {
      const result = await sender.sendBatch(
        batch.map((item) => emailFor(item, context.now)),
        batchKey(batch),
      );
      stats.emailsSent += result.sent;
      stats.emailsFailed += result.failed;
      if (result.refused) {
        const unsent = claimed.slice(start);
        await release(unsent, context.now);
        stats.released += unsent.length;
        break;
      }
    } catch (error) {
      log.error("cron.tip_emails.email_failed", error, { messages: batch.length });
      stats.emailsFailed += batch.length;
    }
  }
  return { stats, complete, failed: [...failed] };
}
