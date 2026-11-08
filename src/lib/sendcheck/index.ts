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
import type { SendCheckContext, SendCheckItem, SendCheckRule, SendCheckTarget } from "./types";

export type { SendCheckContext, SendCheckItem, SendCheckRule, SendCheckTarget } from "./types";

// The send check: everything a recruiter would catch on a read-through that no spell checker does.
// Pure and client-safe; it reads only what will be sent (hidden lines are skipped).

// Two jobs that share a month or two are a notice period or a handover, not a mistake.
const OVERLAP_MONTHS = 3;
const MAX_ITEMS = 40;

// Most embarrassing first: a blank left in, then another company's name, then dates.
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

function item(draft: Draft): SendCheckItem {
  return { ...draft, id: `${draft.rule}|${targetKey(draft.target)}|${draft.quote ?? ""}` };
}

// One readable piece of text and where it sits.
type Piece = { text: string; place: string; target: SendCheckTarget };

const jobPlace = (title: string, company: string, fallback: string) =>
  [title, company].filter(Boolean).join(" at ") || fallback;

function linePieces(bullets: readonly Bullet[], place: string): Piece[] {
  return bullets
    .filter((bullet) => bullet.text.trim() !== "")
    .map((bullet) => ({ text: bullet.text, place, target: { kind: "line", bulletId: bullet.id } }));
}

