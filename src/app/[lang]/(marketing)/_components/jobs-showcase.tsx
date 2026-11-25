import { GuideVideo, JOBS_CLIP } from "@/components/dashboard/applications/email/guide-video";
import { ROUTES } from "@/components/site/routes";
import { FREE_JOB_MATCHES } from "@/config/plans";
import { countClaim, type JobCounts } from "@/lib/job-feed/counts";
import { Section, SectionHeader, SectionLink } from "./section";

type Point = { title: string; text: string };

const POINTS: readonly Point[] = [
  {
    title: "Your kind of work, matched to your resume",
    text: "Otto reads what a job title means, so a Software Engineer sees Backend Developer posts but not support or sales ones. Each job shows what your resume has and what it's missing.",
  },
  {
    title: "Visa and work rights, checked",
    text: "On Pro, tell Otto where you can work: posts that say they can't hire you are marked, and one switch hides them. Companies on the public US H-1B and UK sponsor registers say so.",
  },
  {
    title: "The role, level and place you want",
    text: "Pick a role, a level and a place, or remote only. Otto guesses them from your resume to start.",
  },
  {
    title: "Straight from the company",
    text: "Jobs come from companies' own careers pages and public job feeds in the US, the UK, Australia, Latin America, Europe and more, read every day. Each one links to the original post.",
  },
];

export function JobsShowcase({ jobCounts }: { jobCounts: JobCounts }) {
  const open = countClaim(jobCounts.open);
  return (
    <Section
      id="jobs"
      labelledBy="jobs-showcase-title"
      lazySize="[contain-intrinsic-size:auto_1650px] sm:[contain-intrinsic-size:auto_1480px] lg:[contain-intrinsic-size:auto_1640px]"
    >
      <SectionHeader
        id="jobs-showcase-title"
        eyebrow="Jobs · new every day"
        title={
          open ? `${open} open jobs, ranked for your resume` : "Open jobs, ranked for your resume"
        }
      >
        Otto reads companies&apos; careers pages every day and shows only jobs in your line of work,
        best fit first, with a plain reason for each. Free shows your top {FREE_JOB_MATCHES}; Pro
        matches you against all of them.
      </SectionHeader>
      <figure className="mt-12 sm:mt-16">
        <div className="overflow-hidden rounded-3xl bg-surface p-2 shadow-card sm:p-3">
          <GuideVideo src={JOBS_CLIP} width={1440} height={1000} />
        </div>
        <figcaption className="mt-4 max-w-3xl text-sm/6 text-pretty text-subtle">
          The real Jobs page: a sales rep with a digital marketing internship picks Any marketing
          role, and Otto ranks entry-level marketing jobs by the SEO, Google Ads and HubSpot on
          their resume.
        </figcaption>
      </figure>
      <ul
        role="list"
        className="mt-10 grid gap-x-8 gap-y-8 border-t border-border pt-10 sm:grid-cols-2"
      >
        {POINTS.map(({ title, text }) => (
          <li key={title} className="flex flex-col gap-2">
            <h3 className="text-lg/7 font-medium tracking-tight text-ink">{title}</h3>
            <p className="max-w-prose text-base/7 text-muted">{text}</p>
          </li>
        ))}
      </ul>
      <SectionLink href={ROUTES.dashboardJobs}>Find my matches</SectionLink>
    </Section>
  );
}
