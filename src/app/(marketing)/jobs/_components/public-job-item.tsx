import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { loginHref } from "@/components/account/next-path";
import { ROUTES } from "@/components/site/routes";
import { buttonClasses } from "@/components/ui/button";
import { SOURCE_INFO, sourceCredit } from "@/lib/job-feed/sources";
import type { FeedJob } from "@/lib/job-feed/types";
import { placeLine } from "@/components/dashboard/jobs/view";

const DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export const MATCH_HREF = loginHref(ROUTES.dashboardJobs);

// One job on the public list. Jobs whose source allows republishing get their own page here;
// the rest link straight to the original post.
export function PublicJobItem({ job }: { job: FeedJob }) {
  const ownPage = SOURCE_INFO[job.source].republish;
  return (
    <li className="flex flex-col gap-3 rounded-2xl bg-surface p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <p className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm/5 text-subtle">
          <span className="font-medium text-muted">{job.company}</span>
          <span>{sourceCredit(job.source)}</span>
        </p>
        <h2 className="font-sans text-base/6 font-semibold text-pretty text-ink">
          {ownPage ? (
            <Link href={`${ROUTES.jobs}/${job.id}`} className="hover:underline">
              {job.title}
            </Link>
          ) : (
            <a href={job.url} target="_blank" rel="noopener" className="hover:underline">
              {job.title}
            </a>
          )}
        </h2>
        <p className="text-sm/6 text-muted">
          {[placeLine(job), `Posted ${DATE.format(job.postedAt)}`].filter(Boolean).join(" · ")}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link href={MATCH_HREF} className={buttonClasses({ variant: "secondary", size: "sm" })}>
          See how well you match
        </Link>
        <a
          href={job.url}
          target="_blank"
          rel="noopener"
          className={buttonClasses({ variant: "ghost", size: "sm" })}
        >
          Open job
          <ArrowUpRight aria-hidden />
          <span className="sr-only">(opens {job.company}&apos;s posting in a new tab)</span>
        </a>
      </div>
    </li>
  );
}
