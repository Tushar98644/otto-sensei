import type { Extraction } from "@/lib/parse/types";
import { SECTION_KEYS, SECTION_LABELS, type SectionKey } from "@/lib/resume/schema";
import {
  bulletText,
  dateStyle,
  findDateRanges,
  findEmail,
  findPhone,
  headingsInLine,
  isPresent,
  splitInlineHeading,
  splitIntoSections,
  type DateRange,
  type DateStyle,
  type HeadingKind,
  type SectionBlock,
} from "@/lib/resume/sections";
import type { CheckId, CheckStatus, RecruiterCheck, RecruiterReport } from "./types";

// Thresholds, with the reasoning behind each one.
// Recruiters skim; past two pages most of a resume goes unread.
const MAX_PAGES = 2;
// Under ~150 words there's too little text to match against a job post.
const MIN_WORDS = 150;
// Roughly three printed lines. Bullets rarely run this long; descriptive paragraphs usually do.
const PARAGRAPH_WORDS = 50;
// Paragraphs must carry at least half of the job text, and enough of it to matter.
const PARAGRAPH_SHARE = 0.5;
const MIN_PARAGRAPH_WORDS = 60;
// A PDF line at least this share of the longest line probably wraps onto the next one.
const WRAPPED_LINE_SHARE = 0.85;

const STATUS_RANK: Record<CheckStatus, number> = { fail: 0, warn: 1, pass: 2 };
const SCAN_FIX = "Upload a PDF exported from Word or Google Docs, not a scan or photo.";

type Context = {
  extraction: Extraction;
  readable: boolean;
  blocks: SectionBlock[];
  sectionsFound: SectionKey[];
  email: string | null;
  phone: string | null;
  headerEmail: string | null;
  headerPhone: string | null;
};

type Check = (context: Context) => RecruiterCheck;

/**
 * Deterministic checks over an Extraction (no AI, no network). Runs on the server after upload and
 * again on our own exported PDF ("before vs after").
 *
 * Every CheckId in ./types must be evaluated. Checks order: fail, warn, pass. Copy is plain and
 * short; `fix` is one concrete action. Uses matchHeading/findSections from @/lib/resume/sections.
 */
export function runRecruiterChecks(extraction: Extraction, now = Date.now()): RecruiterReport {
  const context = analyze(extraction);
  // Array.prototype.sort is stable, so checks keep their logical order within each status.
  const checks = CHECKS.map((run) => run(context)).sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]);
  const counts: Record<CheckStatus, number> = { fail: 0, warn: 0, pass: 0 };
  for (const result of checks) counts[result.status]++;
  return {
    kind: extraction.kind,
    pageCount: extraction.pageCount,
    wordCount: extraction.wordCount,
    checks,
    counts,
    readText: extraction.text,
    sectionsFound: context.sectionsFound,
    checkedAt: now,
  };
}

function analyze(extraction: Extraction): Context {
  const found = new Set<SectionKey>();
  const order: SectionKey[] = [];
  const add = (kind: HeadingKind | undefined) => {
    if (kind && kind !== "other" && !found.has(kind)) {
      found.add(kind);
      order.push(kind);
    }
  };
  for (const line of extraction.lines) {
    // Side-by-side headings count too: the heading exists even if the columns get mixed.
    for (const { kind } of headingsInLine(line)) add(kind);
    // So do labelled lines like "Skills: Python, SQL", which many parsers recognise.
    for (const segment of line.split("\t")) add(splitInlineHeading(segment)?.kind);
  }
  const headerText = extraction.signals.headerFooterText;
  return {
    extraction,
    readable: extraction.signals.hasTextLayer,
    blocks: splitIntoSections(extraction.lines),
    sectionsFound: order,
    email: findEmail(extraction.text),
    phone: findPhone(extraction.text),
    headerEmail: headerText ? findEmail(headerText) : null,
    headerPhone: headerText ? findPhone(headerText) : null,
  };
}

function check(id: CheckId, status: CheckStatus, title: string, detail: string, fix: string | null = null): RecruiterCheck {
  return { id, status, title, detail, fix: status === "pass" ? null : fix };
}

// Without a text layer there's nothing to look at, which is a different message from "missing".
function notChecked(id: CheckId, title: string, what: string): RecruiterCheck {
  return check(id, "warn", title, `There's no readable text, so we couldn't check ${what}.`, SCAN_FIX);
}

function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

