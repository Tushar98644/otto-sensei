import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { checkMessages } from "./check";
import { ENABLED_LOCALES, LOCALES, type Locale } from "./config";
import { englishMessages, loadMessages, NAMESPACES, translationsFor } from "./messages";
import { PAGE_KEYS, pageNamespaces, type PageKey } from "./pages";
import { publishedPages } from "./publish";

const DIR = fileURLToPath(new URL("./messages", import.meta.url));

// The pages P2 and P5 translated; sign-in follows with the app (P3).
const MARKETING_CORE: readonly PageKey[] = [
  "/",
  "/pricing",
  "/job-match",
  "/resume-builder",
  "/cover-letter-generator",
  "/job-application-tracker",
  "/interview-prep",
  "/portfolio-website-builder",
  "/privacy",
  "/terms",
  "/refunds",
  "/acceptable-use",
  "/resume-examples",
  "/resume-templates",
  "/ats",
  "/compare",
];
const TRANSLATED = LOCALES.filter((locale): locale is Exclude<Locale, "en"> => locale !== "en");
const en = englishMessages();

// A namespace's file is its key in kebab case: job-match.ts holds jobMatch.
const filesIn = (locale: Locale) =>
  readdirSync(path.join(DIR, locale))
    .filter((file) => file.endsWith(".ts") && file !== "index.ts")
    .map((file) =>
      file.slice(0, -3).replace(/-(\w)/g, (_, letter: string) => letter.toUpperCase()),
    );

// Words that read the same in English and this language, by path within their namespace.
const SAME_AS_ENGLISH: Record<Exclude<Locale, "en">, ReadonlySet<string>> = {
  es: new Set([
    "title",
    "row.quoted",
    "working.general",
    "design.color",
    "design.densities.normal",
    "row.no",
    "coverLetters.tones.natural",
    "coverLetters.tones.formal",
    "interviewPrep.levels.staff",
    "footer.groups.legal",
    "quote",
    "story.beats.situation.letter",
    "story.beats.task.letter",
    "story.beats.action.letter",
    "story.beats.result.letter",
    "focus.devops.label",
    "focus.product.label",
    "levels.junior",
    "levels.senior",
    "cards.demo",
    "dialog.choice",
    "sample.job",
    "sample.story.place",
    "usage.pool",
  ]),
  "pt-BR": new Set([
    "title",
    "card.via",
    "hub.via",
    "row.quoted",
    "dialog.status",
    "design.title",
    "design.densities.normal",
    "links.title",
    "projects.link",
    "nav.menu",
    "coverLetters.tones.natural",
    "coverLetters.tones.formal",
    "interviewPrep.levels.staff",
    "quote",
    "story.beats.situation.letter",
    "story.beats.task.letter",
    "story.beats.action.letter",
    "story.beats.result.letter",
    "focus.devops.label",
    "focus.product.label",
    "focus.design.label",
    "cards.demo",
    "dialog.choice",
    "sample.job",
    "sample.story.place",
    "usage.pool",
  ]),
  fr: new Set([
    "title",
    "guide.sourcesTitle",
    "page.sources",
    "formatsTitle",
    "meta.portfolio",
    "nav.portfolio",
    "card.via",
    "hub.via",
    "hub.notes",
    "dialog.notes",
    "hub.kinds.outreach",
    "labels.outreach",
    "reader.question",
    "filters.outreach",
    "dashboard.portfolio.title",
    "history.versions",
    "versions.title",
    "design.densities.compact",
    "chips.vague",
    "certifications.date",
    "extras.date",
    "extras.kinds.awards.date.label",
    "extras.kinds.volunteering.date.label",
    "extras.kinds.publications.name",
    "extras.kinds.publications.date.label",
    "extras.kinds.custom.date.label",
    "nav.menu",
    "coverLetters.tones.direct",
    "interviewPrep.levels.junior",
    "interviewPrep.levels.senior",
    "gmail.code",
    "video.pause",
    "question.practiceQuestion",
    "story.beats.situation.letter",
    "story.beats.situation.label",
    "story.beats.task.letter",
    "story.beats.action.letter",
    "story.beats.action.label",
    "story.beats.result.letter",
    "timer.pause",
    "focus.data-science.label",
    "focus.data-analysis.label",
    "focus.data-engineering.label",
    "focus.devops.label",
    "focus.product.label",
    "focus.design.label",
    "levels.junior",
    "levels.senior",
    "dialog.choice",
    "sample.job",
    "sample.story.place",
    "usage.pool",
  ]),
  de: new Set([
    "title",
    "meta.jobs",
    "meta.portfolio",
    "nav.jobs",
    "nav.portfolio",
    "rename.name",
    "steps.interview",
    "steps.jobs",
    "library.sorts.name",
    "page.title",
    "card.remote",
    "page.board",
    "dialog.status",
    "when.interview",
    "when.interviewOn",
    "when.in",
    "hub.remote",
    "move.optional",
    "winRate.interviews",
    "dashboard.portfolio.title",
    "links.title",
    "links.optional",
    "links.name",
    "projects.link",
    "education.details",
    "extras.details",
    "extras.kinds.custom.detail.label",
    "nav.dashboard",
    "resume.skills.prototyping",
    "gmail.code",
    "video.pause",
    "pack.pitch",
    "question.interviewer",
    "story.beats.situation.letter",
    "story.beats.situation.label",
    "timer.pause",
    "form.level",
    "focus.devops.label",
    "focus.design.label",
    "levels.junior",
    "levels.senior",
    "text.situation",
    "cards.demo",
    "dialog.choice",
    "sample.job",
    "sample.story.place",
    "usage.pool",
  ]),
};

