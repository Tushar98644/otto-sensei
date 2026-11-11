import { revalidateTag, unstable_cache } from "next/cache";
import { log } from "@/lib/log";

export const JOBS_CACHE_TAG = "jobs";
const DAY_S = 24 * 60 * 60;

export function cachedForDay<Args extends unknown[], Result>(
  name: string,
  load: (...args: Args) => Promise<Result>,
): (...args: Args) => Promise<Result> {
  return unstable_cache(load, [name], { revalidate: DAY_S, tags: [JOBS_CACHE_TAG] });
}

export function dropJobsCache(): void {
  try {
    revalidateTag(JOBS_CACHE_TAG, "max");
  } catch (error) {
    log.warn("jobs.cache_drop_failed", {}, error);
  }
}
