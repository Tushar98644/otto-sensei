import { and, eq, isNotNull, lt, or, sql } from "drizzle-orm";
import { TOMBSTONE_MAX_AGE_MS } from "@/app/api/resumes/backups";
import { getDb } from "@/db/client";
import {
  billingEvents,
  matchCache,
  matchEvents,
  notifications,
  rateLimits,
  resumeTombstones,
} from "@/db/schema";
import { MATCH_CACHE_MAX_AGE_MS } from "@/lib/job-feed/match-cache";
import { log } from "@/lib/log";
import { drain, type CronContext, type CronOutcome } from "./run";

// Server-only. The daily cleanup: rows that no request needs any more, deleted oldest-first in
// bounded batches through an index on their age. Idempotent, so a repeated or overlapping run
// only finds less to do. Request paths still prune a little on their own (rate-limit.ts,
// deleteBackup); this catches what they never reach, such as keys that are never used again.

const DAY_MS = 24 * 60 * 60 * 1_000;

export const RETENTION = {
  // rate-limit.ts keeps windows 2 days; the longest window in use is one day.
  rateLimitWindowsMs: 2 * DAY_MS,
  // Same age deleteBackup prunes by, for accounts that stopped deleting resumes.
  tombstonesMs: TOMBSTONE_MAX_AGE_MS,
  readNotificationsMs: 90 * DAY_MS,
  // Unread ones too, eventually: nobody opens a year-old reminder.
  anyNotificationsMs: 365 * DAY_MS,
  // Creem stops redelivering a webhook after a day, so an id this old can never arrive again.
  billingEventsMs: 400 * DAY_MS,
  // Jobs-tab impressions: 20 rows a view, about 130 MB a month at 1,000 users
  // (AUDIT-cost-and-findability.md). Three months is enough to compare two orderings. Actions
  // (open, save, applied, "not a fit") stay: they are few and are what ranking learns from.
  impressionsMs: 90 * DAY_MS,
  // A cached Matches page is only read on the day it was ranked (match-cache.ts).
  matchCacheMs: MATCH_CACHE_MAX_AGE_MS,
} as const;

export const CLEANUP_BATCH = 1_000;
// Per table per run: at most 50,000 rows, so one run stays short and a backlog drains over days.
const MAX_BATCHES = 50;

type Step = { name: string; run: () => Promise<number> };

export async function runCleanup({ now, deadline }: CronContext): Promise<CronOutcome> {
  const db = await getDb();

  const steps: Step[] = [
    {
      name: "rateLimits",
      run: async () => {
        const stale = db
          .select({ key: rateLimits.key, windowStart: rateLimits.windowStart })
          .from(rateLimits)
          .where(lt(rateLimits.windowStart, now - RETENTION.rateLimitWindowsMs))
          .limit(CLEANUP_BATCH);
        const deleted = await db
          .delete(rateLimits)
          .where(sql`(${rateLimits.key}, ${rateLimits.windowStart}) in ${stale}`)
          .returning({ key: rateLimits.key });
        return deleted.length;
      },
    },
    {
      name: "tombstones",
      run: async () => {
        const stale = db
          .select({ userId: resumeTombstones.userId, id: resumeTombstones.id })
          .from(resumeTombstones)
          .where(lt(resumeTombstones.deletedAt, now - RETENTION.tombstonesMs))
          .limit(CLEANUP_BATCH);
        const deleted = await db
          .delete(resumeTombstones)
          .where(sql`(${resumeTombstones.userId}, ${resumeTombstones.id}) in ${stale}`)
          .returning({ id: resumeTombstones.id });
        return deleted.length;
      },
    },
    {
      name: "notifications",
      run: async () => {
        const stale = db
          .select({ id: notifications.id })
          .from(notifications)
          // One range on notifications_created_idx, then the read check on the rows it finds.
          .where(
            and(
              lt(notifications.createdAt, now - RETENTION.readNotificationsMs),
              or(
                isNotNull(notifications.readAt),
                lt(notifications.createdAt, now - RETENTION.anyNotificationsMs),
              ),
            ),
          )
          .limit(CLEANUP_BATCH);
        const deleted = await db
          .delete(notifications)
          .where(sql`${notifications.id} in ${stale}`)
          .returning({ id: notifications.id });
        return deleted.length;
      },
    },
    {
      name: "billingEvents",
      run: async () => {
        const stale = db
          .select({ id: billingEvents.id })
          .from(billingEvents)
          .where(lt(billingEvents.receivedAt, now - RETENTION.billingEventsMs))
          .limit(CLEANUP_BATCH);
        const deleted = await db
          .delete(billingEvents)
          .where(sql`${billingEvents.id} in ${stale}`)
          .returning({ id: billingEvents.id });
        return deleted.length;
      },
    },
    {
      name: "impressions",
      run: async () => {
        const stale = db
          .select({ id: matchEvents.id })
          .from(matchEvents)
          // A range on match_events_created_idx, then the kind check on the rows it finds.
          .where(
            and(
              lt(matchEvents.createdAt, now - RETENTION.impressionsMs),
              eq(matchEvents.kind, "impression"),
            ),
          )
          .limit(CLEANUP_BATCH);
        const deleted = await db
          .delete(matchEvents)
          .where(sql`${matchEvents.id} in ${stale}`)
          .returning({ id: matchEvents.id });
        return deleted.length;
      },
    },
    {
      name: "matchCache",
      run: async () => {
        const stale = db
          .select({ userId: matchCache.userId, key: matchCache.key })
          .from(matchCache)
          .where(lt(matchCache.createdAt, now - RETENTION.matchCacheMs))
          .limit(CLEANUP_BATCH);
        const deleted = await db
          .delete(matchCache)
          .where(sql`(${matchCache.userId}, ${matchCache.key}) in ${stale}`)
          .returning({ key: matchCache.key });
        return deleted.length;
      },
    },
  ];

  const stats: Record<string, number> = {};
  const failed: string[] = [];
  let complete = true;
  // One after another: they share the connection pool with live requests.
  for (const step of steps) {
    try {
      const { count, done } = await drain(step.run, {
        batchSize: CLEANUP_BATCH,
        maxBatches: MAX_BATCHES,
        deadline,
      });
      stats[step.name] = count;
      if (!done) complete = false;
    } catch (error) {
      log.error("cron.cleanup.step_failed", error, { step: step.name });
      stats[step.name] = 0;
      failed.push(step.name);
    }
  }
  return { stats, complete, failed };
}
