import type { JobMatchesResponse } from "@/lib/api/types";

// The Jobs tab's last answers, kept for the tab's life. Coming back to the tab (from the studio
// after tailoring, say) shows the matches at once instead of three skeleton cards and a new
// ranking request. An answer is used as is for FRESH_MS after it arrived; an older one stays on
// screen while a new one is asked for.

export const FRESH_MS = 5 * 60_000;
const MAX_KEPT = 12;

export type KeptMatches = { data: JobMatchesResponse; at: number };

const kept = new Map<string, KeptMatches>();

/** Per account, so a different sign-in in the same tab never sees the last person's saved jobs. */
export function matchCacheKey(userId: string | null, body: unknown): string | null {
  return userId && body ? `${userId}|${JSON.stringify(body)}` : null;
}

export function recallMatches(key: string | null): KeptMatches | null {
  return key ? (kept.get(key) ?? null) : null;
}

/** `at`: when the server answered. A change made on the page (a save) keeps the answer's age. */
export function rememberMatches(key: string, data: JobMatchesResponse, at: number): void {
  kept.delete(key);
  kept.set(key, { data, at });
  while (kept.size > MAX_KEPT) {
    const oldest = kept.keys().next().value;
    if (oldest === undefined) break;
    kept.delete(oldest);
  }
}

/** After a change that touches every answer (a job saved or unsaved). */
export function forgetMatchesExcept(key: string | null): void {
  for (const other of [...kept.keys()]) if (other !== key) kept.delete(other);
}

/** Fresh enough to show without asking again, judged against when the page was opened. */
export function isFreshMatch(entry: KeptMatches | null, openedAt: number): boolean {
  return entry !== null && openedAt - entry.at < FRESH_MS;
}

export function forgetMatchesForTests(): void {
  kept.clear();
}
