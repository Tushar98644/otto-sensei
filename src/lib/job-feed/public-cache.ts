import { revalidateTag, unstable_cache } from "next/cache";
import { log } from "@/lib/log";

// Server-only, Next runtime only. The public /jobs list, its counts and the /jobs/[id] pages read
// the database once a day instead of on every visit (about 28k job pages can be crawled, and the
// old per-visit count took 784 ms at 50k rows). The ingest cron drops the cache when it finishes.

export const JOBS_CACHE_TAG = "jobs";
const DAY_S = 24 * 60 * 60;

/** `load` kept for a day under the jobs tag, keyed by `name` and its arguments. */
export function cachedForDay<Args extends unknown[], Result>(
  name: string,
  load: (...args: Args) => Promise<Result>,
): (...args: Args) => Promise<Result> {
  return unstable_cache(load, [name], { revalidate: DAY_S, tags: [JOBS_CACHE_TAG] });
}

/** After an ingest: the next visit reads the new jobs. Never fails the cron. */
export function dropJobsCache(): void {
  try {
    revalidateTag(JOBS_CACHE_TAG, "max");
  } catch (error) {
    log.warn("jobs.cache_drop_failed", {}, error);
  }
}
