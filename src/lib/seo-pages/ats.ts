import type { Locale } from "@/i18n/config";
import { formatFor } from "@/i18n/intl";
import { fmt } from "@/i18n/format";
import ENGLISH from "@/i18n/messages/en/ats";
import type { PluralForms, Translation } from "@/i18n/types";
import { HIRING_SYSTEMS, type SystemNotes } from "@/lib/ats/systems";
import type { HiringNote, HiringSystem, HiringSystemId, NoteTopic } from "@/lib/ats/types";
import { joinList } from "@/lib/lint/i18n";
import { SEO_LIMITS } from "@/lib/seo/limits";
import { withWords, type Words } from "./words";

export type GuideIntro = {
  what: string;
  spot: string;
};

// Plain descriptions only: every claim about how a system behaves lives in a sourced note.
const INTROS: Record<HiringSystemId, GuideIntro> = {
  greenhouse: {
    what: "Greenhouse is hiring software (an applicant tracking system, or ATS) that employers use to post jobs, collect applications and review applicants.",
    spot: "The form is often on boards.greenhouse.io or job-boards.greenhouse.io, or the link carries gh_jid= and a number.",
  },
  lever: {
    what: "Lever is hiring software (an applicant tracking system, or ATS) that employers use to post jobs and review applicants.",
    spot: "The job is often on jobs.lever.co.",
  },
  ashby: {
    what: "Ashby is hiring software (an applicant tracking system, or ATS) that employers use to post jobs and review applicants.",
    spot: "The job is often on jobs.ashbyhq.com, or the link carries ashby_jid=.",
  },
  workday: {
    what: "Workday is HR software. Employers that use its recruiting tools take job applications through Workday.",
    spot: "The form is often on an address ending in myworkdayjobs.com or myworkdaysite.com.",
  },
  icims: {
    what: "iCIMS is hiring software (an applicant tracking system, or ATS) that employers use to post jobs and screen applicants.",
    spot: "The form is often on an address ending in icims.com.",
  },
  taleo: {
    what: "Taleo is Oracle's hiring software (an applicant tracking system, or ATS) for posting jobs and screening applicants.",
    spot: "The form is often on an address ending in taleo.net.",
  },
  successfactors: {
    what: "SAP SuccessFactors is SAP's HR software. Its recruiting part takes job applications and screens applicants.",
    spot: "The form is often on an address like career4.successfactors.com, or one ending in jobs2web.com.",
  },
  smartrecruiters: {
    what: "SmartRecruiters is hiring software (an applicant tracking system, or ATS) that employers use to post jobs and screen applicants. Its AI is called Winston.",
    spot: "The job is often on jobs.smartrecruiters.com or careers.smartrecruiters.com.",
  },
  workable: {
    what: "Workable is hiring software (an applicant tracking system, or ATS) that employers use to post jobs and screen applicants.",
    spot: "The form is often on apply.workable.com.",
  },
  bamboohr: {
    what: "BambooHR is HR software for companies, with a hiring tool for posting jobs and reviewing applicants.",
    spot: "The form is often on an address ending in bamboohr.com.",
  },
  jobvite: {
    what: "Jobvite is hiring software (an applicant tracking system, or ATS) that employers use to post jobs and review applicants.",
    spot: "The job is often on jobs.jobvite.com.",
  },
  recruitee: {
    what: "Recruitee is hiring software (an applicant tracking system, or ATS) that employers use to post jobs and screen applicants.",
    spot: "The form is often on an address ending in recruitee.com.",
  },
  teamtailor: {
    what: "Teamtailor is hiring software (an applicant tracking system, or ATS) that employers use to post jobs and review applicants. Its AI helper is called Co-pilot.",
    spot: "The form is often on an address ending in teamtailor.com.",
  },
};

export const TOPIC_ORDER: readonly NoteTopic[] = ["file", "search", "screening", "ai", "review"];

export type AtsMessages = Translation<typeof ENGLISH>;

