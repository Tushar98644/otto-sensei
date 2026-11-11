import { cache } from "react";
import { getDb } from "@/db/client";
import { log } from "@/lib/log";
import { JOB_COUNTS_FALLBACK, type JobCounts } from "./counts";
import { storedJobCounts } from "./match-index";
import { cachedForDay } from "./public-cache";

const dailyCounts = cachedForDay(
  "job-counts",
  async (): Promise<JobCounts> => storedJobCounts(await getDb()),
);

export const loadJobCounts = cache(async (): Promise<JobCounts> => {
  try {
    return await dailyCounts();
  } catch (error) {
    log.warn("jobs.counts_unavailable", {}, error);
    return JOB_COUNTS_FALLBACK;
  }
});
