import type { Resume } from "./schema";
import {
  classifyHeading,
  extraKindOf,
  findDateRanges,
  findEmail,
  splitIntoSections,
  type HeadingKind,
} from "./sections";

// The AI reader only takes over when one of these signs shows the rules lost the thread: on a clean
// file it finds nothing more but costs an AI read and 4-22 seconds.

export type WeakReadSign =
  // Rows read straight across both columns, so sidebar lines land inside jobs.
  | "mixed_columns"
  // Their text sits wherever the box was anchored, often inside another section.
  | "text_boxes"
  // No job found: either there's no work history, or the rules couldn't tell where a job starts.
  | "no_jobs"
  | "lineless_jobs"
  | "empty_section"
  | "nameless_job"
  | "unsorted_summary";

export type ReadLayout = {
  // Unless its text was rebuilt column by column, as LinkedIn profile PDFs are.
  mixedColumns?: boolean;
  textBoxes?: boolean;
};

const LIST_SECTIONS = ["experience", "education", "projects", "skills", "certifications"] as const;
type ListSection = (typeof LIST_SECTIONS)[number];

// One date range reads as prose ("from 2019 to 2021 I led..."); a job list pasted into the summary
// brings one per job.
const MAX_SUMMARY_DATE_RANGES = 1;

// How headings look once a row of two columns is joined into running text.
const CAPITALS_RUN = /\b\p{Lu}{3,}(?:\s+\p{Lu}{2,})*\b/gu;

// Same line splitting as the rule-based reader, so the sections line up with what it saw.
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
    // "Volunteer experience" and the like become extra sections, not jobs.
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

// Empty means the read can be kept as it is.
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
