import { revalidateTag, unstable_cache } from "next/cache";
import { log } from "@/lib/log";

// Next runtime only. Public job pages read the database once a day, not per visit (~28k crawlable
// pages). The ingest cron drops the cache when it finishes.

export const JOBS_CACHE_TAG = "jobs";
const DAY_S = 24 * 60 * 60;

export function cachedForDay<Args extends unknown[], Result>(
  name: string,
  load: (...args: Args) => Promise<Result>,
): (...args: Args) => Promise<Result> {
  return unstable_cache(load, [name], { revalidate: DAY_S, tags: [JOBS_CACHE_TAG] });
}

/** Never fails the cron. */
export function dropJobsCache(): void {
  try {
    revalidateTag(JOBS_CACHE_TAG, "max");
  } catch (error) {
    log.warn("jobs.cache_drop_failed", {}, error);
  }
}
