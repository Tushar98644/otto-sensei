import { createHash } from "node:crypto";
import { and, asc, desc, eq, gt, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { accountSectionHref } from "@/components/setup/links";
import { PORTFOLIO_ROUTE } from "@/components/portfolio/route";
import { ROUTES } from "@/components/site/routes";
import { getDb } from "@/db/client";
import { lockUser } from "@/db/locks";
import {
  notifications,
  notificationSettings,
  portfolios,
  resumes,
  shares,
  users,
} from "@/db/schema";
import { emailLink } from "@/lib/analytics/landing";
import type { CronContext, CronOutcome } from "@/lib/cron/run";
import { appUrl } from "@/lib/env";
import { log } from "@/lib/log";
import { DAY_MS, HOUR_MS } from "@/lib/time";
import { optionalEmailRoom } from "./budget";
import { EMAIL_BATCH_MAX, type EmailMessage, type EmailSender } from "./email";
import { OTTO_HEAD_EMAIL_PATH } from "./follow-up";
import { insertNotification } from "./records";
import { VIEW_KINDS } from "./types";
import { unsubscribeUrl } from "./unsubscribe";
import { viewsEmail, type ViewLine } from "./views-email";

// Bell alerts when someone opens a share link or the portfolio: counts and when, never who.

export const VIEW_ALERTS = {
  // At most one bell alert per link per day.
  shareEveryMs: DAY_MS,
  // A little under a week, so next week's run at about the same hour still counts.
  portfolioEveryMs: 7 * DAY_MS - 6 * HOUR_MS,
  // Longer than this since the last count, and the alert names the day it counts from.
  weekMs: 8 * DAY_MS,
  portfoliosPerBatch: 50,
  maxPortfolioBatches: 20,
  emailsPerBatch: EMAIL_BATCH_MAX,
  linesPerEmail: 6,
} as const;

const count = new Intl.NumberFormat("en-US");
const SINCE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

const views = (n: number) => `${count.format(n)} ${n === 1 ? "view" : "views"}`;

export type ViewNotice = { title: string; body: string; link: string };

export function shareViewNotice(name: string, total: number): ViewNotice {
  const which = name.trim() ? `Your link for “${name.trim()}”` : "Your resume link";
  return {
    title: "Someone opened your resume link",
    body: `${which} has ${views(total)} so far.`,
    link: ROUTES.dashboardResumes,
  };
}

export function portfolioViewsNotice(gained: number, since: number, now: number): ViewNotice {
  const period = now - since <= VIEW_ALERTS.weekMs ? "this week" : `since ${SINCE.format(since)}`;
  return {
    title: `Your portfolio got ${views(gained)} ${period}`,
    body: "Counted without you, link previews or search engines.",
    link: PORTFOLIO_ROUTE,
  };
}

// The owner's own name for the resume: its title in Otto, else the name on it.
const linkName = sql<string>`coalesce(
  nullif(trim((select ${resumes.data} ->> 'title' from ${resumes} where ${resumes.userId} = ${shares.userId} and ${resumes.id} = ${shares.resumeId})), ''),
  ${shares.snapshot} -> 'basics' ->> 'name',
  ''
)`;

// Called after a counted view; true when it made a bell alert.
export async function noteShareView(
  shareId: string,
  ownerId: string,
  now = Date.now(),
): Promise<boolean> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    if (!(await lockUser(tx, ownerId))) return false;
    const [share] = await tx
      .update(shares)
      .set({ viewAlertedAt: now })
      .where(
        and(
          eq(shares.id, shareId),
          eq(shares.userId, ownerId),
          isNull(shares.revokedAt),
          or(
            isNull(shares.viewAlertedAt),
            lte(shares.viewAlertedAt, now - VIEW_ALERTS.shareEveryMs),
          ),
        ),
      )
      .returning({ views: shares.views, name: linkName });
    if (!share) return false;
    const notice = shareViewNotice(share.name, share.views);
    await insertNotification(tx, { userId: ownerId, kind: "share_viewed", ...notice }, now);
    return true;
  });
}

type PortfolioDue = {
  id: string;
  userId: string;
  views: number;
  noted: number;
  since: number;
};