const textLayer: Check = ({ readable }) =>
  readable
    ? check("text-layer", "pass", "Text is readable", "Hiring software can pull the text out of this file.")
    : check(
        "text-layer",
        "fail",
        "No readable text",
        "Hiring software can't read any text in this file. It's probably a scan or an image.",
        SCAN_FIX,
      );

const contactEmail: Check = ({ readable, email, headerEmail }) => {
  if (!readable) return notChecked("contact-email", "Email not checked", "for an email address");
  if (email) return check("contact-email", "pass", "Email address found", `We found ${email}, so recruiters can reach you.`);
  return check(
    "contact-email",
    "fail",
    "No email address",
    "We couldn't find an email address in the main text. Without one, recruiters can't reach you.",
    headerEmail
      ? "Move your email out of the page header and into the main text."
      : "Add your email address as plain text near the top of the page.",
  );
};

const contactPhone: Check = ({ readable, phone, headerPhone }) => {
  if (!readable) return notChecked("contact-phone", "Phone not checked", "for a phone number");
  if (phone) return check("contact-phone", "pass", "Phone number found", `We found ${phone}.`);
  return check(
    "contact-phone",
    "warn",
    "No phone number",
    "We couldn't find a phone number. Many recruiters call or text before they email.",
    headerPhone
      ? "Move your phone number out of the page header and into the main text."
      : "Add your phone number next to your email.",
  );
};

const contactInHeader: Check = ({ extraction, email, phone, headerEmail, headerPhone }) => {
  if (extraction.kind === "pdf") {
    return check(
      "contact-in-header",
      "pass",
      "Nothing hidden in headers",
      "In a PDF, header text is part of the page, so hiring software reads it.",
    );
  }
  const hidden = [headerEmail && !email ? "email" : null, headerPhone && !phone ? "phone number" : null].filter(
    (item): item is string => item !== null,
  );
  if (hidden.length === 0) {
    return check(
      "contact-in-header",
      "pass",
      "Nothing hidden in headers",
      "None of your contact details are tucked away in a page header or footer.",
    );
  }
  const what = hidden.join(" and ");
  return check(
    "contact-in-header",
    "fail",
    "Contact details in the header",
    `Your ${what} ${hidden.length > 1 ? "are" : "is"} only in the page header or footer. Many systems skip those, so they never see ${hidden.length > 1 ? "them" : "it"}.`,
    "Move your contact details into the main body of the page.",
  );
};

const sections: Check = ({ readable, sectionsFound }) => {
  if (!readable) return notChecked("sections", "Sections not checked", "your section headings");
  const has = (key: SectionKey) => sectionsFound.includes(key);
  if (!has("experience")) {
    // Projects stand in for jobs early in a career, so their absence alone isn't a failure.
    if (has("projects")) {
      return check(
        "sections",
        "warn",
        "No work history section",
        "We found Projects but no Experience heading. That's fine early on, but jobs belong under Experience.",
        'If you\'ve had jobs or internships, list them under an "Experience" heading.',
      );
    }
    return check(
      "sections",
      "fail",
      "No work history section",
      'We couldn\'t find a heading like "Experience" or "Work History". Without one, many systems can\'t tell your jobs apart.',
      'Put your jobs under a clear heading such as "Experience".',
    );
  }
  const missingSkills = !has("skills");
  const missingEducation = !has("education");
  if (missingSkills && missingEducation) {
    return check(
      "sections",
      "warn",
      "No Skills or Education section",
      "We couldn't find Skills or Education headings. Many systems use both to match you to jobs.",
      'Add short "Skills" and "Education" sections.',
    );
  }
  if (missingSkills) {
    return check(
      "sections",
      "warn",
      "No Skills section",
      "We couldn't find a Skills heading. Many systems use it to match you to jobs.",
      'Add a "Skills" section that lists the tools you use.',
    );
  }
  if (missingEducation) {
    return check(
      "sections",
      "warn",
      "No Education section",
      "We couldn't find an Education heading. Many systems expect one, even a short one.",
      'Add an "Education" section, even if it\'s one line.',
    );
  }
  const names = SECTION_KEYS.filter(has).map((key) => SECTION_LABELS[key]);
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : (names[0] ?? "");
  return check("sections", "pass", "Clear section headings", `We found ${list}.`);
};

