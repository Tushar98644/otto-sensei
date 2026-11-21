import { lintResume } from "@/lib/lint/bullets";
import { firstWeakLine } from "@/lib/lint/weak-lines";
import type { Resume } from "@/lib/resume/schema";

const count = new Intl.NumberFormat("en-US");

const SOURCE_LABELS: readonly (readonly [Resume["source"], string])[] = [
  ["import", "uploaded"],
  ["scratch", "from scratch"],
  ["tailored", "tailored"],
];

export function sourceNote(sources: readonly Resume["source"][]): string {
  const parts = SOURCE_LABELS.map(
    ([source, label]) => [sources.filter((item) => item === source).length, label] as const,
  )
    .filter(([total]) => total > 0)
    .map(([total, label]) => `${count.format(total)} ${label}`);
  return parts.length > 0 ? parts.join(" · ") : "None yet";
}

export type LineTotals = {
  total: number;
  first: { resumeId: string; bulletId: string } | null;
};

export function linesToImprove(resumes: readonly Resume[]): LineTotals {
  let total = 0;
  let first: LineTotals["first"] = null;
  for (const resume of resumes) {
    const { byBullet, totals } = lintResume(resume);
    total += totals.withIssues;
    if (first) continue;
    const bulletId = firstWeakLine(resume, (id) =>
      Object.hasOwn(byBullet, id) ? byBullet[id] : undefined,
    );
    if (bulletId) first = { resumeId: resume.id, bulletId };
  }
  return { total, first };
}