// Everything printed, in reading order.
function pieces(resume: Resume): Piece[] {
  const out: Piece[] = [];
  const { basics } = resume;
  const contact = (field: "name" | "headline" | "email" | "phone" | "location", label: string) =>
    out.push({ text: basics[field], place: label, target: { kind: "basics", field } });
  contact("name", "Your name");
  contact("headline", "Headline");
  contact("email", "Email");
  contact("phone", "Phone");
  contact("location", "Location");
  for (const link of basics.links) {
    out.push({ text: link.url, place: "Links", target: { kind: "basics", field: "links" } });
  }
  out.push({ text: resume.summary, place: "Summary", target: { kind: "summary" } });
  for (const job of resume.experience) {
    const place = jobPlace(job.title, job.company, "A job");
    const target: SendCheckTarget = { kind: "entry", entryId: job.id };
    for (const text of [job.title, job.company, job.location, job.startDate, job.endDate]) {
      out.push({ text, place, target });
    }
    out.push(...linePieces(job.bullets, place));
  }
  for (const project of resume.projects) {
    const place = project.name || "A project";
    const target: SendCheckTarget = { kind: "entry", entryId: project.id };
    out.push({ text: project.name, place, target }, { text: project.link, place, target });
    out.push(...linePieces(project.bullets, place));
  }
  for (const school of resume.education) {
    const place = [school.degree, school.school].filter(Boolean).join(", ") || "A school";
    const target: SendCheckTarget = { kind: "entry", entryId: school.id };
    for (const text of [school.school, school.degree, school.field, school.location]) {
      out.push({ text, place, target });
    }
    out.push(...linePieces(school.bullets, place));
  }
  for (const group of resume.skills) {
    const target: SendCheckTarget = { kind: "section", section: "skills" };
    out.push({ text: [group.label, ...group.items].join(", "), place: "Skills", target });
  }
  for (const cert of resume.certifications) {
    const target: SendCheckTarget = { kind: "entry", entryId: cert.id };
    out.push({
      text: `${cert.name} ${cert.issuer}`,
      place: cert.name || "A certification",
      target,
    });
  }
  for (const section of extrasOf(resume)) {
    const place = section.title || "Extra section";
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

function letterPiece(resume: Resume): Piece | null {
  const letter = resume.tailor?.coverLetter?.trim() ?? "";
  return letter ? { text: letter, place: "Cover letter", target: { kind: "letter" } } : null;
}

function placeholderItems(all: readonly Piece[]): Draft[] {
  return all.flatMap((piece) =>
    findPlaceholders(piece.text).map((blank) => ({
      rule: "placeholder" as const,
      title: "Blank left in",
      message: `“${blank}” looks like a blank to fill in. Put in the real detail, or take it out.`,
      quote: blank,
      place: piece.place,
      target: piece.target,
    })),
  );
}

function companyItems(resume: Resume, context: SendCheckContext): Draft[] {
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
  const summary: Piece = { text: resume.summary, place: "Summary", target: { kind: "summary" } };
  const letter = letterPiece(resume);
  return [summary, ...(letter ? [letter] : [])].flatMap((piece) =>
    otherCompanies(piece.text, { company, own, others }).map((name) => ({
      rule: "company" as const,
      title: "Another company's name",
      message: `Mentions ${name}, but this copy is for ${company}.`,
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

function dateItems(resume: Resume, nowMonth: number): Draft[] {
  const drafts: Draft[] = [];
  const jobs: (Dated & { company: string })[] = resume.experience.map((job) => {
    const { start, end } = parseRange(job.startDate, job.endDate, nowMonth);
    return {
      id: job.id,
      place: jobPlace(job.title, job.company, "A job"),
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
      place: [school.degree, school.school].filter(Boolean).join(", ") || "A school",
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
        title: "Dates run backwards",
        message: `${entry.text} ends before it starts. One of the dates may be a typo.`,
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
        title: "Date in the future",
        message: `${spanLabel(future)} hasn't happened yet. If the job is still going, use "Present".`,
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
      const months = sureOverlap(
        { start: job.start, end: job.end },
        { start: earlier.start, end: earlier.end },
      );
      if (months < OVERLAP_MONTHS) continue;
      drafts.push({
        rule: "dates",
        title: "Dates overlap",
        message: `Overlaps ${earlier.place} by ${formatMonths(months)}. Fine for a side job; otherwise check the dates.`,
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
      title: "Date in the future",
      message: `${cert.date.trim()} hasn't happened yet. If you're still working toward it, say "Expected".`,
      quote: cert.date.trim(),
      place: cert.name || "A certification",
      target: { kind: "entry", entryId: cert.id },
    });
  }
  return drafts;
}

function toolItems(resume: Resume, nowMonth: number): Draft[] {
  const drafts: Draft[] = [];
  const check = (
    entry: { id: string; title: string; startDate: string; endDate: string; bullets: Bullet[] },
    place: string,
    noun: string,
  ) => {
    const { start, end } = parseRange(entry.startDate, entry.endDate, nowMonth);
    // Without an end date, a single date is the whole stint ("2019").
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
          ? monthLabel(mention.releasedAt)
          : String(mention.tool.year);
        drafts.push({
          rule: "tool-dates",
          title: "Named before it existed",
          message: `${mention.tool.name} came out in ${released}, after this ${noun} ended (${dateText(entry.startDate, entry.endDate)}).`,
          quote: mention.text,
          place,
          target,
        });
      }
    }
  };
  for (const job of resume.experience) check(job, jobPlace(job.title, job.company, "A job"), "job");
  for (const school of resume.education) {
    const place = [school.degree, school.school].filter(Boolean).join(", ") || "A school";
    check({ ...school, title: school.degree }, place, "course");
  }
  return drafts;
}

function copiedItems(resume: Resume, jobText: string): Draft[] {
  const phrases = jobPhrases(jobText);
  if (phrases.size === 0) return [];
  const all: Piece[] = [
    { text: resume.summary, place: "Summary", target: { kind: "summary" } },
    ...pieces(resume).filter((piece) => piece.target.kind === "line"),
  ];
  return all.flatMap((piece) =>
    copiedRuns(piece.text, phrases).map((run) => ({
      rule: "copied" as const,
      title: "Copied from the job post",
      message: `${run.split(/\s+/).length} words in a row match the job post. Say it in your own words.`,
      quote: run,
      place: piece.place,
      target: piece.target,
    })),
  );
}

/** Everything worth a second look before sending, most embarrassing first. */
export function runSendCheck(source: Resume, context: SendCheckContext): SendCheckItem[] {
  const resume = visibleResume(source);
  const nowMonth = monthOf(context.now);
  const letter = letterPiece(resume);
  const tailored = resume.tailor !== null;
  const drafts = [
    ...placeholderItems([...pieces(resume), ...(letter ? [letter] : [])]),
    ...(tailored ? companyItems(resume, context) : []),
    ...dateItems(resume, nowMonth),
    ...toolItems(resume, nowMonth),
    ...(tailored && context.jobText ? copiedItems(resume, context.jobText) : []),
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
