import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { z } from "zod";
import { pageMetadata } from "@/components/site/page-metadata";
import { ROUTES } from "@/components/site/routes";
import { placeLine } from "@/components/dashboard/jobs/view";
import { buttonClasses } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { getDb } from "@/db/client";
import { jobPostingJsonLd, jsonLdScript } from "@/lib/job-feed/json-ld";
import { cachedForDay } from "@/lib/job-feed/public-cache";
import { fullPostText } from "@/lib/job-feed/full-post";
import { jobById } from "@/lib/job-feed/records";
import { SOURCE_INFO, sourceCredit } from "@/lib/job-feed/sources";
import { EMPLOYMENT_LABELS, type FeedJob, type Seniority } from "@/lib/job-feed/types";
import { MATCH_HREF } from "../_components/public-job-item";

// Built on the first visit and kept a day (the ingest cron drops it sooner): the post changes at
// most once a day, and every open job's page can be crawled.
export const revalidate = 86_400;

export function generateStaticParams(): { id: string }[] {
  return [];
}

// The post is read from its board with the page (the database keeps none of its text), so the
// page and its JobPosting data show all of it; when the board can't be read, the page shows what
// was read from the post at ingest and no JobPosting data, which needs the complete post.
const dailyJob = cachedForDay("jobs-public-job", async (id: string) => {
  const job = await jobById(await getDb(), id);
  if (!job || !SOURCE_INFO[job.source].republish) return job;
  return { ...job, description: await fullPostText(job) };
});

const LEVELS: Record<Seniority, string> = {
  intern: "Internship level",
  junior: "Entry level",
  mid: "Mid level",
  senior: "Senior",
  lead: "Lead",
  director: "Director and above",
};

function jobFacts(job: FeedJob): string[] {
  return [
    [LEVELS[job.seniority], job.employmentType ? EMPLOYMENT_LABELS[job.employmentType] : null]
      .filter(Boolean)
      .join(", "),
    job.keywords.length > 0 ? `Skills it names: ${job.keywords.slice(0, 15).join(", ")}` : "",
  ].filter(Boolean);
}

const DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

type Props = { params: Promise<{ id: string }> };

// Only jobs whose source allows republishing have a page here; the others link out from the list.
const load = cache(async (id: string) => {
  if (!z.uuid().safeParse(id).success) return null;
  const job = await dailyJob(id);
  return job && SOURCE_INFO[job.source].republish ? job : null;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const job = await load((await params).id);
  if (!job) return { title: "Job not found", robots: { index: false } };
  const base = pageMetadata({
    title: `${job.title} at ${job.company}`,
    description: `${job.title} at ${job.company}${job.location ? `, ${job.location}` : ""}. See the post and how well your resume matches it.`,
    path: `${ROUTES.jobs}/${job.id}`,
  });
  return job.closed ? { ...base, robots: { index: false, follow: true } } : base;
}

export default async function JobPage({ params }: Props) {
  const job = await load((await params).id);
  if (!job) notFound();
  const jsonLd = jobPostingJsonLd(job);

  return (
    <div className="container-page pt-12 pb-24 sm:pt-16 sm:pb-32">
      {jsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      ) : null}
      <Link href={ROUTES.jobs} className="text-sm text-muted hover:text-ink">
        All jobs
      </Link>
      <div className="mt-6 max-w-3xl">
        <Eyebrow>
          {job.company} · {sourceCredit(job.source)}
        </Eyebrow>
        <h1 className="mt-4 font-display text-4xl/10 font-normal tracking-tight text-balance text-ink sm:text-5xl/13">
          {job.title}
        </h1>
        <p className="mt-4 text-base/7 text-muted">
          {[placeLine(job), `Posted ${DATE.format(job.postedAt)}`].filter(Boolean).join(" · ")}
        </p>
        {job.closed ? (
          <p className="mt-2 text-base/7 font-medium text-ink">This job has closed.</p>
        ) : null}
        <div className="mt-8 flex flex-wrap gap-2">
          <Link href={MATCH_HREF} className={buttonClasses({})}>
            See how well you match
          </Link>
          <a href={job.url} target="_blank" rel="noopener" className={buttonClasses({ variant: "secondary" })}>
            Open the original post
            <ArrowUpRight aria-hidden />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </div>
      </div>

      <div className="mt-12 rounded-3xl bg-surface-muted p-3 sm:p-6 lg:p-10">
        <article className="rounded-2xl bg-surface p-4 sm:p-8">
          {job.description ? (
            <p className="max-w-prose text-base/7 whitespace-pre-line text-ink">
              {job.description}
            </p>
          ) : (
            <div className="max-w-prose text-base/7 text-ink">
              <p>The post couldn&apos;t be loaded just now. What we read from it:</p>
              <ul className="mt-3 list-disc space-y-1 pl-5">
                {jobFacts(job).map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-8 text-sm/6 text-subtle">
            The full post, and the way to apply, are on{" "}
            <a href={job.url} target="_blank" rel="noopener" className="underline decoration-border-strong">
              {job.company}&apos;s {SOURCE_INFO[job.source].name} page
            </a>
            .
          </p>
        </article>
      </div>
    </div>
  );
}
