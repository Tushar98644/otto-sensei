import { CONTENT_LANGS, type ContentLang } from "@/lib/i18n/languages";
import type { LintIssueId } from "../types";
import { de } from "./de";
import { en } from "./en";
import { es } from "./es";
import { fr } from "./fr";
import { pt } from "./pt";
import type { LintLanguage } from "./types";

export type { LintLanguage } from "./types";

export const LINT_LANGUAGES: Record<ContentLang, LintLanguage> = { en, es, pt, fr, de };

export function lintLanguage(lang: ContentLang = "en"): LintLanguage {
  return LINT_LANGUAGES[lang];
}

const EVERY: readonly ContentLang[] = CONTENT_LANGS;
const ENGLISH: readonly ContentLang[] = ["en"];

// The languages each check runs for: length, numbers, repeats and full stops read any language; word checks need a pack.
export const CHECK_LANGS: Record<LintIssueId, readonly ContentLang[]> = {
  "too-long": EVERY,
  "too-short": EVERY,
  duplicate: EVERY,
  punctuation: EVERY,
  "stock-phrase": EVERY,
  duty: EVERY,
  "weak-start": EVERY,
  "first-person": EVERY,
  "no-result": EVERY,
  "no-number": EVERY,
  "no-method": EVERY,
  vague: EVERY,
  tense: ENGLISH,
  passive: ENGLISH,
};

// A check runs when it lists the language and the language's pack has what it reads.
export function runs(id: LintIssueId, pack: LintLanguage): boolean {
  if (!CHECK_LANGS[id].includes(pack.lang)) return false;
  switch (id) {
    case "stock-phrase":
      return pack.stock !== undefined;
    case "duty":
      return pack.duty !== undefined;
    case "weak-start":
      return pack.weakStart !== undefined;
    case "first-person":
      return pack.firstPerson !== undefined;
    case "no-result":
    case "no-number":
      return pack.result !== undefined;
    case "no-method":
      return pack.result !== undefined && pack.method !== undefined;
    case "vague":
      return pack.vague !== undefined;
    case "tense":
      return pack.tense !== undefined;
    case "passive":
      return pack.passive !== undefined;
    default:
      return true;
  }
}
