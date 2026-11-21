import type { LintIssue, LintIssueId } from "@/lib/lint/types";
import { listBullets, type BulletRef } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";

const NOT_FOR_OTTO: ReadonlySet<LintIssueId> = new Set(["duplicate", "punctuation"]);

type IssuesById = ReadonlyMap<string, readonly LintIssue[]>;

export function wantsOtto(issues: readonly LintIssue[]): boolean {
  return issues.some((issue) => issue.severity === "high" && !NOT_FOR_OTTO.has(issue.id));
}

export function ottoCanFix(issues: readonly LintIssue[]): boolean {
  return issues.some((issue) => !NOT_FOR_OTTO.has(issue.id));
}

export function weakLines(resume: Resume, byBullet: IssuesById): BulletRef[] {
  return listBullets(resume).filter(
    (line) => line.text.trim() !== "" && ottoCanFix(byBullet.get(line.bulletId) ?? []),
  );
}

function linesLeft(
  resume: Resume,
  byBullet: IssuesById,
  fromId: string,
  skip: ReadonlySet<string>,
): BulletRef[] {
  return weakLines(resume, byBullet).filter(
    (line) => line.bulletId !== fromId && !skip.has(line.bulletId),
  );
}

export function weakLinesLeft(
  resume: Resume,
  byBullet: IssuesById,
  fromId: string,
  skip: ReadonlySet<string> = new Set(),
): number {
  return linesLeft(resume, byBullet, fromId, skip).length;
}

// Lines after this one come first, then the loop wraps to the ones above it.
export function nextWeakLine(
  resume: Resume,
  byBullet: IssuesById,
  fromId: string,
  skip: ReadonlySet<string> = new Set(),
): string | null {
  const order = listBullets(resume).map((line) => line.bulletId);
  const from = order.indexOf(fromId);
  const open = linesLeft(resume, byBullet, fromId, skip);
  const after = open.find((line) => order.indexOf(line.bulletId) > from);
  return (after ?? open[0])?.bulletId ?? null;
}
