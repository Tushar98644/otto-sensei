import type { ContentLang } from "@/lib/i18n/languages";

export type PhraseIndex = ReadonlyMap<string, readonly string[][]>;
export type VagueKind = "count" | "list" | "thing";

// A word that marks a method when the next word fits, like "by moving" or "en automatisant".
export type MethodLead = { word: string; next: (word: string) => boolean };

// Everything the word checks know about one language; a check whose part is missing is skipped.
export type LintLanguage = {
  lang: ContentLang;
  // Words read before the first real word of a line: "I", "we", "je", "j'ai".
  openerSkips: ReadonlySet<string>;
  // French elisions ("l'", "d'") are their own tokens, so phrases match across them.
  elisions: boolean;
  // Abbreviations whose dot isn't a full stop at the end of a line.
  abbreviations: ReadonlySet<string>;
  stock?: PhraseIndex;
  duty?: PhraseIndex;
  weakStart?: PhraseIndex;
  firstPerson?: { words: ReadonlySet<string>; team: ReadonlySet<string> };
  result?: {
    words: ReadonlySet<string>;
    phrases: PhraseIndex;
    // German compounds end in a result word: Kostensenkung, Umsatzsteigerung.
    suffixes: readonly string[];
    openers: ReadonlySet<string>;
  };
  method?: {
    words: ReadonlySet<string>;
    phrases: PhraseIndex;
    gerund: RegExp | null;
    lead: MethodLead | null;
  };
  numberWords?: ReadonlySet<string>;
  vague?: {
    index: PhraseIndex;
    kinds: ReadonlyMap<string, VagueKind>;
    // Keys that take their dot with them, like "etc." and "usw.".
    dotted: ReadonlySet<string>;
  };
  tense?: { pastOf: ReadonlyMap<string, string> };
  passive?: {
    auxiliaries: ReadonlySet<string>;
    irregular: ReadonlySet<string>;
    notPassive: ReadonlySet<string>;
  };
  romanNumeralContext?: ReadonlySet<string>;
};

// Lowercase without accents, the way tokens are compared.
export function fold(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase();
}

// French words that lose their vowel before another word: l'équipe, d'une, j'ai, qu'il.
export const ELIDED = /^(?:c|d|j|l|m|n|qu|s|t|jusqu|lorsqu|puisqu)$/;

// Splits on spaces, and after an elided word ("d'équipe" is "d'" and "equipe").
export function phraseWords(phrase: string): string[] {
  return fold(phrase)
    .replaceAll("’", "'")
    .split(" ")
    .flatMap((word) => {
      const [head = "", ...rest] = word.split("'");
      return rest.length === 1 && ELIDED.test(head) ? [`${head}'`, rest[0] ?? ""] : [word];
    })
    .filter(Boolean);
}

export function wordSet(list: string): ReadonlySet<string> {
  return new Set(fold(list).trim().split(/\s+/));
}

export function indexPhrases(phrases: readonly string[]): PhraseIndex {
  const index = new Map<string, string[][]>();
  for (const phrase of phrases) {
    const words = phraseWords(phrase);
    const first = words[0] ?? "";
    index.set(first, [...(index.get(first) ?? []), words]);
  }
  for (const list of index.values()) list.sort((a, b) => b.length - a.length);
  return index;
}

export function vagueOf(
  lists: Record<VagueKind, readonly string[]>,
  dotted: readonly string[],
): NonNullable<LintLanguage["vague"]> {
  const all = [...lists.count, ...lists.list, ...lists.thing];
  const kinds = new Map<string, VagueKind>();
  for (const kind of ["count", "list", "thing"] as const) {
    for (const phrase of lists[kind]) kinds.set(phraseWords(phrase).join(" "), kind);
  }
  return { index: indexPhrases(all), kinds, dotted: new Set(dotted) };
}
