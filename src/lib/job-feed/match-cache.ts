import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { matchCache } from "@/db/schema";
import { log } from "@/lib/log";

// Server-only. One page of Matches kept for the day (match_cache), so a repeat visit, a page
// change back or a reload costs one lookup instead of a full ranking. The key holds everything
// the page depends on, so nothing has to be invalidated by hand: a new ingest run, a new day, an
// edited resume, "Looking for", the work profile or the plan each make a new key, and the
// cleanup cron deletes rows older than a day.

const DAY_MS = 24 * 60 * 60 * 1_000;

export type CacheParts = {
  variant: string;
  builtAt: number;
  now: number;
  plan: "free" | "pro";
  profileHash: string;
  // Already-resolved inputs: filters, "Looking for", page, and the work profile as ranked.
  inputs: unknown;
};

export function matchCacheKey(parts: CacheParts): string {
  const day = Math.floor(parts.now / DAY_MS);
  const facts = JSON.stringify([
    parts.variant,
    parts.builtAt,
    day,
    parts.plan,
    parts.profileHash,
    parts.inputs,
  ]);
  return createHash("sha256").update(facts).digest("base64url").slice(0, 32);
}

export async function readMatchCache<T>(db: Db, userId: string, key: string): Promise<T | null> {
  try {
    const [row] = await db
      .select({ value: matchCache.value })
      .from(matchCache)
      .where(and(eq(matchCache.userId, userId), eq(matchCache.key, key)))
      .limit(1);
    return row ? (row.value as T) : null;
  } catch (error) {
    // Before the migration, or a cache problem: rank afresh.
    log.warn("jobs.cache_read_failed", {}, error);
    return null;
  }
}

export async function writeMatchCache(
  db: Db,
  userId: string,
  key: string,
  value: unknown,
  now: number,
): Promise<void> {
  try {
    await db
      .insert(matchCache)
      .values({ userId, key, value, createdAt: now })
      .onConflictDoUpdate({
        target: [matchCache.userId, matchCache.key],
        set: { value, createdAt: now },
      });
  } catch (error) {
    log.warn("jobs.cache_write_failed", {}, error);
  }
}

export const MATCH_CACHE_MAX_AGE_MS = DAY_MS;
