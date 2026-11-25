import { Check, Plus } from "lucide-react";
import { LooseCircle } from "@/components/doodles/doodles";
import { Eyebrow } from "@/components/ui/eyebrow";
import { LivePill } from "@/components/ui/live-pill";
import { Window } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status";
import type { HomeMessages, HomeProps } from "./home-copy";
import { DEMO_FILE_NAME, demoChecks, demoPerson } from "./recruiter-demo-data";

export type MomentProps = Pick<HomeProps, "t" | "format">;

export function UploadMoment({ t }: MomentProps) {
  const person = demoPerson(t.resume);
  const words = t.how.upload;
  return (
    <Window title={DEMO_FILE_NAME} meta={words.meta} bodyClassName="px-4 py-4 sm:px-5 sm:py-5">
      <div className="font-mono text-xs/6 sm:text-sm/7">
        <p className="text-ink">{person.name}</p>
        <p className="text-muted">{person.role}</p>
        <p className="text-subtle">{person.email}</p>
      </div>
      <div className="mt-3 flex items-end justify-between gap-4">
        <div aria-hidden className="flex min-w-0 flex-1 flex-col gap-2.5 pb-1">
          <span className="h-2 w-3/4 rounded-full bg-surface-muted" />
          <span className="h-2 w-1/2 rounded-full bg-surface-muted" />
        </div>
        <LivePill announce={false}>{words.reading}</LivePill>
      </div>
    </Window>
  );
}

export function ChecksMoment({ t, format }: MomentProps) {
  const checks = demoChecks(t.how.checks.items);
  return (
    <Window title={DEMO_FILE_NAME} meta={format.plural(t.how.checks.meta, checks.length)}>
      <ul className="divide-y divide-border">
        {checks.map((check) => (
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

const COMPANY = "Northwind";
const MISSING: readonly (keyof HomeMessages["how"]["tailor"]["terms"])[] = [
  "accessibility",
  "abTesting",
];

export function TailorMoment({ t }: MomentProps) {
  const words = t.how.tailor;
  return (
    <div className="rounded-2xl bg-surface p-4 sm:p-6">
      <Eyebrow>{words.jobPost}</Eyebrow>
      <p className="mt-2 text-base font-medium text-ink">
        {words.jobTitle} · {COMPANY}
      </p>
      <div className="mt-6 border-t border-border pt-6">
        <p className="text-sm font-medium text-ink">{words.onResume}</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {demoPerson(t.resume).skills.map((skill) => (
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
          {words.missing} <span className="font-normal text-muted">{words.onlyIfTrue}</span>
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {MISSING.map((key) => (
            <li
              key={key}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-dashed border-border-strong px-3 text-sm text-ink"
            >
              <Plus className="size-4 text-muted" aria-hidden />
              {words.terms[key]}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function DownloadMoment({ t }: MomentProps) {
  const words = t.how.download;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="rounded-2xl bg-surface p-6 sm:p-8">
        <Eyebrow>{words.before}</Eyebrow>
        <p className="mt-4 font-display text-6xl/none text-ink lining-nums tabular-nums">4</p>
        <p className="mt-2 text-sm text-muted">{words.beforeText}</p>
      </div>
      <div className="rounded-2xl bg-surface p-6 sm:p-8">
        <Eyebrow>{words.after}</Eyebrow>
        <p className="mt-4 font-display text-6xl/none text-ink lining-nums tabular-nums">
          <span className="relative inline-block">
            0
            <span className="absolute -inset-x-7 -inset-y-3">
              <LooseCircle className="size-full" />
            </span>
          </span>
        </p>
        <p className="mt-2 text-sm text-muted">{words.afterText}</p>
      </div>
    </div>
  );
}
