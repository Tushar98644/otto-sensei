import type { Resume } from "./schema";
import {
  classifyHeading,
  extraKindOf,
  findDateRanges,
  findEmail,
  splitIntoSections,
  type HeadingKind,
} from "./sections";

// Client-safe and pure. Whether the rule-based read of an upload can be kept as it is, or the AI
// reader should take it over. On a clean file the AI finds nothing the rules missed but costs an
// AI read and 4-22 seconds, so it only runs when one of these signs shows the rules lost the
// thread. Measured on the cost audit's files (AUDIT-cost-and-findability.md, "Rules reader vs AI
// reader"): the two-column PDF shows three of them, the clean PDF and Jordan's text none.

export type WeakReadSign =
  // A PDF in side-by-side columns: its rows are read straight across both columns, so lines from
  // the sidebar land inside jobs. Only the AI can pull them apart again.
  | "mixed_columns"
  // A Word file with text boxes: their text sits wherever the box was anchored, often inside
  // another section (a skills box read as a job's line).
  | "text_boxes"
  // No job found: either there's no work history, or the rules couldn't tell where a job starts.
  | "no_jobs"
  // Jobs found, but not one line under any of them: the lines went somewhere else.
  | "lineless_jobs"
  // A section heading with lines under it that came out empty.
  | "empty_section"
  // A job with lines but neither a title nor a company: its heading line wasn't recognised.
  | "nameless_job"
  // Headings, an email address or several date ranges in the summary: lines left unsorted.
  | "unsorted_summary";

// What the file's layout says about the reading order, from the upload's extraction.
export type ReadLayout = {
  // Read straight across side-by-side columns: a PDF whose layout has columns, unless its text was
  // rebuilt column by column, as LinkedIn profile PDFs are.
  mixedColumns?: boolean;
  textBoxes?: boolean;
};

// Section headings whose lines land in a list of the same name.
const LIST_SECTIONS = ["experience", "education", "projects", "skills", "certifications"] as const;
type ListSection = (typeof LIST_SECTIONS)[number];

// One date range reads as prose ("from 2019 to 2021 I led..."); a job list pasted into the summary
// brings one per job.
const MAX_SUMMARY_DATE_RANGES = 1;

// A run of capitalised words ("CONTACT EXPERIENCE"): how headings look once a row of two columns
// is joined into running text.
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

/**
 * Signs that the rule-based read of `text` (`resume`, from heuristicParse) is missing or mixing up
 * parts of it. Empty means the read can be kept as it is.
 */
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
