"use client";

import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, Plus, Star, X } from "lucide-react";
import { useState } from "react";
import { GitHubImportButton } from "@/components/github/github-import-button";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CONTENT_LIMITS as L,
  DEVICE_FRAMES,
  ProjectEntrySchema,
  type DeviceFrame,
  type GitHubStats,
  type PortfolioContent,
  type ProjectEntry,
} from "@/lib/portfolio/content";
import type { AutoContent, AutoProject } from "@/lib/portfolio/content-view";
import { compactNumber } from "@/lib/portfolio/metrics";
import type { Resume } from "@/lib/resume/schema";
import { cn } from "@/lib/utils";
import { CheckRow } from "../check-row";
import { editContent } from "./content-store";
import { FieldRow, LinkField, TagsField, TextField } from "./fields";
import { SectionCard } from "./section-card";

type Row = { id: string; entry: ProjectEntry | null; base: AutoProject };

const DEVICE_LABELS: Record<DeviceFrame, string> = {
  auto: "Let the design choose",
  laptop: "Laptop",
  phone: "Phone",
};

function blank(id: string, from: AutoProject["from"], name = ""): AutoProject {
  return {
    id,
    from,
    name,
    line: "",
    description: "",
    lines: [],
    category: "",
    years: "",
    outcome: "",
    tech: [],
    website: null,
    source: null,
    featured: false,
    active: false,
    stars: null,
  };
}

export function projectRows(
  content: PortfolioContent,
  auto: AutoContent,
  github: GitHubStats | null,
): Row[] {
  const autoById = new Map(auto.projects.map((project) => [project.id, project]));
  const entries = new Map(content.projects.map((entry) => [entry.id, entry]));
  const ids = [
    ...content.projects.map((entry) => entry.id),
    ...auto.projects.map((p) => p.id).filter((id) => !entries.has(id)),
  ];
  return ids.flatMap((id): Row[] => {
    const entry = entries.get(id) ?? null;
    const base = autoById.get(id);
    if (base) return [{ id, entry, base }];
    if (id.startsWith("gh:")) {
      const repo = github?.repos.find(
        (item) => item.fullName.toLowerCase() === id.slice(3).toLowerCase(),
      );
      const row = blank(id, "github", repo?.name ?? id.slice(3).split("/")[1] ?? "");
      if (repo) {
        row.line = repo.description;
        row.stars = repo.stars;
        row.outcome = repo.stars >= 10 ? `${compactNumber(repo.stars)} stars` : "";
        row.tech = repo.language ? [repo.language] : [];
        row.source = { href: repo.url, text: `github.com/${repo.fullName}`, repo: repo.fullName };
      }
      return [{ id, entry, base: row }];
    }
    if (id.startsWith("c:")) return [{ id, entry, base: blank(id, "custom") }];
    return [];
  });
}

function saveRows(
  rows: readonly Row[],
  change: (entries: ProjectEntry[]) => ProjectEntry[],
  undo?: string,
) {
  editContent((current) => {
    const kept = current.projects.filter((entry) => !rows.some((row) => row.id === entry.id));
    const entries = rows.map((row) => row.entry ?? ProjectEntrySchema.parse({ id: row.id }));
    return { ...current, projects: [...change(entries), ...kept].slice(0, L.projects) };
  }, undo);
}

function patchRow(rows: readonly Row[], id: string, patch: Partial<ProjectEntry>, undo?: string) {
  saveRows(
    rows,
    (entries) => entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    undo,
  );
}

type ProjectsCardProps = {
  content: PortfolioContent;
  auto: AutoContent;
  github: GitHubStats | null;
  hidden?: string;
  resume?: Resume | null;
  onResumeChange?: (resume: Resume) => void;
};

