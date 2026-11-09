import { fail } from "@/lib/api/respond";
import { rateLimit, retryAfterHeader, waitText } from "@/lib/rate-limit";

// What both writings routes say and share. Route files may only export handlers and route config.

// Per-user answers, so no browser or CDN may keep a copy.
export const NO_STORE = { "Cache-Control": "no-store" };
export const SIGN_IN = "Sign in to see your cover letters and answers.";
export const NOT_FOUND = "That letter isn't in your list anymore.";
export const INVALID = "That letter couldn't be saved. Reload the page and try again.";

const HOUR_MS = 60 * 60 * 1000;
// Saving an edit happens on every pause in typing; this only stops a script.
const WRITES_PER_HOUR = 600;

/** Saves, edits and deletes share one hourly budget per account. A 429 when it's spent. */
export async function writeLimited(userId: string): Promise<Response | null> {
  const limit = await rateLimit(`writings:write:user:${userId}`, WRITES_PER_HOUR, HOUR_MS);
  if (limit.allowed) return null;
  return fail(
    "rate_limited",
    `That's a lot of changes in one hour. Try again in ${waitText(limit.retryAfterMs)}.`,
    429,
    retryAfterHeader(limit.retryAfterMs),
  );
}
