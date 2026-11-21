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
    title: "Matched to your resume",
    text: "Each job shows what it asks for that your resume has, and what it doesn't.",
  },
  {
    title: "Visa and work rights, checked",
    text: "On Pro, posts that say they can't hire you are marked, and listed visa sponsors say so.",
  },
  {
    title: "Your role, level and place",
    text: "Otto guesses them from your resume to start. Change them any time.",
  },
  {
    title: "Straight from the company",
    text: "From careers pages and public job feeds, read every day, each linked to its post.",
  },
];

export function JobsShowcase({ jobCounts }: { jobCounts: JobCounts }) {
  const open = countClaim(jobCounts.open);
  return (
    <Section id="jobs" labelledBy="jobs-showcase-title">
      <SectionHeader
        id="jobs-showcase-title"
        eyebrow="Jobs · new every day"
        title={
          open ? `${open} open jobs, ranked for your resume` : "Open jobs, ranked for your resume"
        }
      >
        The ones that fit your resume come first, each with a plain reason. Free shows your top{" "}
        {FREE_JOB_MATCHES}; Pro shows every match.
      </SectionHeader>
      <Panel className="mt-12 sm:mt-16">
        <ul role="list" aria-label="Example matches" className="flex flex-col gap-3 sm:gap-4">
          {EXAMPLES.map((job) => (
            <li key={job.title} className="flex flex-col gap-3 rounded-2xl bg-surface p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
                <div className="min-w-0">
                  <h3 className="text-base/6 font-semibold text-pretty text-ink">
                    {job.title} · {job.company}
                  </h3>
                  <p className="mt-0.5 text-sm/6 text-muted">
                    {job.where}
                    {job.visa ? <span className="text-subtle"> · {job.visa}</span> : null}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {job.match === "strong" ? (
                    <StatusPill status="pass">{MATCH_LABELS.strong}</StatusPill>
                  ) : (
                    <Badge>{MATCH_LABELS[job.match]}</Badge>
                  )}
                  {job.blocked ? <StatusPill status="fail">Likely blocked</StatusPill> : null}
                </div>
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
      <ul role="list" className="mt-10 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:mt-12 lg:grid-cols-4">
        {POINTS.map(({ title, text }) => (
          <li key={title} className="flex flex-col gap-1">
            <h3 className="text-base/7 font-medium text-ink">{title}</h3>
            <p className="text-base/7 text-pretty text-muted">{text}</p>
          </li>
        ))}
      </ul>
      <SectionLink href={ROUTES.dashboardJobs}>Find my matches</SectionLink>
    </Section>
  );
}
