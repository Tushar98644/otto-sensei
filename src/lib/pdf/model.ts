import {
  EXTRA_KIND_LABELS,
  SECTION_KEYS,
  SECTION_LABELS,
  extrasOf,
  sectionTitleOf,
  type ExtraKind,
  type ExtraSection,
  type Resume,
  type SectionKey,
} from "@/lib/resume/schema";
import { emailLink, plainText, webLink, type LineCleaner, type PdfLink } from "./links";
import { toPdfLine, toPdfParagraphs, toUnicodeLine, toUnicodeParagraphs } from "./text";
import { companyKey, visibleResume } from "./visible";

// What the PDF shows, already cleaned: drawable characters only, hidden and empty things gone.
// Pure and react-pdf free, so the download step can use it (for the "characters we changed"
// notice) without loading the renderer, and the Word export prints the very same model.

export type PdfBullet = { id: string; text: string };

// A run of jobs at one company prints one company header with each role under it.
export type PdfCompany = {
  name: string;
  // The location, when every role in the run shares it. Otherwise each role shows its own.
  detail: PdfLink | null;
  // The run's first role carries the header.
  first: boolean;
};

export type PdfEntry = {
  id: string;
  // Bold lead, e.g. the job title. Falls back to the next field when it's empty.
  title: string;
  // Follows the title after a comma, e.g. the company. Empty for a role under a company header.
  org: string;
  // Muted, after a middle dot: a location or a project link.
  detail: PdfLink | null;
  // Right-aligned on the same line.
  dates: string;
  bullets: PdfBullet[];
  // Set on every role in a run of jobs at one company.
  company?: PdfCompany;
  // A line of description under the heading (items in extra sections).
  note?: string;
};

export type PdfSkillLine = { id: string; label: string; items: string };

export type PdfSection =
  | { key: "summary"; title: string; paragraphs: string[] }
  | { key: "skills"; title: string; lines: PdfSkillLine[] }
  | {
      key: "experience" | "projects" | "education" | "certifications";
      title: string;
      entries: PdfEntry[];
    };

// Sections past the standard six (languages, awards...), printed after them in the person's order.
export type PdfExtraSection = {
  id: string;
  kind: ExtraKind;
  title: string;
  // Items that are only a name (and maybe a level) read best as one line: "Spanish (Fluent),
  // French (Basic)". Null when the items need lines of their own (entries).
  list: string | null;
  entries: PdfEntry[];
};

export type PdfModel = {
  name: string;
  headline: string;
  // Two lines, like resumeToText(): email, phone and location, then web links.
  contact: PdfLink[][];
  sections: PdfSection[];
  // Always set by buildPdfModel. Optional so models put together by hand (the dashboard's
  // stand-in miniatures) still type-check without them.
  extras?: PdfExtraSection[];
  meta: { title: string; author: string; subject: string };
  // Characters the font can't draw that were swapped or left out, for a notice in the UI.
  changedCharacters: string[];
};

export type PdfModelOptions = {
  // "pdf" (default) keeps what the built-in PDF fonts can draw; "unicode" keeps every character,
  // for a Word file.
  charset?: "pdf" | "unicode";
};

// Markers people type or paste at the start of a line. The PDF draws its own bullet, so keeping
// them would print two. Includes the private-use glyphs Word bullets turn into.
const LEADING_MARKER = /^\s*(?:[•●○◦▪▫■□◆◇❖►▸▹▶➢➤➣➔→✓✔☑⦿⁃∙·‣*\p{Co}]+|[-–—](?=\s))\s*/u;

type Clean = { line: LineCleaner; paragraphs: (value: string) => string[] };

function cleaner(charset: PdfModelOptions["charset"], lost: Set<string>): Clean {
  if (charset === "unicode") return { line: toUnicodeLine, paragraphs: toUnicodeParagraphs };
  return {
    line: (value) => toPdfLine(value, lost),
    paragraphs: (value) => toPdfParagraphs(value, lost),
  };
}

