import { lintResume } from "@/lib/lint/bullets";
import type { LintIssue, ResumeLint } from "@/lib/lint/types";
import type { EntrySection } from "@/lib/resume/ops";
import { extrasOf, type Resume } from "@/lib/resume/schema";

// Results equal to the previous run keep their identity, so only lines whose issues changed
// re-render. Lint runs once per resume version, however many lines ask.

export type EditorLint = {
  byBullet: ReadonlyMap<string, readonly LintIssue[]>;
  totals: ResumeLint["totals"];
};

export const NO_ISSUES: readonly LintIssue[] = Object.freeze([]);

const byResume = new WeakMap<Resume, EditorLint>();
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

export function lintOf(resume: Resume): EditorLint {
  const cached = byResume.get(resume);
  if (cached) return cached;
  const fresh = lintResume(resume);
  const byBullet = new Map<string, readonly LintIssue[]>();
  for (const [bulletId, issues] of Object.entries(fresh.byBullet)) {
    const before = previous?.byBullet.get(bulletId);
    if (before && sameIssues(before, issues)) byBullet.set(bulletId, before);
    else byBullet.set(bulletId, issues.length > 0 ? issues : NO_ISSUES);
  }
  const totals =
    previous && sameTotals(previous.totals, fresh.totals) ? previous.totals : fresh.totals;
  const lint: EditorLint = { byBullet, totals };
  byResume.set(resume, lint);
  previous = lint;
  return lint;
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

// For the badge on a collapsed section. Hidden lines are never linted, so never count.
export function sectionNeedsWork(resume: Resume, section: EntrySection): number {
  return countNeedingWork(resume, resume[section]);
}

export function extraNeedsWork(resume: Resume, sectionId: string): number {
  const section = extrasOf(resume).find((item) => item.id === sectionId);
  return section ? countNeedingWork(resume, section.items) : 0;
}
