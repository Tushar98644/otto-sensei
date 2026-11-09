import { cache } from "react";
import { getDb } from "@/db/client";
import { log } from "@/lib/log";
import { JOB_COUNTS_FALLBACK, type JobCounts } from "./counts";
import { jobCounts } from "./records";

// Server-only. The live job counts for pages that state one. Pages built ahead of time read it
// when they are built and again when they revalidate; with no database at build time they show
// the measured floors in JOB_COUNTS_FALLBACK until the next revalidation.

export const loadJobCounts = cache(async (): Promise<JobCounts> => {
  try {
    return await jobCounts(await getDb());
  } catch (error) {
    log.warn("jobs.counts_unavailable", {}, error);
    return JOB_COUNTS_FALLBACK;
  }
});
