export const FRESH_MS = 10 * 60_000;
// Kept past freshness for If-None-Match: GitHub doesn't count a 304 against its limit.
const KEEP_MS = 60 * 60_000;
export const MISSING_MS = 2 * 60_000;
const MAX_ENTRIES = 200;

export type CacheEntry = {
  at: number;
  etag: string | null;
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
