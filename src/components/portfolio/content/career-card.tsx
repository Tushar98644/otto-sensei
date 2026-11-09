"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { api, isApiError } from "@/lib/api/client";
import {
  CONTENT_LIMITS as L,
  JobExtraSchema,
  SchoolExtraSchema,
  type ImageRef,
  type JobExtra,
  type PortfolioContent,
  type PortfolioContentView,
  type SchoolExtra,
} from "@/lib/portfolio/content";
import type { AutoContent } from "@/lib/portfolio/content-view";
import { editContent, setMediaUsage, useContentStore } from "./content-store";
import { FieldRow, LinkField, TagsField, TextField } from "./fields";
import { ImageField } from "./image-drop";
import { SectionCard } from "./section-card";

type CardProps = { content: PortfolioContent; auto: AutoContent; view: PortfolioContentView };

function patchJob(id: string, patch: Partial<JobExtra>, undo?: string) {
  editContent(
    (current) => ({
      ...current,
      jobs: {
        ...current.jobs,
        [id]: { ...(current.jobs[id] ?? JobExtraSchema.parse({})), ...patch },
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
        [id]: { ...(current.schools[id] ?? SchoolExtraSchema.parse({})), ...patch },
      },
    }),
    undo,
  );
}

/**
 * Fetches the site's icon as the logo once its address is typed, unless a logo is already set.
 * Quietly does nothing when the site has none: the monogram stays, which looks fine.
 */
async function iconFor(href: string, apply: (logo: ImageRef) => void, hasLogo: () => boolean) {
  if (hasLogo()) return;
  try {
    const { image, media } = await api.portfolioSiteIcon(href);
    setMediaUsage(media);
    if (!hasLogo()) apply(image);
  } catch (error) {
    if (isApiError(error, "upgrade_required") || isApiError(error, "limit_reached")) {
      toast({ title: "Couldn't add the logo", description: error.message, variant: "error" });
    }
  }
}

export function CareerCard({ content, auto, view, hidden }: CardProps & { hidden?: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const logos = view.experience.filter((job) => job.logo.src).length;
  return (
    <SectionCard
      title="Experience and education"
      hidden={hidden}
      meta={
        view.experience.length > 0
          ? `${logos} of ${view.experience.length} jobs with a logo`
          : "From your resume"
      }
    >
      <p className="text-sm/6 text-muted">
        Jobs and schools come from your resume. Add a website and the logo is fetched for you.
      </p>
      {view.experience.map((job) => {
        const own = content.jobs[job.id];
        const base = auto.jobs[job.id];
        const hasLogo = () => Boolean(useContentStore.getState().content.jobs[job.id]?.logo);
        return (
          <details
            key={job.id}
            open={open === job.id}
            onToggle={(event) => event.currentTarget.open && setOpen(job.id)}
            className="rounded-xl bg-surface-muted"
          >
            <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden">
              <Monogram src={job.logo.src} text={job.logo.monogram} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm/6 font-medium text-ink">
                  {job.company || job.title}
                </span>
                <span className="block truncate text-xs/5 text-subtle">
                  {job.highlight || job.dates}
                </span>
              </span>
            </summary>
            <div className="flex flex-col gap-4 border-t border-border px-3 pt-4 pb-4 sm:px-4">
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
                  onCommit={(href) =>
                    void iconFor(href, (logo) => patchJob(job.id, { logo }), hasLogo)
                  }
                />
              </FieldRow>
              <TagsField
                label="Stack"
                value={own?.tags ?? null}
                auto={base?.tags ?? []}
                max={L.tags}
                onChange={(tags) => patchJob(job.id, { tags })}
              />
              <ImageField
                label="Logo"
                kind="logo"
                value={own?.logo ?? null}
                fallback={{ src: null, text: job.logo.monogram }}
                hint="Square works best. Without one, designs show the initials."
                onChange={(logo, undo) => patchJob(job.id, { logo }, undo)}
              />
            </div>
          </details>
        );
      })}
      {view.education.map((school) => {
        const own = content.schools[school.id];
        const hasLogo = () => Boolean(useContentStore.getState().content.schools[school.id]?.logo);
        return (
          <details key={school.id} className="rounded-xl bg-surface-muted">
            <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden">
              <Monogram src={school.logo.src} text={school.logo.monogram} />
              <span className="min-w-0 flex-1 truncate text-sm/6 font-medium text-ink">
                {school.school || school.degree}
              </span>
            </summary>
            <div className="flex flex-col gap-4 border-t border-border px-3 pt-4 pb-4 sm:px-4">
              <LinkField
                label="School website"
                value={own?.website ?? ""}
                placeholder="manchester.ac.uk"
                onChange={(website) => patchSchool(school.id, { website: website ?? "" })}
                onCommit={(href) =>
                  void iconFor(href, (logo) => patchSchool(school.id, { logo }), hasLogo)
                }
              />
              <ImageField
                label="Logo"
                kind="logo"
                value={own?.logo ?? null}
                fallback={{ src: null, text: school.logo.monogram }}
                onChange={(logo, undo) => patchSchool(school.id, { logo }, undo)}
              />
            </div>
          </details>
        );
      })}
      <SkillYears content={content} auto={auto} view={view} />
    </SectionCard>
  );
}

function Monogram({ src, text }: { src: string | null; text: string }) {
  return (
    <span className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface text-xs font-semibold text-muted ring-1 ring-border">
      {text}
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="absolute inset-0 size-full bg-surface object-contain p-1"
        />
      ) : null}
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
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
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
