import { HIRING_SYSTEMS } from "@/lib/ats/systems";
import type { HiringNote, HiringSystem, HiringSystemId, NoteTopic } from "@/lib/ats/types";
import { SEO_LIMITS } from "@/lib/seo/limits";

type GuideIntro = {
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

export const TOPIC_TITLES: Record<NoteTopic, string> = {
  file: "How it reads your file",
  search: "How recruiters search it",
  screening: "Questions that can screen you out",
  ai: "AI matching and ranking",
  review: "How people review applicants",
};

export type GuideSection = { topic: NoteTopic; title: string; notes: readonly HiringNote[] };
// byTopic: the label already names the topics, because another source on the page shares its name.
export type GuideSource = { label: string; url: string; topics: NoteTopic[]; byTopic?: boolean };

export type AtsGuide = HiringSystem & GuideIntro & { sections: readonly GuideSection[] };

export const ATS_IDS = Object.keys(HIRING_SYSTEMS) as HiringSystemId[];

export function isAtsId(value: string): value is HiringSystemId {
  return Object.hasOwn(HIRING_SYSTEMS, value);
}

export function atsGuide(id: HiringSystemId): AtsGuide {
  const system = HIRING_SYSTEMS[id];
  const sections = TOPIC_ORDER.flatMap((topic) => {
    const notes = system.notes.filter((note) => note.topic === topic);
    return notes.length ? [{ topic, title: TOPIC_TITLES[topic], notes }] : [];
  });
  return { ...system, ...INTROS[id], sections };
}

export const ATS_GUIDES: readonly AtsGuide[] = ATS_IDS.map(atsGuide);

export function guideSources(guide: Pick<HiringSystem, "notes">): GuideSource[] {
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
      ? { ...source, label: `${source.label} on ${topicList(source.topics)}`, byTopic: true }
      : source,
  );
  return named.map((source, index) => {
    const earlier = named.slice(0, index).filter((other) => other.label === source.label);
    return earlier.length
      ? { ...source, label: `${source.label} (${earlier.length + 1})` }
      : source;
  });
}

// Screening advice is the same on every system, so a card leads with what changes your resume.
const TIP_ORDER: readonly NoteTopic[] = ["file", "search", "ai", "review", "screening"];

// A card shows the tip without the fact before it, so "these" or "those" would point at nothing.
const LEANS_ON_FACT = /\b(?:these|those)\b/i;

export function topTip(guide: Pick<HiringSystem, "notes">): string {
  const notes = TIP_ORDER.flatMap((topic) => guide.notes.filter((note) => note.topic === topic));
  const note = notes.find((entry) => !LEANS_ON_FACT.test(entry.todo)) ?? notes[0];
  return note?.todo.replace(/^Answer these\b/, "Answer screening questions") ?? "";
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

export function guideHeadline(guide: AtsGuide): string {
  return readsFiles(guide)
    ? `How ${guide.name} reads your resume`
    : `What ${guide.name} does with your application`;
}

const TOPIC_PHRASES: Record<NoteTopic, string> = {
  file: "how it reads your file",
  search: "how recruiters search it",
  screening: "screening questions",
  ai: "AI matching",
  review: "how people review applicants",
};

function joinPhrases(phrases: string[]): string {
  const last = phrases.pop() ?? "";
  return phrases.length ? `${phrases.join(", ")} and ${last}` : last;
}

export function topicList(topics: readonly NoteTopic[]): string {
  return joinPhrases(topics.map((topic) => TOPIC_PHRASES[topic]));
}

const SHORT_TOPIC_PHRASES: Record<NoteTopic, string> = {
  file: "file reading",
  search: "recruiter search",
  screening: "screening questions",
  ai: "AI matching",
  review: "human review",
};

// The fullest wording that fits a search result wins.
export function guideDescription(guide: AtsGuide): string {
  const topics = guide.sections.map((section) => section.topic);
  const long = topicList(topics);
  const short = joinPhrases(topics.map((topic) => SHORT_TOPIC_PHRASES[topic]));
  const one = guide.notes.length === 1;
  const sourced = one
    ? "One sourced note, with a practical tip and its source"
    : `${guide.notes.length} sourced notes, each with a practical tip and its source`;
  const brief = one
    ? "One sourced note with a practical tip"
    : `${guide.notes.length} sourced notes with practical tips`;
  const intros = [
    `What the ${guide.name} ATS does with your application: ${long}.`,
    `What ${guide.name} does with your application: ${long}.`,
    `What the ${guide.name} ATS does with your application: ${short}.`,
    `${guide.name} ATS guide: ${short}.`,
  ];
  const endings = [
    `${sourced}, plus general advice for any ATS.`,
    `${sourced}, plus advice for any ATS.`,
    `${brief}, plus general advice for any ATS.`,
    `${brief}, plus advice for any ATS.`,
    `${sourced}.`,
    `${brief}.`,
  ];
  const options = intros.flatMap((intro) => endings.map((ending) => `${intro} ${ending}`));
  const { min, max } = SEO_LIMITS.description;
  const fits = (text: string) => text.length <= max;
  return (
    options.find((text) => fits(text) && text.length >= min) ??
    options.find(fits) ??
    options.at(-1)!
  );
}

// Each tip restates advice that the sourced notes in lib/ats/systems.ts give for several systems.
export const GENERAL_ADVICE: readonly { title: string; text: string }[] = [
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
];