function portfolioDue(now: number) {
  const since = sql<number>`coalesce(${portfolios.viewsNotedAt}, ${portfolios.publishedAt}, ${portfolios.createdAt})`;
  return {
    since,
    where: and(
      eq(portfolios.published, true),
      sql`${since} <= ${now - VIEW_ALERTS.portfolioEveryMs}`,
    ),
  };
}

// Under the owner's lock, and only while the count it read still stands, so overlapping runs alert once.
async function notePortfolio(due: PortfolioDue, now: number): Promise<boolean> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    if (!(await lockUser(tx, due.userId))) return false;
    const [moved] = await tx
      .update(portfolios)
      .set({ viewsNoted: due.views, viewsNotedAt: now })
      .where(
        and(
          eq(portfolios.id, due.id),
          eq(portfolios.views, due.views),
          eq(portfolios.viewsNoted, due.noted),
        ),
      )
      .returning({ id: portfolios.id });
    const gained = due.views - due.noted;
    if (!moved || gained <= 0) return false;
    const notice = portfolioViewsNotice(gained, due.since, now);
    await insertNotification(tx, { userId: due.userId, kind: "portfolio_views", ...notice }, now);
    return true;
  });
}

async function notePortfolios({ now, deadline }: CronContext) {
  const db = await getDb();
  const stats = { portfoliosChecked: 0, portfolioAlerts: 0 };
  const { since, where } = portfolioDue(now);
  for (let batch = 0; batch < VIEW_ALERTS.maxPortfolioBatches; batch += 1) {
    if (Date.now() >= deadline) return { stats, complete: false };
    const rows: PortfolioDue[] = await db
      .select({
        id: portfolios.id,
        userId: portfolios.userId,
        views: portfolios.views,
        noted: portfolios.viewsNoted,
        since,
      })
      .from(portfolios)
      .where(where)
      .orderBy(asc(since), asc(portfolios.id))
      .limit(VIEW_ALERTS.portfoliosPerBatch);
    if (rows.length === 0) return { stats, complete: true };
    for (const due of rows) {
      stats.portfoliosChecked += 1;
      // A page with nothing new still moves its week on, so it isn't read again tomorrow.
      if (await notePortfolio({ ...due, since: Number(due.since) }, now))
        stats.portfolioAlerts += 1;
    }
  }
  return { stats, complete: false };
}

type Claimed = { userId: string; email: string; lines: ViewLine[]; emailedAt: number | null };

const emailCursor = sql<number>`coalesce(${notificationSettings.viewsEmailedAt}, 0)`;

// Stamped under the account's lock, only while it still points where it was read.
async function claimEmail(
  userId: string,
  emailedAt: number | null,
  now: number,
): Promise<Claimed | null> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    if (!(await lockUser(tx, userId))) return null;
    const stamped = await tx
      .update(notificationSettings)
      .set({ viewsEmailedAt: now })
      .where(
        and(
          eq(notificationSettings.userId, userId),
          eq(notificationSettings.viewEmails, true),
          emailedAt === null
            ? isNull(notificationSettings.viewsEmailedAt)
            : eq(notificationSettings.viewsEmailedAt, emailedAt),
        ),
      )
      .returning({ userId: notificationSettings.userId });
    if (stamped.length === 0) return null;
    const [owner] = await tx.select({ email: users.email }).from(users).where(eq(users.id, userId));
    const lines = await tx
      .select({ kind: notifications.kind, title: notifications.title, body: notifications.body })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          inArray(notifications.kind, [...VIEW_KINDS]),
          gt(notifications.createdAt, emailedAt ?? 0),
        ),
      )
      .orderBy(desc(notifications.createdAt))
      .limit(VIEW_ALERTS.linesPerEmail);
    if (!owner || lines.length === 0) return null;
    return { userId, email: owner.email, lines, emailedAt };
  });
}

async function release(batch: readonly Claimed[], now: number): Promise<void> {
  const db = await getDb();
  for (const item of batch) {
    await db
      .update(notificationSettings)
      .set({ viewsEmailedAt: item.emailedAt })
      .where(
        and(
          eq(notificationSettings.userId, item.userId),
          eq(notificationSettings.viewsEmailedAt, now),
        ),
      );
  }
}