describe("English messages", () => {
  it("has a file per namespace and nothing else", () => {
    expect(filesIn("en").sort()).toEqual([...NAMESPACES].sort());
  });

  it("has no empty text, bad tags or plural forms English doesn't use", () => {
    expect(checkMessages("en", en)).toEqual([]);
  });
});

describe.each(TRANSLATED)("%s messages", (locale) => {
  it("lists every file in its folder, and each one is an English namespace", async () => {
    const translated = await translationsFor(locale);
    expect(Object.keys(translated).sort()).toEqual(filesIn(locale).sort());
    for (const namespace of Object.keys(translated)) expect(NAMESPACES).toContain(namespace);
  });

  it("matches English key for key, with the same placeholders, tags and needed plural forms", async () => {
    const translated = await translationsFor(locale);
    const problems = Object.entries(translated).flatMap(([namespace, messages]) =>
      checkMessages(
        locale,
        messages,
        en[namespace as keyof typeof en],
        SAME_AS_ENGLISH[locale],
      ).map((problem) => `${namespace}.${problem}`),
    );
    expect(problems).toEqual([]);
  });

  it("publishes a page only once every namespace it reads is translated", async () => {
    const translated = await translationsFor(locale);
    const published = await publishedPages(locale);
    for (const key of PAGE_KEYS) {
      const missing = pageNamespaces(key).filter((namespace) => !(namespace in translated));
      expect(published.has(key), `${key} (missing: ${missing.join(", ")})`).toBe(
        ENABLED_LOCALES.includes(locale) && missing.length === 0,
      );
    }
  });

  it("publishes the marketing core and the guides (P2, P5)", async () => {
    const published = await publishedPages(locale);
    expect(MARKETING_CORE.filter((key) => !published.has(key))).toEqual([]);
  });
});

describe("loadMessages", () => {
  it("reads English for a namespace a locale hasn't translated yet", async () => {
    expect(await loadMessages("en", "common")).toBe(en.common);
    for (const locale of TRANSLATED) {
      const translated = await translationsFor(locale);
      if (!("common" in translated)) expect(await loadMessages(locale, "common")).toBe(en.common);
    }
  });
});
