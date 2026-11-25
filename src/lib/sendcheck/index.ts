import { fmt } from "@/i18n/format";
import { formatFor, type Format } from "@/i18n/intl";
import studioDownloadEn from "@/i18n/messages/en/studio-download";
import { companyKey, visibleResume } from "@/lib/pdf/visible";
import { extrasOf, type Bullet, type Resume } from "@/lib/resume/schema";
import { otherCompanies } from "./companies";
import { copiedRuns, jobPhrases } from "./copied";
import {
  formatMonths,
  monthLabel,
  monthOf,
  parseDate,
  parseRange,
  spanLabel,
  sureOverlap,
  type MonthSpan,
} from "./dates";
import { findPlaceholders } from "./placeholders";
import { findTools } from "./tools";
import type {
  SendCheckContext,
  SendCheckItem,
  SendCheckRule,
  SendCheckTarget,
  SendCheckWords,
} from "./types";

export type {
  SendCheckContext,
  SendCheckItem,
  SendCheckRule,
  SendCheckTarget,
  SendCheckWords,
} from "./types";

const OVERLAP_MONTHS = 3;
const MAX_ITEMS = 40;

const RULE_ORDER: readonly SendCheckRule[] = [
  "placeholder",
  "company",
  "dates",
  "tool-dates",
  "copied",
];

function targetKey(target: SendCheckTarget): string {
  switch (target.kind) {
    case "line":
      return `line:${target.bulletId}`;
    case "entry":
      return `entry:${target.entryId}`;
    case "section":
      return `section:${target.section}`;
    case "extra":
      return `extra:${target.sectionId}`;
    case "basics":
      return `basics:${target.field}`;
    default:
      return target.kind;
  }
}

type Draft = Omit<SendCheckItem, "id">;

type Words = { t: SendCheckWords; format: Format };

const ENGLISH: Words = { t: studioDownloadEn.sendItems, format: formatFor("en") };

function months(count: number, { t, format }: Words): string {
  if (format.locale === "en") return formatMonths(count);
  const years = Math.floor(count / 12);
  const left = count % 12;
  if (years === 0) return format.plural(t.months, left);
  if (left === 0) return format.plural(t.years, years);
  return fmt(t.yearsAndMonths, {
    years: format.plural(t.years, years),
    months: format.plural(t.months, left),
  });
}

// A month index as "Mar 2024", written the reader's way.
function month(index: number, { format }: Words): string {
  if (format.locale === "en") return monthLabel(index);
  const date = Date.UTC(Math.floor(index / 12), index % 12, 1);
  return format.date(date, { month: "short", year: "numeric", timeZone: "UTC" });
}

function span(date: MonthSpan, words: Words): string {
  const whole = spanLabel(date);
  return /^\d+$/.test(whole) ? whole : month(date.earliest, words);
}

function item(draft: Draft): SendCheckItem {
  return { ...draft, id: `${draft.rule}|${targetKey(draft.target)}|${draft.quote ?? ""}` };
}

type Piece = { text: string; place: string; target: SendCheckTarget };

function jobPlace(title: string, company: string, { t }: Words): string {
  if (title && company) return fmt(t.places.at, { title, company });
  return title || company || t.places.aJob;
}

const schoolPlace = (degree: string, school: string, { t }: Words) =>
  [degree, school].filter(Boolean).join(", ") || t.places.aSchool;

function linePieces(bullets: readonly Bullet[], place: string): Piece[] {
  return bullets
    .filter((bullet) => bullet.text.trim() !== "")
    .map((bullet) => ({ text: bullet.text, place, target: { kind: "line", bulletId: bullet.id } }));
}

