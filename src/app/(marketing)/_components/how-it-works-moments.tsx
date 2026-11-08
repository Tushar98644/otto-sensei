import { Check, Plus } from "lucide-react";
import { LooseCircle } from "@/components/doodles/doodles";
import { Eyebrow } from "@/components/ui/eyebrow";
import { LivePill } from "@/components/ui/live-pill";
import { Window } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status";
import { DEMO_CHECKS, DEMO_FILE_NAME, DEMO_PERSON } from "./recruiter-demo-data";

// Small, faithful copies of the studio screens, one per step of How it works. They are pictures
// of the product, not controls, so nothing here can be clicked.

// The moment right after a drop: the file is in and its first lines are coming through. Shown as
// a finished picture, not a drop box, which would invite a drop the page can't take.
export function UploadMoment() {
  return (
    <Window title={DEMO_FILE_NAME} meta="PDF · 1 page" bodyClassName="px-4 py-4 sm:px-5 sm:py-5">
      {/* Each line a shade lighter, as if the rest is still arriving. */}
      <div className="font-mono text-xs/6 sm:text-sm/7">
        <p className="text-ink">{DEMO_PERSON.name}</p>
        <p className="text-muted">{DEMO_PERSON.role}</p>
        <p className="text-subtle">{DEMO_PERSON.email}</p>
      </div>
      <div className="mt-3 flex items-end justify-between gap-4">
        <div aria-hidden className="flex min-w-0 flex-1 flex-col gap-2.5 pb-1">
          <span className="h-2 w-3/4 rounded-full bg-surface-muted" />
          <span className="h-2 w-1/2 rounded-full bg-surface-muted" />
        </div>
        <LivePill announce={false}>Reading your file</LivePill>
      </div>
    </Window>
  );
}

export function ChecksMoment() {
  return (
    <Window title={DEMO_FILE_NAME} meta={`${DEMO_CHECKS.length} checks`}>
      <ul className="divide-y divide-border">
        {DEMO_CHECKS.map((check) => (
          <li
            key={check.title}
            className="flex flex-col items-start gap-2 px-4 py-4 sm:flex-row sm:gap-4 sm:px-5"
          >
            <StatusPill status={check.status} className="sm:mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">{check.title}</p>
              <p className="text-sm text-muted">{check.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </Window>
  );
}

const JOB = { title: "Senior Product Designer", company: "Northwind" };
const MISSING = ["Accessibility", "A/B testing"];

export function TailorMoment() {
  return (
    <div className="rounded-2xl bg-surface p-4 sm:p-6">
      <Eyebrow>Job post</Eyebrow>
      <p className="mt-2 text-base font-medium text-ink">
        {JOB.title} · {JOB.company}
      </p>
      <div className="mt-6 border-t border-border pt-6">
        <p className="text-sm font-medium text-ink">On your resume</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {DEMO_PERSON.skills.map((skill) => (
            <li
              key={skill}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface-muted px-3 text-sm text-ink"
            >
              <Check className="size-4 text-ink" aria-hidden />
              {skill}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm font-medium text-ink">
          Missing <span className="font-normal text-muted">· add only if true</span>
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {MISSING.map((term) => (
            <li
              key={term}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-dashed border-border-strong px-3 text-sm text-ink"
            >
              <Plus className="size-4 text-muted" aria-hidden />
              {term}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function DownloadMoment() {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="rounded-2xl bg-surface p-6 sm:p-8">
        <Eyebrow>Before</Eyebrow>
        <p className="mt-4 font-display text-6xl/none text-ink lining-nums tabular-nums">4</p>
        <p className="mt-2 text-sm text-muted">problems in the old file</p>
      </div>
      <div className="rounded-2xl bg-surface p-6 sm:p-8">
        <Eyebrow>After</Eyebrow>
        <p className="mt-4 font-display text-6xl/none text-ink lining-nums tabular-nums">
          <span className="relative inline-block">
            0
            {/* An SVG won't stretch to its insets, so a plain box takes them and the circle fills it. */}
            <span className="absolute -inset-x-7 -inset-y-3">
              <LooseCircle className="size-full" />
            </span>
          </span>
        </p>
        <p className="mt-2 text-sm text-muted">problems in your new PDF</p>
      </div>
    </div>
  );
}
