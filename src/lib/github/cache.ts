// Server-only. A small in-memory cache for GitHub answers, per server instance. GitHub allows 60
// calls an hour per server address without a token (10 searches a minute), shared by everyone
// using the app, so a person who looks up a name and then drafts from it must not pay twice.
// Entries hold the mapped, trimmed values, never raw responses, to stay small.

export const FRESH_MS = 10 * 60_000;
// Kept past freshness so a conditional request (If-None-Match) can revive them: GitHub doesn't
// count a 304 against its rate limit.
const KEEP_MS = 60 * 60_000;
// A misspelt name is often retried as typed; a short memory of "no such account" saves calls.
export const MISSING_MS = 2 * 60_000;
const MAX_ENTRIES = 200;

export type CacheEntry = {
  at: number;
  etag: string | null;
  // null: GitHub answered "not found".
  value: unknown;
};

const entries = new Map<string, CacheEntry>();

export function cacheGet(key: string, now: number): CacheEntry | null {
  const entry = entries.get(key);
  if (!entry) return null;
  if (now - entry.at > KEEP_MS) {
    entries.delete(key);
    return null;
  }
  // Map order is the eviction order, so a read moves the entry to the back.
  entries.delete(key);
  entries.set(key, entry);
  return entry;
}

export function isFresh(entry: CacheEntry, now: number): boolean {
  return now - entry.at <= (entry.value === null ? MISSING_MS : FRESH_MS);
}

export function cacheSet(key: string, entry: CacheEntry): void {
  entries.delete(key);
  entries.set(key, entry);
  while (entries.size > MAX_ENTRIES) {
    const oldest = entries.keys().next().value;
    if (oldest === undefined) break;
    entries.delete(oldest);
  }
}

export function clearGitHubCache(): void {
  entries.clear();
}
