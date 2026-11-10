import type { Metadata } from "next";
import Link from "next/link";
import { OTTO } from "@/components/mascot/lines";
import { OttoNote } from "@/components/mascot/otto-note";
import { pageMetadata } from "@/components/site/page-metadata";
import { ROUTES } from "@/components/site/routes";
import { buttonClasses } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { getDb } from "@/db/client";
import { BOARD_SEEDS } from "@/lib/job-feed/seeds";
import { filtersFromParams, isFiltered, paramsFromFilters } from "@/lib/job-feed/params";
import { countClaim, type JobCounts } from "@/lib/job-feed/counts";
import { loadJobCounts } from "@/lib/job-feed/live-counts";
import { storedJobStats } from "@/lib/job-feed/match-index";
import { cachedForDay } from "@/lib/job-feed/public-cache";
import { listJobs } from "@/lib/job-feed/records";
import type { FeedJob } from "@/lib/job-feed/types";
import { log } from "@/lib/log";
import { PublicFilters } from "./_components/public-filters";
import { MATCH_HREF, PublicJobItem } from "./_components/public-job-item";

// Rendered per address (its filters are in it), but each list page and the counts are read from
// the database once a day: the jobs change only when the daily ingest runs, and it drops the cache.
export const dynamic = "force-dynamic";

const dailyList = cachedForDay(
  "jobs-public-list",
  async (filters: ReturnType<typeof filtersFromParams>["filters"], page: number) => {
    const db = await getDb();
    const [list, stats] = await Promise.all([listJobs(db, filters, page), storedJobStats(db)]);
    return { ...list, openJobs: stats.openJobs };
  },
);

const count = new Intl.NumberFormat("en-US");

// "27,000+ open jobs from 323 company job boards…", from the live count rounded down.
function description(counts: JobCounts): string {
  const open = countClaim(counts.open);
  return `${open ? `${open} open jobs` : "Open jobs"} from ${BOARD_SEEDS.length} company job boards and two remote job sites, checked every day. Each one links to the original post. Pro shows how well your resume matches each one.`;
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// Filtered and later pages are for people, not search engines: the plain list is the one to index.
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { filters, page } = filtersFromParams(await searchParams);
  const base = pageMetadata({
    title: "Jobs",
    description: description(await loadJobCounts()),
    path: ROUTES.jobs,
  });
  return isFiltered(filters) || page > 1
    ? { ...base, robots: { index: false, follow: true } }
    : base;
}

async function load(params: Awaited<Props["searchParams"]>) {
  const { filters, page } = filtersFromParams(params);
  try {
    return { filters, page, ...(await dailyList(filters, page)), failed: false };
  } catch (error) {
    log.error("jobs.public_list_failed", error);
    return { filters, page, jobs: [] as FeedJob[], hasMore: false, openJobs: 0, failed: true };
  }
}

export default async function JobsPage({ searchParams }: Props) {
  const [{ filters, page, jobs, hasMore, openJobs, failed }, counts] = await Promise.all([
    load(await searchParams),
    loadJobCounts(),
  ]);
  const filtered = isFiltered(filters);
  const quality = countClaim(counts.matchable);

  return (
    <div className="container-page pt-12 pb-24 sm:pt-16 sm:pb-32">
      <div className="max-w-3xl">
        <Eyebrow>Open jobs</Eyebrow>
        <h1 className="mt-4 font-display text-5xl/none font-normal tracking-tight text-balance text-ink sm:text-7xl/none">
          Real jobs, <em>read every day.</em>
        </h1>
        <p className="mt-6 max-w-2xl text-lg/7 text-pretty text-muted sm:text-xl/8">
          {description(counts)}
        </p>
      </div>

      <div className="mt-10 flex flex-col gap-6 rounded-3xl bg-surface-muted p-3 sm:mt-12 sm:p-6 lg:p-10">
        <PublicFilters filters={filters} />
        <OttoNote
          message={failed ? OTTO.jobs.publicFailed : OTTO.jobs.publicInvite}
          meta={failed ? undefined : `${count.format(openJobs)} open jobs`}
          size="sm"
        >
          {failed ? null : (
            <Link href={MATCH_HREF} className={buttonClasses({ size: "sm", className: "w-fit" })}>
              See how well you match
            </Link>
          )}
        </OttoNote>

        {jobs.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {jobs.map((job) => (
              <PublicJobItem key={job.id} job={job} />
            ))}
          </ul>
        ) : failed ? null : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-5 sm:px-6">
            <p className="text-sm/6 text-muted">
              {filtered
                ? "No open jobs match these filters."
                : "No jobs yet. The boards are read once a day."}
            </p>
            {filtered ? (
              <Link
                href={ROUTES.jobs}
                className={buttonClasses({ variant: "secondary", size: "sm" })}
              >
                Show all jobs
              </Link>
            ) : null}
          </div>
        )}

        {page > 1 || hasMore ? (
          <nav aria-label="Pages" className="flex items-center justify-between gap-3">
            {page > 1 ? (
              <Link
                href={`${ROUTES.jobs}${paramsFromFilters(filters, page - 1)}`}
                className={buttonClasses({ variant: "secondary", size: "sm" })}
              >
                Previous
              </Link>
            ) : (
              <span />
            )}
            <p className="text-sm text-subtle tabular-nums">Page {page}</p>
            {hasMore ? (
              <Link
                href={`${ROUTES.jobs}${paramsFromFilters(filters, page + 1)}`}
                className={buttonClasses({ variant: "secondary", size: "sm" })}
              >
                Next
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </div>

      <p className="mt-6 max-w-prose text-sm/6 text-subtle">
        Jobs come from public company job boards (Greenhouse, Lever, Ashby, Workable, Recruitee and
        Personio) and from Himalayas, Remote OK and Jobicy, each credited and linked to its original
        post.
        {quality
          ? ` Matches rank ${quality} quality jobs: one card per opening when it's posted in several places, leaving out "general application" posts and posts open over 4 months.`
          : null}
      </p>
    </div>
  );
}