const columns: Check = ({ extraction, readable }) => {
  // PDF columns are found from text positions, so a scan can't be judged. DOCX columns are a setting.
  if (!readable && extraction.kind === "pdf") return notChecked("columns", "Layout not checked", "the layout");
  if (!extraction.signals.columnLayout) {
    return check("columns", "pass", "Single column", "Your text reads top to bottom in one column.");
  }
  const what = extraction.kind === "pdf" ? "Your page has side-by-side columns." : "Your document is set up in columns.";
  return check(
    "columns",
    "warn",
    "Two-column layout",
    `${what} Some systems read straight across and mix them together.`,
    "Switch to a single-column layout.",
  );
};

const tables: Check = ({ extraction }) => {
  if (extraction.kind === "pdf") {
    return check(
      "tables",
      "pass",
      "No table problems",
      "Tables only trip up hiring software in Word files. In a PDF they're plain text, and the layout check covers them.",
    );
  }
  const count = extraction.signals.tableCount;
  if (count === 0) return check("tables", "pass", "No tables", "Your text isn't inside tables, which some systems misread.");
  return check(
    "tables",
    "warn",
    "Tables found",
    `Your file has ${plural(count, "table")}. Some systems read table cells out of order or skip them.`,
    "Replace tables with plain lines of text.",
  );
};

const textBoxes: Check = ({ extraction }) => {
  if (extraction.kind === "pdf") {
    return check(
      "text-boxes",
      "pass",
      "No text box problems",
      "In a PDF, text boxes become regular text that hiring software can read.",
    );
  }
  const count = extraction.signals.textBoxCount;
  if (count === 0) return check("text-boxes", "pass", "No text boxes", "All your text sits in the main page.");
  return check(
    "text-boxes",
    "fail",
    "Text boxes found",
    `Your file has ${plural(count, "text box", "text boxes")}. Many systems skip text boxes entirely, so that text may never be read.`,
    "Move the text out of the text boxes and into the main page.",
  );
};

const images: Check = ({ extraction, readable }) => {
  const count = extraction.signals.imageCount;
  if (count === 0) return check("images", "pass", "No images", "Nothing important is hidden in a picture.");
  if (!readable) {
    return check("images", "warn", "Pages are images", "Your pages are pictures. Hiring software can't see what's in them.", SCAN_FIX);
  }
  return check(
    "images",
    "warn",
    "Images found",
    `We found ${plural(count, "image")}. Logos, photos and skill bars are invisible to hiring software.`,
    "Remove the images, or repeat anything important as plain text.",
  );
};

const icons: Check = ({ extraction, readable }) => {
  if (!readable) return notChecked("icons", "Icons not checked", "for icon characters");
  const count = extraction.signals.iconGlyphCount;
  if (count === 0) return check("icons", "pass", "No icon characters", "No symbols that would show up as junk text.");
  return check(
    "icons",
    "warn",
    "Icon characters found",
    `We found ${plural(count, "icon character")}, like phone or email symbols. Many systems show them as boxes or junk.`,
    'Swap icons for plain words like "Email" and "Phone".',
  );
};

const dates: Check = ({ extraction, readable, blocks }) => {
  if (!readable) return notChecked("dates", "Dates not checked", "your dates");
  const { ranges, fromJobs } = jobDateRanges(blocks, extraction.signals.columnLayout);
  if (ranges.length === 0) {
    return check(
      "dates",
      "warn",
      "No dates found",
      "We couldn't find dates for your jobs. Many systems use them to work out your years of experience.",
      'Add start and end dates to each job, like "Jan 2021 - Mar 2023".',
    );
  }
  const sample = ranges[0] ? `${ranges[0].start} - ${ranges[0].end}` : "";
  // Without a clean job history to read, education years could be mixed in, so only say dates exist.
  if (!fromJobs) {
    return check("dates", "pass", "Dates found", `We found dates like "${sample}", so systems can work out your experience.`);
  }
  // Seasons ("Summer 2022") are normal for internships, and "Present" isn't a format.
  const examples = new Map<DateStyle, { sample: string; uses: number }>();
  for (const range of ranges) {
    for (const date of [range.start, range.end]) {
      if (isPresent(date)) continue;
      const style = dateStyle(date);
      if (style === "season") continue;
      const entry = examples.get(style) ?? { sample: date, uses: 0 };
      entry.uses++;
      examples.set(style, entry);
    }
  }
  const styles = [...examples.values()].sort((a, b) => b.uses - a.uses);
  const [main, other] = styles;
  if (main && other) {
    return check(
      "dates",
      "warn",
      "Mixed date formats",
      `Your dates mix styles, like "${main.sample}" and "${other.sample}". Some systems misread mixed formats when they add up your experience.`,
      `Write every date the same way, like "${main.sample}".`,
    );
  }
  return check("dates", "pass", "Dates look consistent", `Your job dates all use one style, like "${sample}".`);
};

