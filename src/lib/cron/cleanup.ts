import { and, eq, inArray, isNotNull, lt, ne, or, sql } from "drizzle-orm";
import { TOMBSTONE_MAX_AGE_MS, trimOldTombstones } from "@/app/api/resumes/backups";
import { getDb } from "@/db/client";
import {
  billingLog,
  inboundEmails,
  matchCache,
  matchEvents,
  meteredCalls,
  notifications,
  rateLimits,
  usage,
} from "@/db/schema";
import { retryPendingReplacements } from "@/lib/billing/replacements";
import { deleteExpiredExtensionTokens } from "@/lib/extension/tokens";
import { releaseHandles } from "@/lib/inbound/handles";
import { MATCH_CACHE_MAX_AGE_MS } from "@/lib/job-feed/match-cache";
import { log } from "@/lib/log";
import { dropExpiredRedirects } from "@/lib/portfolio/records";
import { trimOldRecaps } from "@/lib/recap/records";
import { DAY_MS } from "@/lib/time";
import { cycleKey, monthKey } from "@/lib/usage";
import { drain, type CronContext, type CronOutcome } from "./run";

export const RETENTION = {
  rateLimitWindowsMs: 2 * DAY_MS,
  tombstonesMs: TOMBSTONE_MAX_AGE_MS,
  readNotificationsMs: 90 * DAY_MS,
  anyNotificationsMs: 365 * DAY_MS,
  // Dodo stops retrying a webhook after about 27 hours, so an id this old can never arrive again.
  billingEventsMs: 400 * DAY_MS,
  impressionsMs: 30 * DAY_MS,
  // Open, save, tailor, applied, not a fit: enough to compare ranking variants over a quarter.
  matchActionsMs: 90 * DAY_MS,
  // Past periods' allowance counts are never read; kept as long as billing events, a yearly plan and its disputes.
  usagePeriodsMs: 400 * DAY_MS,
  // A paid checkout's credit is its own row by then, and an unpaid one has long expired.
  creditCheckoutsMs: 30 * DAY_MS,
  // The spend history, as long as the allowance counts beside it.
  creditSpendsMs: 400 * DAY_MS,
  matchCacheMs: MATCH_CACHE_MAX_AGE_MS,
  // What Otto read in a job email shows for six months, then goes.
  inboundEmailsMs: 180 * DAY_MS,
} as const;

export const CLEANUP_BATCH = 1_000;
const MAX_BATCHES = 50;
export const TRIAL_CANCEL_BATCH = 25;

type Step = { name: string; run: () => Promise<number>; batchSize?: number };

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
    { name: "tombstones", run: () => trimOldTombstones(now, CLEANUP_BATCH) },
    {
      name: "notifications",
      run: async () => {
        const stale = db
          .select({ id: notifications.id })
          .from(notifications)
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
        const { kind, key, at } = billingLog;
        const stale = db
          .select({ key })
          .from(billingLog)
          .where(and(eq(kind, "event"), lt(at, now - RETENTION.billingEventsMs)))
          .limit(CLEANUP_BATCH);
        const deleted = await db
          .delete(billingLog)
          .where(and(eq(kind, "event"), sql`${key} in ${stale}`))
          .returning({ key });
        return deleted.length;
      },
    },
    {
      name: "creditLedger",
      run: async () => {
        const { kind, key, at } = billingLog;
        const old = or(
          and(eq(kind, "topup_checkout"), lt(at, now - RETENTION.creditCheckoutsMs)),
          and(eq(kind, "credit_spend"), lt(at, now - RETENTION.creditSpendsMs)),
        );
        const stale = db
          .select({ kind, key })
          .from(billingLog)
          .where(and(inArray(kind, ["topup_checkout", "credit_spend"]), old))
          .limit(CLEANUP_BATCH);
        const deleted = await db
          .delete(billingLog)
          .where(sql`(${kind}, ${key}) in ${stale}`)
          .returning({ key });
        return deleted.length;
      },
    },
    {
      name: "impressions",
      run: async () => {
        const stale = db
          .select({ id: matchEvents.id })
          .from(matchEvents)
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
      name: "replacedTrials",
      batchSize: TRIAL_CANCEL_BATCH,
      run: () => retryPendingReplacements({ now, deadline, limit: TRIAL_CANCEL_BATCH }),
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
    {
      name: "meteredCalls",
      run: async () => {
        const { userId, kind, key } = meteredCalls;
        const stale = db
          .select({ userId, kind, key })
          .from(meteredCalls)
          .where(lt(meteredCalls.expiresAt, now))
          .limit(CLEANUP_BATCH);
        const deleted = await db
          .delete(meteredCalls)
          .where(sql`(${userId}, ${kind}, ${key}) in ${stale}`)
          .returning({ key });
        return deleted.length;
      },
    },
    { name: "extensionTokens", run: () => deleteExpiredExtensionTokens(now, CLEANUP_BATCH) },
    { name: "inboundHandles", run: () => releaseHandles(now, CLEANUP_BATCH) },
    {
      name: "inboundEmails",
      run: async () => {
        const stale = db
          .select({ id: inboundEmails.id })
          .from(inboundEmails)
          .where(lt(inboundEmails.receivedAt, now - RETENTION.inboundEmailsMs))
          .limit(CLEANUP_BATCH);
        const deleted = await db
          .delete(inboundEmails)
          .where(sql`${inboundEmails.id} in ${stale}`)
          .returning({ id: inboundEmails.id });
        return deleted.length;
      },
    },
    {
      name: "matchActions",
      run: async () => {
        const stale = db
          .select({ id: matchEvents.id })
          .from(matchEvents)
          .where(
            and(
              lt(matchEvents.createdAt, now - RETENTION.matchActionsMs),
              ne(matchEvents.kind, "impression"),
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
      name: "usagePeriods",
      run: async () => {
        const cutoff = now - RETENTION.usagePeriodsMs;
        const iso = new Date(cutoff).toISOString();
        // Keys sort by time within each kind: "YYYY-MM", "cycle:<start>", and the old "week:<end>".
        const over = or(
          and(sql`${usage.period} ~ '^[0-9]{4}-[0-9]{2}$'`, lt(usage.period, monthKey(cutoff))),
          and(sql`${usage.period} like 'cycle:%'`, lt(usage.period, cycleKey(cutoff))),
          and(sql`${usage.period} like 'week:%'`, lt(usage.period, `week:${iso}`)),
        );
        const { subject, feature, period } = usage;
        const stale = db
          .select({ subject, feature, period })
          .from(usage)
          .where(over)
          .limit(CLEANUP_BATCH);
        const deleted = await db
          .delete(usage)
          .where(sql`(${subject}, ${feature}, ${period}) in ${stale}`)
          .returning({ period });
        return deleted.length;
      },
    },
    { name: "portfolioRedirects", run: () => dropExpiredRedirects(now, CLEANUP_BATCH) },
    { name: "recaps", run: () => trimOldRecaps(now, CLEANUP_BATCH) },
  ];

  const stats: Record<string, number> = {};
  const failed: string[] = [];
  let complete = true;
  // One after another: they share the connection pool with live requests.
  for (const step of steps) {
    try {
      const { count, done } = await drain(step.run, {
        batchSize: step.batchSize ?? CLEANUP_BATCH,
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