// The words around the notes in a page's language: English by default, else the ats namespace (src/i18n/messages).
export type GuideWords = { locale: Locale; t: AtsMessages };

const IN_ENGLISH: GuideWords = { locale: "en", t: ENGLISH };

export const TOPIC_TITLES: Record<NoteTopic, string> = ENGLISH.topics.titles;

export type GuideSection = { topic: NoteTopic; title: string; notes: readonly HiringNote[] };
// byTopic: the label already names the topics, because another source on the page shares its name.
export type GuideSource = { label: string; url: string; topics: NoteTopic[]; byTopic?: boolean };

export type AtsGuide = HiringSystem & GuideIntro & { sections: readonly GuideSection[] };

export const ATS_IDS = Object.keys(HIRING_SYSTEMS) as HiringSystemId[];

export function isAtsId(value: string): value is HiringSystemId {
  return Object.hasOwn(HIRING_SYSTEMS, value);
}

// Each tip restates advice that the sourced notes in lib/ats/systems.ts give for several systems.
export const GENERAL_ADVICE = [
  {
    title: "Send real text, not a picture of it",
    text: "Upload a PDF or Word file made from text. A scan or a photo of a page may not read properly.",
  },
  {
    title: "Keep one column",
    text: "Put your contact details in the main text, not in a header, footer, table or text box.",
  },
  {
    title: "Use the job post's words for skills you have",
    text: "Some searches only match exact words. Write a short form both ways once, like “Kubernetes (K8s)”.",
  },
  {
    title: "Use clear job titles",
    text: "Some AI, like SmartRecruiters' Winston, guesses your skills from your job titles.",
  },
  {
    title: "Answer screening questions truthfully, the same way every time",
    text: "Many systems let employers turn applicants down automatically on some answers.",
  },
  {
    title: "Check what the form fills in",
    text: "When a form fills its fields from your resume, read every one before you submit.",
  },
] as const satisfies readonly { title: string; text: string }[];

// The guides in another language: each system's introduction, every sourced note, the general advice and a card's screening tip.
export type AtsTranslation = {
  intros: { readonly [K in HiringSystemId]: GuideIntro };
  notes: { readonly [K in HiringSystemId]: Words<SystemNotes[K], "topic" | "url"> };
  general: Words<typeof GENERAL_ADVICE>;
  // "Answer screening questions truthfully, and the same way every time.", for a card whose tip says "Answer these".
  screeningTip: string;
};

// A guide in English, or in another language from its translation and that language's topic titles.
export function atsGuide(
  id: HiringSystemId,
  translation?: AtsTranslation,
  titles: Record<NoteTopic, string> = TOPIC_TITLES,
): AtsGuide {
  const system = HIRING_SYSTEMS[id];
  const notes: readonly HiringNote[] = translation
    ? withWords(system.notes, translation.notes[id])
    : system.notes;
  const sections = TOPIC_ORDER.flatMap((topic) => {
    const shown = notes.filter((note) => note.topic === topic);
    return shown.length ? [{ topic, title: titles[topic], notes: shown }] : [];
  });
  return { ...system, notes, ...(translation?.intros[id] ?? INTROS[id]), sections };
}

export const ATS_GUIDES: readonly AtsGuide[] = ATS_IDS.map((id) => atsGuide(id));

export function generalAdvice(
  translation?: AtsTranslation,
): readonly { title: string; text: string }[] {
  return translation ? withWords(GENERAL_ADVICE, translation.general) : GENERAL_ADVICE;
}