export function ProjectsCard({
  content,
  auto,
  github,
  hidden,
  resume = null,
  onResumeChange,
}: ProjectsCardProps) {
  const rows = projectRows(content, auto, github);
  const [dragging, setDragging] = useState<string | null>(null);
  const shown = rows.filter((row) => !row.entry?.hidden);
  const described = shown.filter((row) => (row.entry?.line ?? row.base.line) !== "").length;
  const onPage = new Set(
    rows.map((row) => (row.base.source?.repo ?? row.id.replace(/^gh:/, "")).toLowerCase()),
  );
  const fromGitHub = (github?.repos ?? [])
    .filter((repo) => !onPage.has(repo.fullName.toLowerCase()))
    .slice(0, 6);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= rows.length) return;
    saveRows(rows, (entries) => {
      const next = [...entries];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item!);
      return next;
    });
  };

  return (
    <SectionCard
      title="Projects"
      hidden={hidden}
      meta={
        shown.length > 0 ? `${shown.length} on the page · ${described} with a line` : "None yet"
      }
      defaultOpen
    >
      {resume ? (
        <div className="flex flex-col gap-3 rounded-xl bg-surface-muted p-4">
          <p className="text-sm/6 text-muted">
            <span className="font-medium text-ink">Work on GitHub?</span> Otto drafts projects from
            your public repos and adds them to your resume, so they show here too.
          </p>
          <GitHubImportButton
            resumeId={resume.id}
            label="Add projects from GitHub"
            size="sm"
            className="self-start"
            onAdded={onResumeChange}
          />
        </div>
      ) : null}
      <p className="text-sm/6 text-muted">
        Drag or use the arrows to change the order. Starred projects get the big spots in designs
        that have them.
      </p>
      <ol className="flex flex-col gap-3">
        {rows.map((row, index) => (
          <li
            key={row.id}
            draggable
            onDragStart={(event) => {
              setDragging(row.id);
              event.dataTransfer.effectAllowed = "move";
            }}
            onDragEnd={() => setDragging(null)}
            onDragOver={(event) => {
              if (dragging) event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              const from = rows.findIndex((other) => other.id === dragging);
              if (from >= 0) move(from, index);
              setDragging(null);
            }}
            className={cn("rounded-xl bg-surface-muted", dragging === row.id && "opacity-60")}
          >
            <ProjectRow
              row={row}
              rows={rows}
              first={index === 0}
              last={index === rows.length - 1}
              onMove={(delta) => move(index, index + delta)}
            />
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        {fromGitHub.map((repo) => (
          <Button
            key={repo.fullName}
            size="sm"
            variant="secondary"
            onClick={() =>
              saveRows(rows, (entries) => [
                ...entries,
                ProjectEntrySchema.parse({ id: `gh:${repo.fullName}` }),
              ])
            }
          >
            <Plus className="size-4" />
            {repo.name}
            {repo.stars > 0 ? (
              <span className="text-muted">★ {compactNumber(repo.stars)}</span>
            ) : null}
          </Button>
        ))}
        <Button
          size="sm"
          variant="ghost"
          disabled={rows.length >= L.projects}
          onClick={() =>
            saveRows(rows, (entries) => [
              ...entries,
              ProjectEntrySchema.parse({ id: `c:${crypto.randomUUID()}`, name: "New project" }),
            ])
          }
        >
          <Plus className="size-4" />
          Add a project
        </Button>
      </div>
    </SectionCard>
  );
}

function ProjectRow({
  row,
  rows,
  first,
  last,
  onMove,
}: {
  row: Row;
  rows: readonly Row[];
  first: boolean;
  last: boolean;
  onMove: (delta: number) => void;
}) {
  const { entry, base } = row;
  const name = entry?.name ?? base.name;
  const featured = entry?.featured ?? base.featured;
  const hidden = entry?.hidden ?? false;
  const patch = (value: Partial<ProjectEntry>, undo?: string) =>
    patchRow(rows, row.id, value, undo);

  return (
    <details className="group/project">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-1 px-3 py-2 [&::-webkit-details-marker]:hidden">
        <GripVertical className="size-4 shrink-0 cursor-grab text-subtle" aria-hidden />
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-sm/6 font-medium",
            hidden ? "text-subtle line-through" : "text-ink",
          )}
        >
          {name || "Untitled project"}
        </span>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-pressed={featured}
          aria-label={featured ? `Unstar ${name}` : `Star ${name}`}
          onClick={(event) => {
            event.preventDefault();
            patch({ featured: !featured });
          }}
        >
          <Star className={cn("size-4", featured && "fill-ink")} />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={`Move ${name} up`}
          disabled={first}
          onClick={(e) => (e.preventDefault(), onMove(-1))}
        >
          <ArrowUp className="size-4" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={`Move ${name} down`}
          disabled={last}
          onClick={(e) => (e.preventDefault(), onMove(1))}
        >
          <ArrowDown className="size-4" />
        </Button>
        {row.base.from === "resume" ? (
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={hidden ? `Show ${name} on the page` : `Hide ${name} from the page`}
            onClick={(event) => {
              event.preventDefault();
              patch({ hidden: !hidden }, hidden ? undefined : `${name || "Project"} hidden`);
            }}
          >
            {hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </Button>
        ) : (
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Remove ${name}`}
            onClick={(event) => {
              event.preventDefault();
              saveRows(
                rows,
                (entries) => entries.filter((item) => item.id !== row.id),
                `${name || "Project"} removed`,
              );
            }}
          >
            <X className="size-4" />
          </Button>
        )}
      </summary>
      <div className="flex flex-col gap-4 border-t border-border px-3 pt-4 pb-4 @sm:px-4">
        <TextField
          label="Name"
          value={entry?.name ?? null}
          auto={base.name}
          max={L.projectName}
          onChange={(value) => patch({ name: value })}
        />
        <TextField
          label="One line"
          value={entry?.line ?? null}
          auto={base.line}
          max={L.projectLine}
          multiline
          onChange={(value) => patch({ line: value })}
        />
        <TextField
          label="Description"
          value={entry?.description ?? null}
          auto={base.description}
          max={L.projectDescription}
          multiline
          onChange={(value) => patch({ description: value })}
        />
        <FieldRow>
          <TextField
            label="Category"
            value={entry?.category ?? null}
            auto={base.category}
            max={L.category}
            placeholder="Open source · CLI"
            onChange={(value) => patch({ category: value })}
          />
          <TextField
            label="Years"
            value={entry?.years ?? null}
            auto={base.years}
            max={L.years}
            placeholder="2024 — Now"
            onChange={(value) => patch({ years: value })}
          />
        </FieldRow>
        <TextField
          label="Outcome"
          value={entry?.outcome ?? null}
          auto={base.outcome}
          max={L.outcome}
          placeholder="4.2k stars · 600+ sites"
          hint="Numbers people remember. Filled in from your lines and GitHub stars."
          onChange={(value) => patch({ outcome: value })}
        />
        <TagsField
          label="Built with"
          value={entry?.tech ?? null}
          auto={base.tech}
          max={L.tags}
          onChange={(value) => patch({ tech: value })}
        />
        <FieldRow>
          <LinkField
            label="Website"
            value={entry?.website ?? null}
            auto={base.website?.href ?? ""}
            onChange={(value) => patch({ website: value })}
          />
          <LinkField
            label="Source code"
            value={entry?.source ?? null}
            auto={base.source?.href ?? ""}
            onChange={(value) => patch({ source: value })}
          />
        </FieldRow>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink" htmlFor={`device-${row.id}`}>
            Device
          </label>
          <Select
            id={`device-${row.id}`}
            value={entry?.device ?? "auto"}
            onChange={(event) => patch({ device: event.currentTarget.value as DeviceFrame })}
          >
            {DEVICE_FRAMES.map((frame) => (
              <option key={frame} value={frame}>
                {DEVICE_LABELS[frame]}
              </option>
            ))}
          </Select>
          <p className="text-sm/5 text-subtle">
            Designs with devices draw the project&apos;s name and line on its screen.
          </p>
        </div>
        <TagsField
          label="Your role"
          value={entry?.roles ?? []}
          max={L.roles}
          hint="Design, Front end, Payments."
          onChange={(value) => patch({ roles: value ?? [] })}
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink" htmlFor={`details-${row.id}`}>
            Longer write-up <span className="font-normal text-muted">(optional)</span>
          </label>
          <Textarea
            id={`details-${row.id}`}
            autoResize
            className="max-h-96"
            placeholder="The problem, what you built, what changed. For designs with a page per project."
            value={(entry?.details ?? []).join("\n\n")}
            maxLength={L.projectDetail * L.projectDetails}
            onChange={(event) =>
              patch({
                details: event.currentTarget.value
                  .split(/\n\s*\n/)
                  .map((part) => part.slice(0, L.projectDetail))
                  .slice(0, L.projectDetails),
              })
            }
          />
        </div>
        {row.base.from === "resume" ? (
          <div className="border-y border-border">
            <CheckRow
              checked={!hidden}
              label="Show on my page"
              onChange={(show) => patch({ hidden: !show })}
            />
          </div>
        ) : null}
      </div>
    </details>
  );
}
