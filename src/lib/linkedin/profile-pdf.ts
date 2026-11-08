import { groupRows, rowText, type LayoutItem } from "@/lib/parse/pdf-layout";
import type { Extraction } from "@/lib/parse/types";

// LinkedIn's "More → Save to PDF" profile puts contact details, top skills, languages and
// certifications in a left sidebar beside the main column. Read row by row (as hiring software
// does) the sidebar's "Contact" lands where the name should be and every job line is glued to a
// skill. For that one well-known layout the text is rebuilt column by column: the main column
// first, then the sidebar, without the "Page 1 of 3" footers.

const SIDEBAR_HEADINGS = ["Contact", "Top Skills", "Languages", "Certifications", "Honors-Awards", "Publications", "Patents"];
const MAIN_HEADINGS = ["Summary", "Experience", "Education"];
const FOOTER = /^Page \d+ of \d+$/;
// The sidebar's text starts near the left edge; the main column starts about a third across.
const SIDEBAR_SHARE = 0.3;
// "March 2022 - Present (2 years 9 months)": the duration is LinkedIn's arithmetic, not a date.
const DURATION = /\s*\((?:(?:\d+|less than a) (?:years?|months?)\s*)+\)\s*$/i;

export function isLinkedInProfile(extraction: Extraction): boolean {
  if (extraction.kind !== "pdf") return false;
  const lines = new Set(extraction.text.split(/[\n\t]/).map((line) => line.trim()));
  return (
    /linkedin\.com\/in\//i.test(extraction.text) &&
    SIDEBAR_HEADINGS.some((heading) => lines.has(heading)) &&
    MAIN_HEADINGS.filter((heading) => lines.has(heading)).length >= 2
  );
}

/** The profile's text in reading order, or null when the file isn't a LinkedIn profile PDF. */
export function linkedInProfileText(extraction: Extraction): string | null {
  if (!isLinkedInProfile(extraction)) return null;
  const main: Line[] = [];
  const sidebar: string[] = [];
  for (const page of extraction.pages) {
    const split = page.width * SIDEBAR_SHARE;
    const items: LayoutItem[] = page.items
      .filter((item) => item.str.trim() !== "")
      .map((item) => ({ ...item, baseline: item.y + item.height, upright: true }));
    for (const row of groupRows(items.filter((item) => item.x < split))) sidebar.push(rowText(row.items).trim());
    for (const row of groupRows(items.filter((item) => item.x >= split))) {
      main.push({ text: rowText(row.items).trim(), size: row.size });
    }
  }
  const clean = (lines: string[]) =>
    lines.filter((line) => line !== "" && !FOOTER.test(line)).map((line) => line.replace(DURATION, ""));
  const body = clean(withCompanies(main.filter((line) => line.text !== "" && !FOOTER.test(line.text))));
  const { contact, rest } = sidebarSections(joinLinkLabels(clean(sidebar)));
  // Contact details belong under the name and headline, before the first section heading.
  const headerEnd = body.findIndex((line) => MAIN_HEADINGS.includes(line));
  const cut = headerEnd === -1 ? Math.min(3, body.length) : headerEnd;
  return [...body.slice(0, cut), ...contact, ...body.slice(cut), "", ...rest].join("\n");
}

type Line = { text: string; size: number };

const MONTH_YEAR = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?\\s+\\d{4}";
const DATE_RANGE = new RegExp(`^(?:${MONTH_YEAR}|\\d{4})\\s*[-–]\\s*(?:present|${MONTH_YEAR}|\\d{4})`, "i");
// A company with several roles shows its total time on its own line: "5 years 2 months".
const TOTAL_TIME = /^(?:\d+ years?)?\s*(?:\d+ months?)?$/i;

/**
 * LinkedIn prints each company in a larger font on its own line above the role, then the title,
 * then the dates. Parsers expect title and company together above the dates, so each title gets
 * its company appended ("Product Designer | Contoso"), roles at the same company included.
 */
function withCompanies(lines: Line[]): string[] {
  const bodySize = modalSize(lines);
  const out: string[] = [];
  let section = "";
  let company = "";
  for (const line of lines) {
    if (MAIN_HEADINGS.includes(line.text)) {
      section = line.text;
      company = "";
      out.push(line.text);
      continue;
    }
    if (section === "Experience" && line.size > bodySize + 0.5) {
      company = line.text;
      continue;
    }
    if (section === "Experience" && company && TOTAL_TIME.test(line.text)) continue;
    if (section === "Experience" && company && DATE_RANGE.test(line.text)) {
      const title = out.at(-1);
      if (title !== undefined && !MAIN_HEADINGS.includes(title)) out[out.length - 1] = `${title} | ${company}`;
    }
    out.push(line.text);
  }
  return out;
}

function modalSize(lines: Line[]): number {
  const counts = new Map<number, number>();
  for (const line of lines) counts.set(Math.round(line.size), (counts.get(Math.round(line.size)) ?? 0) + 1);
  let best = 0;
  let bestCount = 0;
  for (const [size, count] of counts) if (count > bestCount) [best, bestCount] = [size, count];
  return best;
}

function sidebarSections(lines: string[]): { contact: string[]; rest: string[] } {
  const contact: string[] = [];
  const rest: string[] = [];
  let inContact = false;
  for (const line of lines) {
    if (SIDEBAR_HEADINGS.includes(line)) {
      inContact = line === "Contact";
      if (!inContact) rest.push(sidebarLine(line));
    } else (inContact ? contact : rest).push(line);
  }
  return { contact, rest };
}

// "Top Skills" is LinkedIn's name for the skills a parser looks for under "Skills".
function sidebarLine(line: string): string {
  return line === "Top Skills" ? "Skills" : line;
}

// Long profile URLs wrap, leaving "(LinkedIn)" or "(Portfolio)" alone on the next line.
function joinLinkLabels(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const previous = out.at(-1);
    if (previous && /^\([A-Za-z ]+\)$/.test(line) && /\S\.\S/.test(previous)) out[out.length - 1] = `${previous} ${line}`;
    else out.push(line);
  }
  return out;
}
