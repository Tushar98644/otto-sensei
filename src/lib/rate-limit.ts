import { and, eq, gt, lt, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { rateLimits } from "@/db/schema";
import { log } from "@/lib/log";
import { HOUR_MS } from "@/lib/time";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

const RETENTION_MS = 2 * 24 * 60 * 60 * 1000;
const CLEANUP_EVERY = 50;
const CLEANUP_BATCH = 500;
// Keys embed caller-controlled text (emails, forwarded IPs), so cap them to keep rows small.
const MAX_KEY_LENGTH = 512;

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): Promise<RateLimitResult> {
  const windowStart = windowStartOf(now, windowMs);
  const count = await countInDb(key.slice(0, MAX_KEY_LENGTH), windowStart, now);

  const allowed = count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - count),
    retryAfterMs: allowed ? 0 : windowStart + windowMs - now,
  };
}

// Use the `now` the call was counted with, so a late give-back can't credit the next window.
export async function giveBackRateLimit(key: string, windowMs: number, now: number): Promise<void> {
  const db = await getDb();
  await db
    .update(rateLimits)
    .set({ count: sql`${rateLimits.count} - 1` })
    .where(
      and(
        eq(rateLimits.key, key.slice(0, MAX_KEY_LENGTH)),
        eq(rateLimits.windowStart, windowStartOf(now, windowMs)),
        gt(rateLimits.count, 0),
      ),
    );
}

function windowStartOf(now: number, windowMs: number): number {
  if (!(windowMs > 0)) throw new RangeError("rateLimit: windowMs must be positive");
  return Math.floor(now / windowMs) * windowMs;
}

async function countInDb(key: string, windowStart: number, now: number): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .insert(rateLimits)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [rateLimits.key, rateLimits.windowStart],
      set: { count: sql`${rateLimits.count} + 1` },
    })
    .returning({ count: rateLimits.count });
  if (!row) throw new Error("rateLimit: upsert returned no row");
  if (now % CLEANUP_EVERY === 0) await pruneOldWindows(now);
  return row.count;
}

export function retryAfterHeader(retryAfterMs: number): Record<string, string> {
  return { "Retry-After": String(Math.max(1, Math.ceil(retryAfterMs / 1000))) };
}

export function waitText(retryAfterMs: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterMs / 60_000));
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}

export function waitLong(retryAfterMs: number): string {
  if (retryAfterMs < HOUR_MS) return waitText(retryAfterMs);
  const hours = Math.ceil(retryAfterMs / HOUR_MS);
  return hours === 1 ? "1 hour" : `${hours} hours`;
}

async function pruneOldWindows(now: number): Promise<void> {
  try {
    const db = await getDb();
    const stale = db
      .select({ key: rateLimits.key, windowStart: rateLimits.windowStart })
      .from(rateLimits)
      .where(lt(rateLimits.windowStart, now - RETENTION_MS))
      .limit(CLEANUP_BATCH);
    await db.delete(rateLimits).where(sql`(${rateLimits.key}, ${rateLimits.windowStart}) in ${stale}`);
  } catch (error) {
    log.warn("rate_limit.cleanup_failed", {}, error);
  }
}
