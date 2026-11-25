import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { checkMessages } from "./check";
import { ENABLED_LOCALES, LOCALES, type Locale } from "./config";
import { englishMessages, loadMessages, NAMESPACES, translationsFor } from "./messages";

const DIR = fileURLToPath(new URL("./messages", import.meta.url));
const TRANSLATED = LOCALES.filter((locale): locale is Exclude<Locale, "en"> => locale !== "en");
const en = englishMessages();

const filesIn = (locale: Locale) =>
  readdirSync(path.join(DIR, locale))
    .filter((file) => file.endsWith(".ts") && file !== "index.ts")
    .map((file) => file.slice(0, -3));

// Words that read the same in every language, per locale and message path.
const SAME_AS_ENGLISH: Record<Exclude<Locale, "en">, ReadonlySet<string>> = {
  es: new Set(["design.color", "design.densities.normal", "row.no"]),
  "pt-BR": new Set(["design.title", "design.densities.normal", "links.title", "projects.link"]),
  fr: new Set([
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
  ]),
  de: new Set([
    "dashboard.portfolio.title",
    "links.title",
    "links.optional",
    "links.name",
    "projects.link",
    "education.details",
    "extras.details",
    "extras.kinds.custom.detail.label",
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

  it("is complete before it is enabled", async () => {
    if (!ENABLED_LOCALES.includes(locale)) return;
    const translated = await translationsFor(locale);
    expect(NAMESPACES.filter((namespace) => !(namespace in translated))).toEqual([]);
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
