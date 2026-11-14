import { lintResume } from "@/lib/lint/bullets";
import type { LintIssue, ResumeLint } from "@/lib/lint/types";
import type { EntrySection } from "@/lib/resume/ops";
import { extrasOf, type Resume } from "@/lib/resume/schema";

export type EditorLint = {
  byBullet: ReadonlyMap<string, readonly LintIssue[]>;
  totals: ResumeLint["totals"];
};

export const NO_ISSUES: readonly LintIssue[] = Object.freeze([]);

type Linted = { editor: EditorLint; raw: ResumeLint };

const byResume = new WeakMap<Resume, Linted>();
let previous: EditorLint | null = null;

function sameIssues(a: readonly LintIssue[], b: readonly LintIssue[]): boolean {
  return (
    a.length === b.length &&
    a.every((issue, index) => {
      const other = b[index];
      return (
        other !== undefined &&
        issue.id === other.id &&
        issue.severity === other.severity &&
        issue.message === other.message &&
        issue.match === other.match
      );
    })
  );
}

function sameTotals(a: ResumeLint["totals"], b: ResumeLint["totals"]): boolean {
  return (
    a.bullets === b.bullets &&
    a.withIssues === b.withIssues &&
    a.withNumbers === b.withNumbers &&
    a.highSeverity === b.highSeverity
  );
}

function linted(resume: Resume): Linted {
  const cached = byResume.get(resume);
  if (cached) return cached;
  const raw = lintResume(resume);
  const byBullet = new Map<string, readonly LintIssue[]>();
  for (const [bulletId, issues] of Object.entries(raw.byBullet)) {
    const before = previous?.byBullet.get(bulletId);
    if (before && sameIssues(before, issues)) byBullet.set(bulletId, before);
    else byBullet.set(bulletId, issues.length > 0 ? issues : NO_ISSUES);
  }
  const totals = previous && sameTotals(previous.totals, raw.totals) ? previous.totals : raw.totals;
  const entry: Linted = { editor: { byBullet, totals }, raw };
  byResume.set(resume, entry);
  previous = entry.editor;
  return entry;
}

export function lintOf(resume: Resume): EditorLint {
  return linted(resume).editor;
}

export function resumeLintOf(resume: Resume): ResumeLint {
  return linted(resume).raw;
}

export function bulletIssues(resume: Resume, bulletId: string): readonly LintIssue[] {
  return lintOf(resume).byBullet.get(bulletId) ?? NO_ISSUES;
}

function countNeedingWork(resume: Resume, items: readonly { bullets: { id: string }[] }[]): number {
  const { byBullet } = lintOf(resume);
  let count = 0;
  for (const item of items) {
    for (const bullet of item.bullets) {
      if ((byBullet.get(bullet.id)?.length ?? 0) > 0) count += 1;
    }
  }
  return count;
}

export function sectionNeedsWork(resume: Resume, section: EntrySection): number {
  return countNeedingWork(resume, resume[section]);
}

export function extraNeedsWork(resume: Resume, sectionId: string): number {
  const section = extrasOf(resume).find((item) => item.id === sectionId);
  return section ? countNeedingWork(resume, section.items) : 0;
}
