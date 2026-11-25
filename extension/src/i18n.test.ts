import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { RULE_LABELS, VERDICT_LABELS } from "@/lib/eligibility/types";
import { STATUS_LABELS } from "@/lib/match-check/copy";
import { manifest } from "../manifest";
import { pluralKey, t, wordsLang } from "./i18n";
import { blockedText, eligibilityLine, missingLine, skillsLine } from "./match";
import { toastHtml } from "./ui/fill-view";
import { render, RULE_WORDS, STATUS_WORDS, VERDICT_WORDS } from "./ui/view";

type Entry = {
  message: string;
  description?: string;
  placeholders?: Record<string, { content: string }>;
};
type Bundle = Record<string, Entry>;

const LOCALES_DIR = fileURLToPath(new URL("../_locales", import.meta.url));
const FOLDERS = readdirSync(LOCALES_DIR).sort();
const read = (folder: string): Bundle =>
  JSON.parse(readFileSync(path.join(LOCALES_DIR, folder, "messages.json"), "utf8")) as Bundle;
const EN = read("en");
const TRANSLATED = FOLDERS.filter((folder) => folder !== "en");

// Messages that read the same as English in that language.
const SAME: Record<string, ReadonlySet<string>> = {
  es: new Set(["miniLabel", "quote", "verdictOk", "groupEmea", "groupApac", "no"]),
  pt_BR: new Set(["miniLabel", "quote", "verdictOk", "groupEmea", "groupApac"]),
  fr: new Set(["verdictOk", "groupEurope", "groupEmea", "groupApac", "placeEurope"]),
  de: new Set([
    "miniLabel",
    "verdictOk",
    "groupEu",
    "groupEmea",
    "groupApac",
    "placeEu",
    "remoteWord",
    "remotePlace",
  ]),
};

const named = (entry: Entry) =>
  [...entry.message.matchAll(/\$([A-Za-z0-9_@]+)\$/g)].map((m) => m[1]!.toLowerCase()).sort();

// What Chrome's getMessage does with one locale's bundle and English under it.
function fakeChrome(folder: string) {
  const bundle = read(folder);
  const getMessage = (key: string, values: string[] = []) => {
    const entry = bundle[key] ?? EN[key];
    if (!entry) return "";
    return entry.message
      .replace(
        /\$([A-Za-z0-9_@]+)\$/g,
        (whole, name: string) => entry.placeholders?.[name.toLowerCase()]?.content ?? whole,
      )
      .replace(/\$(\d|\$)/g, (_, which: string) =>
        which === "$" ? "$" : (values[Number(which) - 1] ?? ""),
      );
  };
  (globalThis as { chrome?: unknown }).chrome = { i18n: { getMessage } };
}

afterEach(() => {
  delete (globalThis as { chrome?: unknown }).chrome;
});

