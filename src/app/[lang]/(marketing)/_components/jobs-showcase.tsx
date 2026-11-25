import { GuideVideo, JOBS_CLIP } from "@/components/dashboard/applications/email/guide-video";
import { ROUTES } from "@/components/site/routes";
import { FREE_JOB_MATCHES } from "@/config/plans";
import { fmt } from "@/i18n/format";
import { countClaimWith, type JobCounts } from "@/lib/job-feed/counts";
import type { HomeMessages, HomeProps } from "./home-copy";
import { Section, SectionHeader, SectionLink } from "./section";

const POINTS: readonly (keyof HomeMessages["jobs"]["points"])[] = [
  "matched",
  "visa",
  "role",
  "direct",
];

export function JobsShowcase({
  t,
  format,
  jobCounts,
}: Pick<HomeProps, "t" | "format"> & { jobCounts: JobCounts }) {
  const jobs = t.jobs;
  const open = countClaimWith((value) => format.number(value), jobCounts.open);
  return (
    <Section
      id="jobs"
      labelledBy="jobs-showcase-title"
      lazySize="[contain-intrinsic-size:auto_1650px] sm:[contain-intrinsic-size:auto_1480px] lg:[contain-intrinsic-size:auto_1640px]"
    >
      <SectionHeader
        id="jobs-showcase-title"
        eyebrow={jobs.eyebrow}
        title={open ? fmt(jobs.title, { count: open }) : jobs.titleNoCount}
      >
        {fmt(jobs.intro, { free: format.number(FREE_JOB_MATCHES) })}
      </SectionHeader>
      <figure className="mt-12 sm:mt-16">
        <div className="overflow-hidden rounded-3xl bg-surface p-2 shadow-card sm:p-3">
          <GuideVideo src={JOBS_CLIP} width={1440} height={1000} />
        </div>
        <figcaption className="mt-4 max-w-3xl text-sm/6 text-pretty text-subtle">
          {jobs.caption}
        </figcaption>
      </figure>
      <ul
        role="list"
        className="mt-10 grid gap-x-8 gap-y-8 border-t border-border pt-10 sm:grid-cols-2"
      >
        {POINTS.map((key) => (
          <li key={key} className="flex flex-col gap-2">
            <h3 className="text-lg/7 font-medium tracking-tight text-ink">
              {jobs.points[key].title}
            </h3>
            <p className="max-w-prose text-base/7 text-muted">{jobs.points[key].text}</p>
          </li>
        ))}
      </ul>
      <SectionLink href={ROUTES.dashboardJobs}>{jobs.link}</SectionLink>
    </Section>
  );
}