// Date ranges on job header lines; ranges inside bullets ("grew sales from 2019 to 2021") don't
// count. Without a clear Experience section, or when columns are mixed into it, every non-education
// line is searched instead, so a layout problem never turns into a false "no dates".
function jobDateRanges(blocks: readonly SectionBlock[], columnLayout: boolean): { ranges: DateRange[]; fromJobs: boolean } {
  const headerRanges = (keep: (block: SectionBlock) => boolean) =>
    blocks
      .filter(keep)
      .flatMap((block) => block.lines)
      .filter((line) => !lineHasBullet(line))
      .flatMap((line) => findDateRanges(line));
  const fromJobs = columnLayout ? [] : headerRanges((block) => block.kind === "experience");
  if (fromJobs.length > 0) return { ranges: fromJobs, fromJobs: true };
  return {
    ranges: headerRanges((block) => block.kind !== "education" && block.kind !== "certifications"),
    fromJobs: false,
  };
}

const length: Check = ({ extraction, readable }) => {
  if (!readable) return notChecked("length", "Length not checked", "the length");
  const { pageCount, wordCount } = extraction;
  if (wordCount < MIN_WORDS) {
    return check(
      "length",
      "warn",
      "Very little text",
      `We found only ${plural(wordCount, "word")}. That gives hiring software little to match against a job.`,
      "Add a few bullet points about what you did in each role.",
    );
  }
  if (pageCount > MAX_PAGES) {
    return check(
      "length",
      "warn",
      "Longer than two pages",
      `Your resume is ${plural(pageCount, "page")}. Recruiters skim, and many expect one or two.`,
      "Trim older or less relevant roles to fit two pages.",
    );
  }
  return check(
    "length",
    "pass",
    "Good length",
    `${plural(pageCount, "page")} and ${plural(wordCount, "word")}: enough to match jobs, short enough to skim.`,
  );
};

const bullets: Check = ({ extraction, readable, blocks }) => {
  if (!readable) return notChecked("bullets", "Bullets not checked", "your bullet points");
  const jobLines = blocks.filter((block) => block.kind === "experience").flatMap((block) => block.lines);
  const lines =
    jobLines.length > 0
      ? jobLines
      : blocks.filter((block) => block.kind !== null && block.kind !== "summary").flatMap((block) => block.lines);
  const paragraphs = textBlocks(lines, extraction.kind === "pdf");
  let total = 0;
  let inParagraphs = 0;
  for (const block of paragraphs) {
    total += block.words;
    if (!block.bulleted && block.words >= PARAGRAPH_WORDS) inParagraphs += block.words;
  }
  if (inParagraphs >= MIN_PARAGRAPH_WORDS && inParagraphs >= total * PARAGRAPH_SHARE) {
    return check(
      "bullets",
      "warn",
      "Long paragraphs in your jobs",
      "Your job details are written as long paragraphs. Short bullet points are easier to skim and to match.",
      "Break each job into 3-5 short bullet points that start with a verb.",
    );
  }
  return check("bullets", "pass", "Easy to skim", "No long paragraphs, so your jobs are quick to scan.");
};

// Rebuilds paragraphs and bullets from lines. A DOCX line is already one paragraph; a PDF paragraph
// spans several visual lines, so a near-full-width line is treated as wrapping onto the next.
function textBlocks(lines: readonly string[], wrapsLines: boolean): { words: number; bulleted: boolean }[] {
  const longest = Math.max(0, ...lines.map((line) => line.length));
  const blocks: { words: number; bulleted: boolean }[] = [];
  let open = false;
  for (const line of lines) {
    const bulleted = lineHasBullet(line);
    const words = line.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
    const current = blocks.at(-1);
    if (open && current && !bulleted) current.words += words;
    else blocks.push({ words, bulleted });
    open = wrapsLines && line.length >= longest * WRAPPED_LINE_SHARE && !/[.!?]$/.test(line);
  }
  return blocks;
}

// A bullet marker at the start of the line or of any side-by-side segment (two-column rows).
function lineHasBullet(line: string): boolean {
  return line.split("\t").some((segment) => bulletText(segment) !== null);
}

const CHECKS: readonly Check[] = [
  textLayer,
  contactEmail,
  contactPhone,
  contactInHeader,
  sections,
  columns,
  tables,
  textBoxes,
  images,
  icons,
  dates,
  length,
  bullets,
];
