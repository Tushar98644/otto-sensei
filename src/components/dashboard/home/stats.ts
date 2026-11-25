import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import { lintResume } from "@/lib/lint/bullets";
import { firstWeakLine } from "@/lib/lint/weak-lines";
import type { Resume } from "@/lib/resume/schema";
import type { DashboardMessages } from "../i18n";

type SourceKey = "sourceUploaded" | "sourceScratch" | "sourceTailored";

const SOURCE_LABELS: readonly (readonly [Resume["source"], SourceKey])[] = [
  ["import", "sourceUploaded"],
  ["scratch", "sourceScratch"],
  ["tailored", "sourceTailored"],
];

export function sourceNote(
  sources: readonly Resume["source"][],
  { glance }: DashboardMessages,
  format: Format,
): string {
  const parts = SOURCE_LABELS.map(
    ([source, label]) => [sources.filter((item) => item === source).length, label] as const,
  )
    .filter(([total]) => total > 0)
    .map(([total, label]) => fmt(glance[label], { count: format.number(total) }));
  return parts.length > 0 ? parts.join(" · ") : glance.noneYet;
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
