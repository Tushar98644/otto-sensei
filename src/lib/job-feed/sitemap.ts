import { and, desc, gte, inArray, isNull, lt, type SQL } from "drizzle-orm";
import type { Db } from "@/db/client";
import { jobs } from "@/db/schema";
import { SOURCE_INFO } from "./sources";
import { JOB_SOURCES } from "./types";

// Server-only. The jobs the job sitemaps list: open ones from sources whose terms let them have a
// page here. The others only link out, and a closed job's page is noindex.
const OWN_PAGE_SOURCES = JOB_SOURCES.filter((source) => SOURCE_INFO[source].republish);

// Split by the first hex digit of the (random) id, so each job always lands in the same file and
// the files stay even. At ~140 bytes a URL, one file of 30k+ jobs would pass the 4.5 MB a Vercel
// function may return; four keep each one near 1.5 MB.
export const JOB_SITEMAP_PARTS = 4;

const uuidFrom = (digit: number) => `${digit.toString(16)}0000000-0000-0000-0000-000000000000`;

function partRange(part: number): SQL[] {
  const width = 16 / JOB_SITEMAP_PARTS;
  const end = (part + 1) * width;
  return [gte(jobs.id, uuidFrom(part * width)), ...(end < 16 ? [lt(jobs.id, uuidFrom(end))] : [])];
}

/**
 * One part's jobs, newest first, at most `limit`. updatedAt moves only when the post's text
 * changes (store.ts), so it is an honest lastmod.
 */
export async function sitemapJobs(
  db: Db,
  part: number,
  limit: number,
): Promise<{ id: string; updatedAt: number }[]> {
  if (!Number.isInteger(part) || part < 0 || part >= JOB_SITEMAP_PARTS) return [];
  return db
    .select({ id: jobs.id, updatedAt: jobs.updatedAt })
    .from(jobs)
    .where(
      and(isNull(jobs.closedAt), inArray(jobs.source, OWN_PAGE_SOURCES), ...partRange(part)),
    )
    .orderBy(desc(jobs.postedAt), desc(jobs.id))
    .limit(limit);
}
