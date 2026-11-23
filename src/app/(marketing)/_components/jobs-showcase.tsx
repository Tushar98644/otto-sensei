import { ROUTES } from "@/components/site/routes";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status";
import { FREE_JOB_MATCHES } from "@/config/plans";
import { countClaim, type JobCounts } from "@/lib/job-feed/counts";
import { MATCH_LABELS } from "@/lib/job-feed/types";
import { Section, SectionHeader, SectionLink } from "./section";

type ExampleJob = {
  title: string;
  company: string;
  where: string;
  visa?: string;
  match: "strong" | "good";
  blocked?: string;
  reason: string;
};

const EXAMPLES: readonly ExampleJob[] = [
  {
    title: "Senior Product Designer",
    company: "Northwind",
    where: "Remote, Europe · 2 days ago",
    match: "strong",
    reason: "Found in your resume: Figma, user research, prototyping. Not found: accessibility.",
  },
  {
    title: "Product Designer, Payments",
    company: "Ledgerly",
    where: "London, UK · 5 days ago",
    visa: "Listed as a UK visa sponsor",
    match: "good",
    reason: "Found in your resume: Figma, prototyping. Not found: A/B testing.",
  },
  {
    title: "UX Designer",
    company: "Harbor Health",
    where: "New York, US · 1 week ago",
    match: "good",
    blocked: "You said you'd need a visa to work in the United States.",
    reason: "Found in your resume: user research, prototyping.",
  },
];

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
      lazySize="[contain-intrinsic-size:auto_1700px] sm:[contain-intrinsic-size:auto_1440px] lg:[contain-intrinsic-size:auto_1370px]"
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
      <Panel className="mt-12 sm:mt-16">
        <ul role="list" aria-label="Example matches" className="flex flex-col gap-3 sm:gap-4">
          {EXAMPLES.map((job) => (
            <li key={job.title} className="flex flex-col gap-3 rounded-2xl bg-surface p-4 sm:p-6">
              <div>
                <h3 className="text-base/6 font-semibold text-pretty text-ink">
                  {job.title} · {job.company}
                </h3>
                <p className="text-sm/6 text-muted">{job.where}</p>
                {job.visa ? <p className="text-sm/6 text-subtle">{job.visa}</p> : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {job.match === "strong" ? (
                  <StatusPill status="pass">{MATCH_LABELS.strong}</StatusPill>
                ) : (
                  <Badge>{MATCH_LABELS[job.match]}</Badge>
                )}
                {job.blocked ? <StatusPill status="fail">Likely blocked</StatusPill> : null}
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-sm/6 text-pretty text-ink">{job.reason}</p>
                {job.blocked ? (
                  <p className="text-sm/6 text-pretty text-muted">{job.blocked}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </Panel>
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