function dateRange(start: string, end: string, c: Clean): string {
  return [c.line(start), c.line(end)].filter(Boolean).join(" – ");
}

function bullets(items: readonly { id: string; text: string }[], c: Clean): PdfBullet[] {
  return items
    .map((bullet) => ({ id: bullet.id, text: c.line(bullet.text.replace(LEADING_MARKER, "")) }))
    .filter((bullet) => bullet.text !== "");
}

function isEmpty(entry: PdfEntry): boolean {
  return (
    !entry.title &&
    !entry.org &&
    !entry.detail &&
    !entry.dates &&
    !entry.note &&
    entry.bullets.length === 0
  );
}

// The first non-empty field leads in bold and the second follows it, so a job with only a company
// still gets a bold heading.
function lead(primary: string, secondary: string): { title: string; org: string } {
  return primary ? { title: primary, org: secondary } : { title: secondary, org: "" };
}

type Role = {
  id: string;
  title: string;
  company: string;
  location: PdfLink | null;
  dates: string;
  bullets: PdfBullet[];
};

function single(role: Role): PdfEntry {
  return {
    id: role.id,
    ...lead(role.title, role.company),
    detail: role.location,
    dates: role.dates,
    bullets: role.bullets,
  };
}

// Promotions read as one story at one company: its name once, then each role with its own dates.
function grouped(run: readonly Role[]): PdfEntry[] {
  const places = run.map((role) => role.location).filter((place) => place !== null);
  const shared =
    places.length > 0 &&
    places.length === run.length &&
    places.every((place) => companyKey(place.text) === companyKey(places[0]!.text))
      ? places[0]!
      : null;
  return run.map((role, index) => ({
    id: role.id,
    title: role.title,
    org: "",
    detail: shared ? null : role.location,
    dates: role.dates,
    bullets: role.bullets,
    company: { name: run[0]!.company, detail: shared, first: index === 0 },
  }));
}

function experience(resume: Resume, c: Clean): PdfEntry[] {
  const roles: Role[] = resume.experience
    .map((job) => ({
      id: job.id,
      title: c.line(job.title),
      company: c.line(job.company),
      location: plainText(job.location, c.line),
      dates: dateRange(job.startDate, job.endDate, c),
      bullets: bullets(job.bullets, c),
    }))
    .filter((role) => !isEmpty(single(role)));
  const entries: PdfEntry[] = [];
  for (let start = 0; start < roles.length;) {
    const key = companyKey(roles[start]!.company);
    let end = start + 1;
    while (key && end < roles.length && companyKey(roles[end]!.company) === key) end++;
    const run = roles.slice(start, end);
    if (run.length > 1) entries.push(...grouped(run));
    else entries.push(single(run[0]!));
    start = end;
  }
  return entries;
}

function education(resume: Resume, c: Clean): PdfEntry[] {
  return resume.education.map((school) => {
    const degree = [c.line(school.degree), c.line(school.field)].filter(Boolean).join(", ");
    return {
      id: school.id,
      ...lead(degree, c.line(school.school)),
      detail: plainText(school.location, c.line),
      dates: dateRange(school.startDate, school.endDate, c),
      bullets: bullets(school.bullets, c),
    };
  });
}

function projects(resume: Resume, c: Clean): PdfEntry[] {
  return resume.projects.map((project) => ({
    id: project.id,
    title: c.line(project.name),
    org: "",
    detail: webLink(project.link, c.line),
    dates: "",
    bullets: bullets(project.bullets, c),
  }));
}

function certifications(resume: Resume, c: Clean): PdfEntry[] {
  return resume.certifications.map((cert) => ({
    id: cert.id,
    ...lead(c.line(cert.name), c.line(cert.issuer)),
    detail: null,
    dates: c.line(cert.date),
    bullets: [],
  }));
}

