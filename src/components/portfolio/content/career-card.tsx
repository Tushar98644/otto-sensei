"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  CONTENT_LIMITS as L,
  emptyJobExtra,
  emptySchoolExtra,
  type JobExtra,
  type PortfolioContent,
  type PortfolioContentView,
  type SchoolExtra,
} from "@/lib/portfolio/content";
import type { AutoContent } from "@/lib/portfolio/content-view";
import { editContent } from "./content-store";
import { FieldRow, LinkField, TagsField, TextField } from "./fields";
import { SectionCard } from "./section-card";

type CardProps = { content: PortfolioContent; auto: AutoContent; view: PortfolioContentView };

function patchJob(id: string, patch: Partial<JobExtra>, undo?: string) {
  editContent(
    (current) => ({
      ...current,
      jobs: {
        ...current.jobs,
        [id]: { ...(current.jobs[id] ?? emptyJobExtra()), ...patch },
      },
    }),
    undo,
  );
}

function patchSchool(id: string, patch: Partial<SchoolExtra>, undo?: string) {
  editContent(
    (current) => ({
      ...current,
      schools: {
        ...current.schools,
        [id]: { ...(current.schools[id] ?? emptySchoolExtra()), ...patch },
      },
    }),
    undo,
  );
}

export function CareerCard({ content, auto, view, hidden }: CardProps & { hidden?: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const highlights = view.experience.filter((job) => job.highlight).length;
  return (
    <SectionCard
      title="Experience and education"
      hidden={hidden}
      meta={
        view.experience.length > 0
          ? `${highlights} of ${view.experience.length} jobs with a highlight`
          : "From your resume"
      }
    >
      <p className="text-sm/6 text-muted">
        Jobs and schools come from your resume. Designs mark each one with its initials.
      </p>
      {view.experience.map((job) => {
        const own = content.jobs[job.id];
        const base = auto.jobs[job.id];
        return (
          <details
            key={job.id}
            open={open === job.id}
            onToggle={(event) => event.currentTarget.open && setOpen(job.id)}
            className="rounded-xl bg-surface-muted"
          >
            <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden">
              <Monogram text={job.monogram} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm/6 font-medium text-ink">
                  {job.company || job.title}
                </span>
                <span className="block truncate text-xs/5 text-subtle">
                  {job.highlight || job.dates}
                </span>
              </span>
            </summary>
            <div className="flex flex-col gap-4 border-t border-border px-3 pt-4 pb-4 @sm:px-4">
              <TextField
                label="Highlight"
                value={own?.highlight ?? null}
                auto={base?.highlight ?? ""}
                max={L.jobHighlight}
                placeholder="-72% failed payouts"
                hint="The strongest number from this job, pulled from its lines."
                onChange={(highlight) => patchJob(job.id, { highlight })}
              />
              <TextField
                label="One-line summary"
                value={own?.summary ?? null}
                auto={base?.summary ?? ""}
                max={L.jobSummary}
                multiline
                placeholder="What you owned there, in one sentence."
                onChange={(summary) => patchJob(job.id, { summary })}
              />
              <FieldRow>
                <TextField
                  label="Kind of company"
                  value={own?.type ?? null}
                  auto={base?.type ?? ""}
                  max={L.jobType}
                  placeholder="Fintech · payouts"
                  onChange={(type) => patchJob(job.id, { type })}
                />
                <LinkField
                  label="Company website"
                  value={own?.website ?? ""}
                  placeholder="ledgerly.com"
                  onChange={(website) => patchJob(job.id, { website: website ?? "" })}
                />
              </FieldRow>
              <TagsField
                label="Stack"
                value={own?.tags ?? null}
                auto={base?.tags ?? []}
                max={L.tags}
                onChange={(tags) => patchJob(job.id, { tags })}
              />
            </div>
          </details>
        );
      })}
      {view.education.map((school) => {
        const own = content.schools[school.id];
        return (
          <details key={school.id} className="rounded-xl bg-surface-muted">
            <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden">
              <Monogram text={school.monogram} />
              <span className="min-w-0 flex-1 truncate text-sm/6 font-medium text-ink">
                {school.school || school.degree}
              </span>
            </summary>
            <div className="flex flex-col gap-4 border-t border-border px-3 pt-4 pb-4 @sm:px-4">
              <LinkField
                label="School website"
                value={own?.website ?? ""}
                placeholder="manchester.ac.uk"
                onChange={(website) => patchSchool(school.id, { website: website ?? "" })}
              />
            </div>
          </details>
        );
      })}
      <SkillYears content={content} auto={auto} view={view} />
    </SectionCard>
  );
}

function Monogram({ text }: { text: string }) {
  return (
    <span
      className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface text-xs font-semibold text-muted ring-1 ring-border"
      aria-hidden
    >
      {text}
    </span>
  );
}

function SkillYears({ content, auto, view }: CardProps) {
  const skills = view.skills.flatMap((group) => group.items);
  if (skills.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-ink">Years per skill</p>
      <p className="text-sm/5 text-subtle">
        Counted from the jobs that mention each one. Change any that are off.
      </p>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2 @sm:grid-cols-3">
        {skills.slice(0, L.skillYears).map((skill) => {
          const key = skill.name.toLowerCase();
          const own = content.skillYears[key];
          const automatic = auto.skillYears[key] ?? null;
          return (
            <li key={key} className="flex items-center gap-2">
              <Input
                aria-label={`Years of ${skill.name}`}
                type="number"
                inputMode="numeric"
                min={0}
                max={L.maxYears}
                className="h-9 w-16 shrink-0 px-2 text-center"
                placeholder={automatic === null ? "–" : String(automatic)}
                value={own === undefined || own === null ? "" : String(own)}
                onChange={(event) => {
                  const raw = event.currentTarget.value;
                  const years =
                    raw === ""
                      ? undefined
                      : Math.max(0, Math.min(L.maxYears, Math.round(Number(raw))));
                  editContent((current) => {
                    const next = { ...current.skillYears };
                    if (years === undefined || Number.isNaN(years)) delete next[key];
                    else next[key] = years;
                    return { ...current, skillYears: next };
                  });
                }}
              />
              <span className="min-w-0 truncate text-sm/6 text-ink">{skill.name}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