export function guideSources(
  guide: Pick<HiringSystem, "notes">,
  words: GuideWords = IN_ENGLISH,
): GuideSource[] {
  const seen = new Map<string, GuideSource>();
  for (const { source, topic } of guide.notes) {
    const entry = seen.get(source.url) ?? { label: source.label, url: source.url, topics: [] };
    if (!entry.topics.includes(topic)) entry.topics.push(topic);
    seen.set(source.url, entry);
  }
  const sources = [...seen.values()];
  const shared = (label: string) => sources.filter((source) => source.label === label).length > 1;
  const named = sources.map((source) =>
    shared(source.label)
      ? {
          ...source,
          label: fmt(words.t.sources.on, {
            label: source.label,
            topics: topicList(source.topics, words),
          }),
          byTopic: true,
        }
      : source,
  );
  return named.map((source, index) => {
    const earlier = named.slice(0, index).filter((other) => other.label === source.label);
    if (!earlier.length) return source;
    const label = fmt(words.t.sources.nth, { label: source.label, count: earlier.length + 1 });
    return { ...source, label };
  });
}

// Screening advice is the same on every system, so a card leads with what changes your resume.
const TIP_ORDER: readonly NoteTopic[] = ["file", "search", "ai", "review", "screening"];

// A card shows the tip without the fact before it, so "these" or "those" would point at nothing.
const LEANS_ON_FACT = /\b(?:these|those)\b/i;

const ANSWER_THESE = /^Answer these\b/;

// Picked from the English notes; a translation gives the same note's tip in its language.
export function topTip(
  guide: Pick<HiringSystem, "notes">,
  translated?: { notes: readonly HiringNote[]; screeningTip: string },
): string {
  const notes = TIP_ORDER.flatMap((topic) => guide.notes.filter((note) => note.topic === topic));
  const note = notes.find((entry) => !LEANS_ON_FACT.test(entry.todo)) ?? notes[0];
  if (!note) return "";
  if (!translated) return note.todo.replace(ANSWER_THESE, "Answer screening questions");
  if (ANSWER_THESE.test(note.todo)) return translated.screeningTip;
  return translated.notes[guide.notes.indexOf(note)]?.todo ?? note.todo;
}

export function readsFiles(guide: AtsGuide): boolean {
  return guide.sections.some((section) => section.topic === "file");
}

// A guide with a single sourced note stays out of search until Otto has more to say on it.
export const MIN_INDEXED_NOTES = 2;

export function isIndexed(guide: Pick<HiringSystem, "notes">): boolean {
  return guide.notes.length >= MIN_INDEXED_NOTES;
}

export const INDEXED_ATS_GUIDES: readonly AtsGuide[] = ATS_GUIDES.filter(isIndexed);

export function guideHeadline(guide: AtsGuide, words: GuideWords = IN_ENGLISH): string {
  const { reads, does } = words.t.headline;
  return fmt(readsFiles(guide) ? reads : does, { name: guide.name });
}

export function topicList(topics: readonly NoteTopic[], words: GuideWords = IN_ENGLISH): string {
  return joinList(
    topics.map((topic) => words.t.topics.phrases[topic]),
    words.locale,
  );
}

// The fullest wording that fits a search result wins.
export function guideDescription(guide: AtsGuide, words: GuideWords = IN_ENGLISH): string {
  const { t, locale } = words;
  const topics = guide.sections.map((section) => section.topic);
  const plural = (forms: PluralForms) => formatFor(locale).plural(forms, guide.notes.length);
  const values = {
    name: guide.name,
    topics: topicList(topics, words),
    short: joinList(
      topics.map((topic) => t.topics.short[topic]),
      locale,
    ),
    sourced: plural(t.description.sourced),
    brief: plural(t.description.brief),
  };
  // In the English order, so a translation can't change which wording is tried first.
  const filled = <K extends string>(english: Record<K, string>, given: Record<K, string>) =>
    (Object.keys(english) as K[]).map((key) => fmt(given[key] as string, values));
  const intros = filled(ENGLISH.description.intros, t.description.intros);
  const endings = filled(ENGLISH.description.endings, t.description.endings);
  const options = intros.flatMap((intro) => endings.map((ending) => `${intro} ${ending}`));
  const { min, max } = SEO_LIMITS.description;
  const fits = (text: string) => text.length <= max;
  return (
    options.find((text) => fits(text) && text.length >= min) ??
    options.find(fits) ??
    options.at(-1)!
  );
}