function skills(resume: Resume, c: Clean): PdfSkillLine[] {
  return resume.skills
    .map((group) => ({
      id: group.id,
      // The PDF adds its own colon after the label.
      label: c.line(group.label).replace(/\s*:$/, ""),
      items: group.items
        .map((item) => c.line(item))
        .filter(Boolean)
        .join(", "),
    }))
    .filter((group) => group.items !== "");
}

function section(resume: Resume, key: SectionKey, c: Clean): PdfSection | null {
  // The person's own heading ("Work history"), unless nothing of it survives cleaning.
  const title = c.line(sectionTitleOf(resume, key)) || SECTION_LABELS[key];
  switch (key) {
    case "summary": {
      const paragraphs = c.paragraphs(resume.summary);
      return paragraphs.length ? { key, title, paragraphs } : null;
    }
    case "skills": {
      const lines = skills(resume, c);
      return lines.length ? { key, title, lines } : null;
    }
    case "experience":
    case "projects":
    case "education":
    case "certifications": {
      const build = { experience, projects, education, certifications }[key];
      const entries = build(resume, c).filter((entry) => !isEmpty(entry));
      return entries.length ? { key, title, entries } : null;
    }
  }
}

// "Custom section" names the menu choice, not a heading anyone would print.
function extraFallbackTitle(kind: ExtraKind): string {
  return kind === "custom" ? "Additional information" : EXTRA_KIND_LABELS[kind];
}

function extra(item: ExtraSection, c: Clean): PdfExtraSection | null {
  const entries = item.items
    .map((entry) => ({
      id: entry.id,
      ...lead(c.line(entry.title), c.line(entry.subtitle)),
      detail: null,
      dates: c.line(entry.date),
      bullets: bullets(entry.bullets, c),
      note: c.line(entry.detail),
    }))
    .filter((entry) => !isEmpty(entry));
  if (entries.length === 0) return null;
  const title = c.line(item.title) || extraFallbackTitle(item.kind);
  const simple = entries.every((entry) => !entry.dates && !entry.note && !entry.bullets.length);
  const list = simple
    ? entries.map((entry) => (entry.org ? `${entry.title} (${entry.org})` : entry.title)).join(", ")
    : null;
  return { id: item.id, kind: item.kind, title, list, entries: simple ? [] : entries };
}

const present = (item: PdfLink | null): item is PdfLink => item !== null;

function contact(resume: Resume, c: Clean): PdfLink[][] {
  const { basics } = resume;
  const details = [
    emailLink(basics.email, c.line),
    plainText(basics.phone, c.line),
    plainText(basics.location, c.line),
  ].filter(present);
  const links = basics.links.map((link) => webLink(link.url, c.line)).filter(present);
  return [details, links].filter((line) => line.length > 0);
}

export function buildPdfModel(source: Resume, options: PdfModelOptions = {}): PdfModel {
  const lost = new Set<string>();
  const c = cleaner(options.charset, lost);
  const resume = visibleResume(source);
  const name = c.line(resume.basics.name);
  const headline = c.line(resume.basics.headline);
  // Follows the user's section order, like resumeToText(), so the PDF and the plain text match.
  // Unknown or repeated keys are skipped rather than trusted.
  const order = [...new Set(resume.sectionOrder)].filter((key) => SECTION_KEYS.includes(key));
  const sections = order
    .map((key) => section(resume, key, c))
    .filter((item): item is PdfSection => item !== null);
  const extras = extrasOf(resume)
    .map((item) => extra(item, c))
    .filter((item): item is PdfExtraSection => item !== null);
  // PDF viewers show the title in place of the file name, so it reads like one.
  const title = name ? `${name} - Resume` : c.line(resume.title) || "Resume";
  return {
    name,
    headline,
    contact: contact(resume, c),
    sections,
    extras,
    meta: { title, author: name, subject: headline },
    changedCharacters: [...lost],
  };
}
