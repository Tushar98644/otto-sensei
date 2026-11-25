import type { ContentLang } from "@/lib/i18n/languages";
import {
  documentTitles,
  extraHeading,
  extraHeadingIn,
  sectionHeading,
  sectionHeadingIn,
} from "@/lib/resume/labels";
import { resumeLang } from "@/lib/resume/lang";
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

export type PdfBullet = { id: string; text: string };

export type PdfCompany = {
  name: string;
  detail: PdfLink | null;
  first: boolean;
  dates?: string;
};

export type PdfEntry = {
  id: string;
  title: string;
  org: string;
  detail: PdfLink | null;
  dates: string;
  tech?: string;
  bullets: PdfBullet[];
  company?: PdfCompany;
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

export type PdfExtraSection = {
  id: string;
  kind: ExtraKind;
  title: string;
  list: string | null;
  entries: PdfEntry[];
};

export type PdfContact = {
  email: PdfLink | null;
  phone: PdfLink | null;
  location: PdfLink | null;
  links: PdfLink[];
};

export type PdfModel = {
  name: string;
  headline: string;
  contact: PdfLink[][];
  basics?: PdfContact;
  sections: PdfSection[];
  extras?: PdfExtraSection[];
  meta: { title: string; author: string; subject: string };
  changedCharacters: string[];
  // The resume's language, which its headings and the document's language tag follow.
  lang?: ContentLang;
};

export type PdfModelOptions = {
  charset?: "pdf" | "unicode";
};

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
    !entry.tech &&
    entry.bullets.length === 0
  );
}

function lead(primary: string, secondary: string): { title: string; org: string } {
  return primary ? { title: primary, org: secondary } : { title: secondary, org: "" };
}

type Role = {
  id: string;
  title: string;
  company: string;
  location: PdfLink | null;
  start: string;
  end: string;
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

const firstYear = (value: string) => Number(/\b(?:19|20)\d{2}\b/.exec(value)?.[0] ?? NaN);

function runSpan(run: readonly Role[]): string {
  const first = run[0]!;
  const last = run[run.length - 1]!;
  const oldestFirst = firstYear(first.start) < firstYear(last.start);
  const [earliest, latest] = oldestFirst ? [first, last] : [last, first];
  return [earliest.start, latest.end].filter(Boolean).join(" – ");
}

function grouped(run: readonly Role[]): PdfEntry[] {
  const places = run.map((role) => role.location).filter((place) => place !== null);
  const shared =
    places.length > 0 &&
    places.length === run.length &&
    places.every((place) => companyKey(place.text) === companyKey(places[0]!.text))
      ? places[0]!
      : null;
  const dates = runSpan(run);
  return run.map((role, index) => ({
    id: role.id,
    title: role.title,
    org: "",
    detail: shared ? null : role.location,
    dates: role.dates,
    bullets: role.bullets,
    company: { name: run[0]!.company, detail: shared, first: index === 0, dates },
  }));
}

function experience(resume: Resume, c: Clean): PdfEntry[] {
  const roles: Role[] = resume.experience
    .map((job) => ({
      id: job.id,
      title: c.line(job.title),
      company: c.line(job.company),
      location: plainText(job.location, c.line),
      start: c.line(job.startDate),
      end: c.line(job.endDate),
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
  return resume.projects.map((project) => {
    const entry: PdfEntry = {
      id: project.id,
      title: c.line(project.name),
      org: "",
      detail: webLink(project.link, c.line),
      dates: dateRange(project.startDate ?? "", project.endDate ?? "", c),
      bullets: bullets(project.bullets, c),
    };
    const tech = c.line(project.tech ?? "");
    if (tech) entry.tech = tech;
    return entry;
  });
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
      label: c.line(group.label).replace(/\s*:$/, ""),
      items: group.items
        .map((item) => c.line(item))
        .filter(Boolean)
        .join(", "),
    }))
    .filter((group) => group.items !== "");
}

function section(resume: Resume, key: SectionKey, c: Clean, lang: ContentLang): PdfSection | null {
  const title =
    lang === "en"
      ? c.line(sectionTitleOf(resume, key)) || SECTION_LABELS[key]
      : c.line(sectionHeading(resume, key, lang)) || sectionHeadingIn(key, lang);
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

function extraFallbackTitle(kind: ExtraKind): string {
  return kind === "custom" ? "Additional information" : EXTRA_KIND_LABELS[kind];
}

function extra(item: ExtraSection, c: Clean, lang: ContentLang): PdfExtraSection | null {
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
  const title =
    lang === "en"
      ? c.line(item.title) || extraFallbackTitle(item.kind)
      : c.line(extraHeading(item, lang)) || extraHeadingIn(item.kind, lang);
  const simple = entries.every((entry) => !entry.dates && !entry.note && !entry.bullets.length);
  const list = simple
    ? entries.map((entry) => (entry.org ? `${entry.title} (${entry.org})` : entry.title)).join(", ")
    : null;
  return { id: item.id, kind: item.kind, title, list, entries: simple ? [] : entries };
}

const present = (item: PdfLink | null): item is PdfLink => item !== null;

function contactOf(resume: Resume, c: Clean): PdfContact {
  const { basics } = resume;
  return {
    email: emailLink(basics.email, c.line),
    phone: plainText(basics.phone, c.line),
    location: plainText(basics.location, c.line),
    links: basics.links.map((link) => webLink(link.url, c.line)).filter(present),
  };
}

function contactLines({ email, phone, location, links }: PdfContact): PdfLink[][] {
  return [[email, phone, location].filter(present), links].filter((line) => line.length > 0);
}

export function buildPdfModel(source: Resume, options: PdfModelOptions = {}): PdfModel {
  const lost = new Set<string>();
  const c = cleaner(options.charset, lost);
  const resume = visibleResume(source);
  const lang = resumeLang(source);
  const name = c.line(resume.basics.name);
  const headline = c.line(resume.basics.headline);
  const order = [...new Set(resume.sectionOrder)].filter((key) => SECTION_KEYS.includes(key));
  const sections = order
    .map((key) => section(resume, key, c, lang))
    .filter((item): item is PdfSection => item !== null);
  const extras = extrasOf(resume)
    .map((item) => extra(item, c, lang))
    .filter((item): item is PdfExtraSection => item !== null);
  const word = documentTitles(lang).resume;
  const title = name ? `${name} - ${word}` : c.line(resume.title) || word;
  const basics = contactOf(resume, c);
  return {
    name,
    headline,
    contact: contactLines(basics),
    basics,
    sections,
    extras,
    meta: { title, author: name, subject: headline },
    changedCharacters: [...lost],
    lang,
  };
}
