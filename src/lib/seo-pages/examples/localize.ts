import type { ContentLang } from "@/lib/i18n/languages";
import { withWords } from "../words";
import type { RoleExample } from "./types";

type Other = Exclude<ContentLang, "en">;

const ENGLISH_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

// Short months and "Present" as CVs in each language print them; the import parser and the line check read them back.
const MONTHS: Record<Other, readonly string[]> = {
  es: [
    "Ene.",
    "Feb.",
    "Mar.",
    "Abr.",
    "May.",
    "Jun.",
    "Jul.",
    "Ago.",
    "Sep.",
    "Oct.",
    "Nov.",
    "Dic.",
  ],
  pt: [
    "Jan.",
    "Fev.",
    "Mar.",
    "Abr.",
    "Mai.",
    "Jun.",
    "Jul.",
    "Ago.",
    "Set.",
    "Out.",
    "Nov.",
    "Dez.",
  ],
  fr: [
    "Janv.",
    "Févr.",
    "Mars",
    "Avr.",
    "Mai",
    "Juin",
    "Juil.",
    "Août",
    "Sept.",
    "Oct.",
    "Nov.",
    "Déc.",
  ],
  de: [
    "Jan.",
    "Feb.",
    "März",
    "Apr.",
    "Mai",
    "Juni",
    "Juli",
    "Aug.",
    "Sept.",
    "Okt.",
    "Nov.",
    "Dez.",
  ],
};

const PRESENT: Record<Other, string> = {
  es: "Actualidad",
  pt: "Atual",
  fr: "Aujourd'hui",
  de: "heute",
};

// "Apr 2024" and "Present" in the resume's language; a year alone reads the same everywhere.
export function resumeDate(text: string, lang: ContentLang): string {
  if (lang === "en") return text;
  if (text === "Present") return PRESENT[lang];
  const [, month = "", year = ""] = /^([A-Z][a-z]{2}) (\d{4})$/.exec(text) ?? [];
  const index = ENGLISH_MONTHS.indexOf(month as (typeof ENGLISH_MONTHS)[number]);
  return index < 0 ? text : `${MONTHS[lang][index]} ${year}`;
}

type Dated = { startDate?: string; endDate?: string };

const dated = <T extends Dated>(entry: T, lang: ContentLang): T => ({
  ...entry,
  ...(entry.startDate === undefined ? {} : { startDate: resumeDate(entry.startDate, lang) }),
  ...(entry.endDate === undefined ? {} : { endDate: resumeDate(entry.endDate, lang) }),
});

// An example in another language: its words put into the English example, its dates and headings in that language.
export function translatedExample(english: RoleExample, words: unknown, lang: Other): RoleExample {
  const example = withWords(english, words);
  const { resume } = example;
  return {
    ...example,
    resume: {
      ...resume,
      lang,
      experience: resume.experience?.map((job) => dated(job, lang)),
      education: resume.education.map((school) => dated(school, lang)),
    },
  };
}
