import type { Resume } from "./schema";
import {
  classifyHeading,
  extraKindOf,
  findDateRanges,
  findEmail,
  splitIntoSections,
  type HeadingKind,
} from "./sections";

export type WeakReadSign =
  | "mixed_columns"
  | "text_boxes"
  | "no_jobs"
  | "lineless_jobs"
  | "empty_section"
  | "nameless_job"
  | "unsorted_summary";

export type ReadLayout = {
  mixedColumns?: boolean;
  textBoxes?: boolean;
};

const LIST_SECTIONS = ["experience", "education", "projects", "skills", "certifications"] as const;
type ListSection = (typeof LIST_SECTIONS)[number];

const MAX_SUMMARY_DATE_RANGES = 1;

const CAPITALS_RUN = /\b\p{Lu}{3,}(?:\s+\p{Lu}{2,})*\b/gu;

function toLines(text: string): string[] {
  return text
    .split(/\r\n?|\n/)
    .map((line) =>
      line
        .replace(/[  ]+/g, " ")
        .replace(/ *\t[\t ]*/g, "\t")
        .trim(),
    )
    .filter(Boolean);
}

function isListSection(kind: HeadingKind | null): kind is ListSection {
  return LIST_SECTIONS.includes(kind as ListSection);
}

function hasEmptySection(text: string, resume: Resume): boolean {
  return splitIntoSections(toLines(text)).some((block) => {
    if (!isListSection(block.kind) || block.lines.length === 0) return false;
    if (block.kind === "experience" && extraKindOf(block.heading)) return false;
    return resume[block.kind].length === 0;
  });
}

function headingInside(summary: string): boolean {
  for (const [run] of summary.matchAll(CAPITALS_RUN)) {
    const words = run.split(/\s+/);
    if (classifyHeading(run) || words.some((word) => classifyHeading(word))) return true;
  }
  return false;
}

function isUnsorted(summary: string): boolean {
  if (!summary) return false;
  return (
    findEmail(summary) !== null ||
    findDateRanges(summary).length > MAX_SUMMARY_DATE_RANGES ||
    headingInside(summary)
  );
}

export function weakReadSigns(
  text: string,
  resume: Resume,
  { mixedColumns = false, textBoxes = false }: ReadLayout = {},
): WeakReadSign[] {
  const jobs = resume.experience;
  const signs: WeakReadSign[] = [];
  if (mixedColumns) signs.push("mixed_columns");
  if (textBoxes) signs.push("text_boxes");
  if (jobs.length === 0) signs.push("no_jobs");
  else if (jobs.every((job) => job.bullets.length === 0)) signs.push("lineless_jobs");
  if (jobs.some((job) => !job.title.trim() && !job.company.trim())) signs.push("nameless_job");
  if (hasEmptySection(text, resume)) signs.push("empty_section");
  if (isUnsorted(resume.summary)) signs.push("unsorted_summary");
  return signs;
}

export function isWeakRead(text: string, resume: Resume, layout?: ReadLayout): boolean {
  return weakReadSigns(text, resume, layout).length > 0;
}