function pieces(resume: Resume, words: Words): Piece[] {
  const out: Piece[] = [];
  const { basics } = resume;
  const places = words.t.places;
  const contact = (field: "name" | "headline" | "email" | "phone" | "location", label: string) =>
    out.push({ text: basics[field], place: label, target: { kind: "basics", field } });
  contact("name", places.name);
  contact("headline", places.headline);
  contact("email", places.email);
  contact("phone", places.phone);
  contact("location", places.location);
  for (const link of basics.links) {
    out.push({ text: link.url, place: places.links, target: { kind: "basics", field: "links" } });
  }
  out.push({ text: resume.summary, place: places.summary, target: { kind: "summary" } });
  for (const job of resume.experience) {
    const place = jobPlace(job.title, job.company, words);
    const target: SendCheckTarget = { kind: "entry", entryId: job.id };
    for (const text of [job.title, job.company, job.location, job.startDate, job.endDate]) {
      out.push({ text, place, target });
    }
    out.push(...linePieces(job.bullets, place));
  }
  for (const project of resume.projects) {
    const place = project.name || places.aProject;
    const target: SendCheckTarget = { kind: "entry", entryId: project.id };
    out.push({ text: project.name, place, target }, { text: project.link, place, target });
    out.push(...linePieces(project.bullets, place));
  }
  for (const school of resume.education) {
    const place = schoolPlace(school.degree, school.school, words);
    const target: SendCheckTarget = { kind: "entry", entryId: school.id };
    for (const text of [school.school, school.degree, school.field, school.location]) {
      out.push({ text, place, target });
    }
    out.push(...linePieces(school.bullets, place));
  }
  for (const group of resume.skills) {
    const target: SendCheckTarget = { kind: "section", section: "skills" };
    out.push({ text: [group.label, ...group.items].join(", "), place: places.skills, target });
  }
  for (const cert of resume.certifications) {
    const target: SendCheckTarget = { kind: "entry", entryId: cert.id };
    out.push({
      text: `${cert.name} ${cert.issuer}`,
      place: cert.name || places.aCertification,
      target,
    });
  }
  for (const section of extrasOf(resume)) {
    const place = section.title || places.extra;
    out.push({ text: section.title, place, target: { kind: "extra", sectionId: section.id } });
    for (const entry of section.items) {
      const target: SendCheckTarget = { kind: "entry", entryId: entry.id };
      const itemPlace = entry.title || place;
      for (const text of [entry.title, entry.subtitle, entry.date, entry.detail]) {
        out.push({ text, place: itemPlace, target });
      }
      out.push(...linePieces(entry.bullets, itemPlace));
    }
  }
  return out.filter((piece) => piece.text.trim() !== "");
}

function letterPiece(resume: Resume, { t }: Words): Piece | null {
  const letter = resume.tailor?.coverLetter?.trim() ?? "";
  return letter ? { text: letter, place: t.places.letter, target: { kind: "letter" } } : null;
}

function placeholderItems(all: readonly Piece[], { t }: Words): Draft[] {
  return all.flatMap((piece) =>
    findPlaceholders(piece.text).map((blank) => ({
      rule: "placeholder" as const,
      title: t.blank.title,
      message: fmt(t.blank.message, { blank }),
      quote: blank,
      place: piece.place,
      target: piece.target,
    })),
  );
}

function companyItems(resume: Resume, context: SendCheckContext, words: Words): Draft[] {
  const { t } = words;
  const company = resume.tailor?.company.trim() ?? "";
  if (!company) return [];
  const own = [
    ...resume.experience.map((job) => job.company),
    ...resume.education.map((school) => school.school),
    ...resume.certifications.map((cert) => cert.issuer),
  ].filter((name) => name.trim() !== "");
  const others = (context.otherCompanies ?? []).filter(
    (name) => companyKey(name) !== companyKey(company),
  );
  const summary: Piece = {
    text: resume.summary,
    place: t.places.summary,
    target: { kind: "summary" },
  };
  const letter = letterPiece(resume, words);
  return [summary, ...(letter ? [letter] : [])].flatMap((piece) =>
    otherCompanies(piece.text, { company, own, others }).map((name) => ({
      rule: "company" as const,
      title: t.company.title,
      message: fmt(t.company.message, { name, company }),
      quote: name,
      place: piece.place,
      target: piece.target,
    })),
  );
}

type Dated = {
  id: string;
  place: string;
  start: MonthSpan | null;
  end: MonthSpan | null;
  text: string;
};

function dateText(start: string, end: string): string {
  return [start.trim(), end.trim()].filter(Boolean).join(" – ");
}

function dateItems(resume: Resume, nowMonth: number, words: Words): Draft[] {
  const { t } = words;
  const drafts: Draft[] = [];
  const jobs: (Dated & { company: string })[] = resume.experience.map((job) => {
    const { start, end } = parseRange(job.startDate, job.endDate, nowMonth);
    return {
      id: job.id,
      place: jobPlace(job.title, job.company, words),
      company: companyKey(job.company),
      start,
      end,
      text: dateText(job.startDate, job.endDate),
    };
  });
  const schools: Dated[] = resume.education.map((school) => {
    const { start, end } = parseRange(school.startDate, school.endDate, nowMonth);
    return {
      id: school.id,
      place: schoolPlace(school.degree, school.school, words),
      start,
      end,
      text: dateText(school.startDate, school.endDate),
    };
  });
  for (const entry of [...jobs, ...schools]) {
    const target: SendCheckTarget = { kind: "entry", entryId: entry.id };
    if (entry.start && entry.end && entry.start.earliest > entry.end.latest) {
      drafts.push({
        rule: "dates",
        title: t.backwards.title,
        message: fmt(t.backwards.message, { dates: entry.text }),
        quote: entry.text,
        place: entry.place,
        target,
      });
    }
  }
  for (const job of jobs) {
    const target: SendCheckTarget = { kind: "entry", entryId: job.id };
    const future = [job.start, job.end].find(
      (date) => date !== null && !date.expected && date.earliest > nowMonth,
    );
    if (future) {
      drafts.push({
        rule: "dates",
        title: t.future.title,
        message: fmt(t.future.job, { date: span(future, words) }),
        quote: job.text,
        place: job.place,
        target,
      });
    }
  }
  for (const [index, job] of jobs.entries()) {
    if (!job.start || !job.end) continue;
    for (const earlier of jobs.slice(0, index)) {
      if (!earlier.start || !earlier.end || (job.company && job.company === earlier.company))
        continue;
      const overlap = sureOverlap(
        { start: job.start, end: job.end },
        { start: earlier.start, end: earlier.end },
      );
      if (overlap < OVERLAP_MONTHS) continue;
      drafts.push({
        rule: "dates",
        title: t.overlap.title,
        message: fmt(t.overlap.message, { place: earlier.place, span: months(overlap, words) }),
        quote: `${job.text} / ${earlier.text}`,
        place: job.place,
        target: { kind: "entry", entryId: job.id },
      });
    }
  }
  for (const cert of resume.certifications) {
    const date = parseDate(cert.date);
    if (date === null || date === "present" || date.expected || date.earliest <= nowMonth) continue;
    drafts.push({
      rule: "dates",
      title: t.future.title,
      message: fmt(t.future.certification, { date: cert.date.trim() }),
      quote: cert.date.trim(),
      place: cert.name || t.places.aCertification,
      target: { kind: "entry", entryId: cert.id },
    });
  }
  return drafts;
}