describe("the extension's _locales", () => {
  it("has English and the four languages Otto speaks", () => {
    expect(FOLDERS).toEqual(["de", "en", "es", "fr", "pt_BR"]);
  });

  it("keeps every key Chrome can read, with its placeholders defined", () => {
    for (const folder of FOLDERS) {
      for (const [key, entry] of Object.entries(read(folder))) {
        expect(key).toMatch(/^[A-Za-z0-9_]+$/);
        expect(entry.message.trim(), `${folder}.${key}`).not.toBe("");
        expect(named(entry), `${folder}.${key}`).toEqual(
          Object.keys(entry.placeholders ?? {}).sort(),
        );
        // They go straight into the badge's HTML, so they carry no markup or quotes of their own.
        expect(entry.message, `${folder}.${key}`).not.toMatch(/[<>&"]/);
      }
    }
  });

  it.each(TRANSLATED)(
    "%s has every English key, the same placeholders, and its own words",
    (folder) => {
      const bundle = read(folder);
      expect(Object.keys(bundle).sort()).toEqual(Object.keys(EN).sort());
      for (const [key, entry] of Object.entries(EN)) {
        const translated = bundle[key]!;
        expect(translated.placeholders, `${folder}.${key}`).toEqual(entry.placeholders);
        if (!SAME[folder]?.has(key)) {
          expect(translated.message, `${folder}.${key} is still English`).not.toBe(entry.message);
        }
      }
    },
  );

  it("fits the Web Store's limits in every language", () => {
    for (const folder of FOLDERS) {
      const bundle = read(folder);
      expect(bundle.extName!.message.length).toBeLessThanOrEqual(45);
      expect(bundle.extDescription!.message.length, folder).toBeLessThanOrEqual(132);
    }
  });

  it("names its language, so counts and country names follow the words", () => {
    expect(
      Object.fromEntries(FOLDERS.map((folder) => [folder, read(folder).lang!.message])),
    ).toEqual({
      de: "de",
      en: "en",
      es: "es",
      fr: "fr",
      pt_BR: "pt-BR",
    });
  });

  it("says in English exactly what the app's own labels say", () => {
    for (const [status, label] of Object.entries(STATUS_LABELS)) {
      expect(t(STATUS_WORDS[status as keyof typeof STATUS_WORDS])).toBe(label);
    }
    for (const [verdict, label] of Object.entries(VERDICT_LABELS)) {
      expect(t(VERDICT_WORDS[verdict as keyof typeof VERDICT_WORDS])).toBe(label);
    }
    for (const [rule, label] of Object.entries(RULE_LABELS)) {
      expect(t(RULE_WORDS[rule as keyof typeof RULE_WORDS])).toBe(label);
    }
  });
});

describe("the manifest's words", () => {
  it("come from _locales, English by default, and the dev build keeps its own name", () => {
    const prod = manifest("prod", "1");
    expect(prod.default_locale).toBe("en");
    for (const value of [prod.name, prod.description, prod.action.default_title]) {
      const key = /^__MSG_(\w+)__$/.exec(value)?.[1];
      expect(key && EN[key]).toBeTruthy();
    }
    expect(manifest("dev", "1").name).toBe("Otto for Chrome (dev)");
  });
});

describe("t", () => {
  it("reads English without chrome.i18n, as Chrome would", () => {
    expect(wordsLang()).toBe("en");
    expect(t("skillsFoundOther", 3, 7)).toBe("3 of 7 skills found");
    expect(t("missingMore", "Go, $1", 2)).toBe("Missing: Go, $1 and 2 more");
  });

  it("speaks the browser's language through chrome.i18n, counts included", () => {
    fakeChrome("es");
    expect(wordsLang()).toBe("es");
    expect(skillsLine({ found: 1, total: 1 })).toBe("1 de 1 habilidad encontrada");
    expect(skillsLine({ found: 2, total: 6 })).toBe("2 de 6 habilidades encontradas");
    expect(missingLine(["Go", "Rust", "Kafka", "Scala"])).toBe("Falta: Go, Rust, Kafka y 1 más");
    fakeChrome("fr");
    // French counts 0 and 1 as one.
    expect(pluralKey(0, "fieldsOne", "fieldsOther")).toBe("fieldsOne");
    expect(t("noFilledForm")).toBe("Otto n'a aucun formulaire rempli en attente dans cet onglet.");
  });

  it("names places in the browser's language", () => {
    fakeChrome("de");
    const line = eligibilityLine(
      { location: "Bengaluru, India", text: "On-site role." },
      null,
      { place: "c:IN", remote: false },
      { now: Date.UTC(2026, 10, 22) },
    );
    expect(line.text).toBe("Offen für Indien");
    expect(
      blockedText({
        rule: "sponsorship",
        verdict: "blocked",
        note: "No sponsorship in Canada.",
        quote: "",
        source: "post",
      }),
    ).toBe("Kein Visa-Sponsoring für Kanada");
  });

  it("leaves no English sentence in a card drawn in another language", () => {
    const fragments = Object.values(EN)
      .flatMap((entry) => entry.message.split(/\$[A-Za-z0-9_@]+\$/))
      .map((part) => part.trim())
      .filter((part) => /\p{L}+\s+\p{L}+/u.test(part));
    for (const folder of TRANSLATED) {
      fakeChrome(folder);
      const html = [
        render({ kind: "connect", siteName: "LinkedIn" }, "card"),
        render({ kind: "no-resume", siteName: "LinkedIn" }, "card"),
        render({ kind: "select", siteName: "LinkedIn", error: t("selectMore") }, "card"),
        toastHtml({
          kind: "applied",
          id: "a",
          company: "Acme",
          role: "Dev",
          boardPath: "/",
          busy: false,
        }),
      ].join("\n");
      expect(
        fragments.filter((part) => html.includes(part)),
        folder,
      ).toEqual([]);
    }
  });
});