function emailFor(item: Claimed): EmailMessage {
  const base = appUrl();
  const at = (path: string) => new URL(path, base).toString();
  const onlyPortfolio = item.lines.every((line) => line.kind === "portfolio_views");
  return viewsEmail({
    to: item.email,
    lines: item.lines,
    url: emailLink(
      at(onlyPortfolio ? PORTFOLIO_ROUTE : ROUTES.dashboardResumes),
      "views",
      onlyPortfolio ? "portfolio" : "resumes",
    ),
    links: {
      ottoHeadUrl: at(OTTO_HEAD_EMAIL_PATH),
      settingsUrl: emailLink(at(accountSectionHref("reminders")), "views", "settings"),
      unsubscribeUrl: unsubscribeUrl(item.userId, "views"),
    },
  });
}

function batchKey(claimed: readonly Claimed[], now: number): string {
  const ids = claimed
    .map((item) => item.userId)
    .sort()
    .join(",");
  return `views-${createHash("sha256").update(`${now}:${ids}`).digest("hex").slice(0, 40)}`;
}

async function sendEmails({ now, deadline }: CronContext, sender: EmailSender) {
  const db = await getDb();
  const stats = { emailsSent: 0, emailsFailed: 0, released: 0 };
  const cap = await optionalEmailRoom("views", now);
  if (cap === 0) return { stats, complete: false };
  // Only accounts with an alert since their last email, oldest waiting first.
  const due = await db
    .select({ userId: notificationSettings.userId, emailedAt: notificationSettings.viewsEmailedAt })
    .from(notificationSettings)
    .where(
      and(
        eq(notificationSettings.viewEmails, true),
        or(
          isNull(notificationSettings.viewsEmailedAt),
          lte(notificationSettings.viewsEmailedAt, now - VIEW_ALERTS.shareEveryMs + 4 * HOUR_MS),
        ),
        sql`exists (select 1 from ${notifications} n where n.user_id = ${notificationSettings.userId} and n.kind in ('share_viewed', 'portfolio_views') and n.created_at > ${emailCursor})`,
      ),
    )
    .orderBy(asc(emailCursor), asc(notificationSettings.userId))
    .limit(cap);
  const claimed: Claimed[] = [];
  for (const row of due) {
    if (Date.now() >= deadline) break;
    const item = await claimEmail(row.userId, row.emailedAt, now);
    if (item) claimed.push(item);
  }
  for (let start = 0; start < claimed.length; start += VIEW_ALERTS.emailsPerBatch) {
    const batch = claimed.slice(start, start + VIEW_ALERTS.emailsPerBatch);
    try {
      const result = await sender.sendBatch(batch.map(emailFor), batchKey(batch, now));
      stats.emailsSent += result.sent;
      stats.emailsFailed += result.failed;
      if (result.refused) {
        await release(batch, now);
        stats.released += batch.length;
      }
    } catch (error) {
      log.error("cron.view_alerts.email_failed", error, { messages: batch.length });
      stats.emailsFailed += batch.length;
    }
  }
  return { stats, complete: due.length < cap };
}

export type ViewAlertDeps = { sender: EmailSender | null };

export async function runViewAlerts(
  context: CronContext,
  { sender }: ViewAlertDeps,
): Promise<CronOutcome> {
  const failed: string[] = [];
  let stats: Record<string, number> = {};
  let complete = true;
  try {
    const notes = await notePortfolios(context);
    stats = { ...stats, ...notes.stats };
    complete &&= notes.complete;
  } catch (error) {
    log.error("cron.view_alerts.portfolios_failed", error);
    failed.push("portfolios");
  }
  if (!sender) return { stats: { ...stats, emailOff: 1 }, complete, failed };
  try {
    const emails = await sendEmails(context, sender);
    stats = { ...stats, ...emails.stats };
    complete &&= emails.complete;
  } catch (error) {
    log.error("cron.view_alerts.emails_failed", error);
    failed.push("emails");
  }
  return { stats, complete, failed };
}