function toolItems(resume: Resume, nowMonth: number, words: Words): Draft[] {
  const { t } = words;
  const drafts: Draft[] = [];
  const check = (
    entry: { id: string; title: string; startDate: string; endDate: string; bullets: Bullet[] },
    place: string,
    noun: "job" | "course",
  ) => {
    const { start, end } = parseRange(entry.startDate, entry.endDate, nowMonth);
    const last = end ?? start;
    if (!last) return;
    const texts: { text: string; target: SendCheckTarget; heading: boolean }[] = [
      { text: entry.title, target: { kind: "entry", entryId: entry.id }, heading: true },
      ...entry.bullets.map((bullet) => ({
        text: bullet.text,
        target: { kind: "line", bulletId: bullet.id } as const,
        heading: false,
      })),
    ];
    for (const { text, target, heading } of texts) {
      for (const mention of findTools(text, { heading })) {
        if (mention.releasedAt <= last.latest) continue;
        const released = mention.tool.month
          ? month(mention.releasedAt, words)
          : String(mention.tool.year);
        drafts.push({
          rule: "tool-dates",
          title: t.tool.title,
          message: fmt(t.tool[noun], {
            tool: mention.tool.name,
            released,
            dates: dateText(entry.startDate, entry.endDate),
          }),
          quote: mention.text,
          place,
          target,
        });
      }
    }
  };
  for (const job of resume.experience) check(job, jobPlace(job.title, job.company, words), "job");
  for (const school of resume.education) {
    const place = schoolPlace(school.degree, school.school, words);
    check({ ...school, title: school.degree }, place, "course");
  }
  return drafts;
}

function copiedItems(resume: Resume, jobText: string, words: Words): Draft[] {
  const { t, format } = words;
  const phrases = jobPhrases(jobText);
  if (phrases.size === 0) return [];
  const all: Piece[] = [
    { text: resume.summary, place: t.places.summary, target: { kind: "summary" } },
    ...pieces(resume, words).filter((piece) => piece.target.kind === "line"),
  ];
  const count = (run: string) => {
    const length = run.split(/\s+/).length;
    return format.locale === "en" ? length : format.number(length);
  };
  return all.flatMap((piece) =>
    copiedRuns(piece.text, phrases).map((run) => ({
      rule: "copied" as const,
      title: t.copied.title,
      message: fmt(t.copied.message, { count: count(run) }),
      quote: run,
      place: piece.place,
      target: piece.target,
    })),
  );
}

export function runSendCheck(source: Resume, context: SendCheckContext): SendCheckItem[] {
  const resume = visibleResume(source);
  const nowMonth = monthOf(context.now);
  const words: Words = context.words
    ? { t: context.words, format: context.format ?? ENGLISH.format }
    : ENGLISH;
  const letter = letterPiece(resume, words);
  const tailored = resume.tailor !== null;
  const drafts = [
    ...placeholderItems([...pieces(resume, words), ...(letter ? [letter] : [])], words),
    ...(tailored ? companyItems(resume, context, words) : []),
    ...dateItems(resume, nowMonth, words),
    ...toolItems(resume, nowMonth, words),
    ...(tailored && context.jobText ? copiedItems(resume, context.jobText, words) : []),
  ];
  const seen = new Set<string>();
  const items: SendCheckItem[] = [];
  for (const draft of drafts.sort(
    (a, b) => RULE_ORDER.indexOf(a.rule) - RULE_ORDER.indexOf(b.rule),
  )) {
    const next = item(draft);
    if (seen.has(next.id)) continue;
    seen.add(next.id);
    items.push(next);
  }
  return items.slice(0, MAX_ITEMS);
}
