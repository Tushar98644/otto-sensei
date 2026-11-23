import { createHash } from "node:crypto";
import { and, desc, eq, lt, notInArray, or, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { matchCache } from "@/db/schema";
import { log } from "@/lib/log";
import { DAY_MS } from "@/lib/time";

export type CacheParts = {
  variant: string;
  builtAt: number;
  now: number;
  plan: "free" | "pro";
  profileHash: string;
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
    log.warn("jobs.cache_read_failed", {}, error);
    return null;
  }
}

export async function writeMatchCache(
  db: Db,
  userId: string,
  entries: readonly { key: string; value: unknown }[],
  now: number,
): Promise<void> {
  if (entries.length === 0) return;
  try {
    await db
      .insert(matchCache)
      .values(entries.map(({ key, value }) => ({ userId, key, value, createdAt: now })))
      .onConflictDoUpdate({
        target: [matchCache.userId, matchCache.key],
        set: { value: sql.raw(`excluded.${matchCache.value.name}`), createdAt: now },
      });
    await pruneMatchCache(db, userId, now);
  } catch (error) {
    log.warn("jobs.cache_write_failed", {}, error);
  }
}

// Keys carry the day, so earlier days can't be read again; a long browse keeps only its newest pages.
async function pruneMatchCache(db: Db, userId: string, now: number): Promise<void> {
  const newest = db
    .select({ key: matchCache.key })
    .from(matchCache)
    .where(eq(matchCache.userId, userId))
    .orderBy(desc(matchCache.createdAt), matchCache.key)
    .limit(MATCH_CACHE_PER_ACCOUNT);
  await db
    .delete(matchCache)
    .where(
      and(
        eq(matchCache.userId, userId),
        or(
          lt(matchCache.createdAt, Math.floor(now / DAY_MS) * DAY_MS),
          notInArray(matchCache.key, newest),
        ),
      ),
    );
}

export const MATCH_CACHE_MAX_AGE_MS = DAY_MS;
export const MATCH_CACHE_PER_ACCOUNT = 12;
