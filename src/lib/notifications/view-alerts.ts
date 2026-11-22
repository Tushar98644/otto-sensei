import { and, asc, eq, isNull, lte, or, sql } from "drizzle-orm";
import { PORTFOLIO_ROUTE } from "@/components/portfolio/route";
import { ROUTES } from "@/components/site/routes";
import { getDb } from "@/db/client";
import { lockUser } from "@/db/locks";
import { portfolios, resumes, shares } from "@/db/schema";
import type { CronContext, CronOutcome } from "@/lib/cron/run";
import { log } from "@/lib/log";
import { DAY_MS, HOUR_MS } from "@/lib/time";
import { insertNotification } from "./records";

// Bell alerts when someone opens a share link or the portfolio, in the bell only: counts and when, never who.

export const VIEW_ALERTS = {
  // At most one bell alert per link per day.
  shareEveryMs: DAY_MS,
  // A little under a week, so next week's run at about the same hour still counts.
  portfolioEveryMs: 7 * DAY_MS - 6 * HOUR_MS,
  // Longer than this since the last count, and the alert names the day it counts from.
  weekMs: 8 * DAY_MS,
  portfoliosPerBatch: 50,
  maxPortfolioBatches: 20,
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

export async function runViewAlerts(context: CronContext): Promise<CronOutcome> {
  try {
    const notes = await notePortfolios(context);
    return { stats: notes.stats, complete: notes.complete, failed: [] };
  } catch (error) {
    log.error("cron.view_alerts.portfolios_failed", error);
    return { stats: {}, complete: true, failed: ["portfolios"] };
  }
}
