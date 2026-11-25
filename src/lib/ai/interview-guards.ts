import type { ContentLang } from "@/lib/i18n/languages";
import { maskInventedNumbers, type NumberLangs } from "./guards";

// Facts about the person must come from the resume or the post; general know-how needs no source.

const WORD = /[\p{L}\p{N}']+/gu;
const BRACKETED = /\[[^\]]*\]/g;
const STEM_CHARS = 5;
const SENTENCE_END = /(?:^|[.!?:;"“(])$/u;
const ONLY_I = /^I(?:'|’|$)/u;
const ENGLISH: NumberLangs = ["en"];

export function wordsOf(text: string): string[] {
  return Array.from(text.toLowerCase().matchAll(WORD), (match) => match[0]);
}

export function stem(word: string): string {
  return word.slice(0, STEM_CHARS);
}

// German capitalizes every noun, so there only a capital inside a word (PostgreSQL, iOS) marks a name.
export function namesIn(text: string, langs: NumberLangs = ENGLISH): string[] {
  const nouns = langs.includes("de");
  const plain = text.replace(BRACKETED, " ");
  const names: string[] = [];
  for (const match of plain.matchAll(WORD)) {
    const word = match[0];
    if (ONLY_I.test(word)) continue;
    const startsSentence = SENTENCE_END.test(plain.slice(0, match.index).trimEnd());
    const innerCapital = /\p{Lu}/u.test(word.slice(1));
    if (innerCapital || (!nouns && /^\p{Lu}/u.test(word) && !startsSentence)) names.push(word);
  }
  return names;
}

export type Sources = { texts: readonly string[]; known: Set<string>; langs?: NumberLangs };

export function sourcesOf(texts: readonly string[], langs: NumberLangs = ENGLISH): Sources {
  const known = new Set(texts.flatMap((source) => wordsOf(source).map(stem)));
  return foreign(langs).length === 0 ? { texts, known } : { texts, known, langs };
}

// "you'd", "you would" and "how would you" are hypotheticals, not claims about the person's past.
const CLAIM =
  /\b(?:i|i'm|i've|i'd|my|mine|your|yours|you've|you have|you had|you were|did you|have you|were you|had you)\b|\byou (?:\p{L}+ed|built|led|ran|made|wrote|took|chose|picked|set|got|grew|cut|drove|owned|shipped|won|bought|sold|spent|kept|brought|began|found|saw|did)\b/iu;
// In the general rounds' points, these openers point at the person's own material.
const PERSONAL_OPENER =
  /^(?:bring up|mention|cite|quote|lead with|open with|start with|end with|close with|point to|highlight|talk about|tell|share|use|say)\b/i;

const B = "(?<![\\p{L}\\p{N}])";
const E = "(?![\\p{L}\\p{N}])";
const words = (source: string) => new RegExp(`${B}(?:${source})${E}`, "iu");
const opening = (source: string) => new RegExp(`^(?:${source})${E}`, "iu");

// Pronouns and verb forms that make a sentence about the person, in the other languages.
const FOREIGN_CLAIM: Record<Exclude<ContentLang, "en">, RegExp> = {
  es: words("yo|mi|mis|m[íi]o|m[íi]a|tu|tus|t[úu]|usted|has|hiciste|\\p{L}{3,}(?:aste|iste)"),
  pt: words("eu|meu|minha|meus|minhas|voc[êe]|seu|sua|seus|suas|teu|tua|fez|fizeste"),
  fr: new RegExp(
    `${B}(?:je|mon|ma|mes|moi|tu|ton|ta|tes|toi|vous|votre|vos)${E}|${B}j['’](?=\\p{L})`,
    "iu",
  ),
  de: words(
    "ich|mein|meine|meinen|meinem|meiner|mich|mir|du|dein|deine|deinen|deinem|deiner|dich|dir|ihr|ihre|ihren|ihrem|ihrer|hast du|haben sie",
  ),
};
const FOREIGN_OPENER: Record<Exclude<ContentLang, "en">, RegExp> = {
  es: opening(
    "menciona|cita|empieza con|abre con|cierra con|termina con|destaca|resalta|habla de|cuenta|comparte|usa|di|nombra",
  ),
  pt: opening(
    "mencione|cite|comece com|abra com|termine com|feche com|destaque|fale (?:de|sobre)|conte|compartilhe|use|diga",
  ),
  fr: opening(
    "mentionne|cite|commence par|ouvre (?:avec|sur)|termine (?:par|sur)|conclus (?:par|sur)|souligne|mets en avant|parle de|raconte|partage|utilise|dis",
  ),
  de: opening(
    "erwähne|nenne|zitiere|beginne mit|starte mit|schließe mit|ende mit|betone|hebe hervor|sprich über|erzähle|teile|nutze|sag",
  ),
};

const foreign = (langs: NumberLangs) =>
  langs.filter((lang): lang is Exclude<ContentLang, "en"> => lang !== "en");

export function claimsAboutPerson(
  sentence: string,
  openers = false,
  langs: NumberLangs = ENGLISH,
): boolean {
  const text = sentence.replace(BRACKETED, " ");
  if (CLAIM.test(text) || (openers && PERSONAL_OPENER.test(text.trim()))) return true;
  return foreign(langs).some(
    (lang) => FOREIGN_CLAIM[lang].test(text) || (openers && FOREIGN_OPENER[lang].test(text.trim())),
  );
}

export function sentencesOf(text: string): string[] {
  return text
    .split(/(?<=[.!?]["”’»)]?)\s+(?=["“(¿¡«„]?\s?\p{Lu})/u)
    .map((part) => part.trim())
    .filter(Boolean);
}

function unknownName(sentence: string, known: Set<string>, langs: NumberLangs): boolean {
  return namesIn(sentence, langs).some((name) => !known.has(stem(name.toLowerCase())));
}

export type PersonGuard = {
  // Every sentence counts as speaking about the person, as in a deep-dive question.
  personal?: boolean;
  // Openers like "Mention" or "Lead with" also count, as in the general rounds' points.
  openers?: boolean;
};

// A sentence about the person gets unsourced numbers masked, and drops the text if it names something unsourced.
export function guardPersonFacts(
  text: string,
  sources: Sources,
  guard: PersonGuard = {},
): string | null {
  const langs = sources.langs ?? ENGLISH;
  const out: string[] = [];
  for (const sentence of sentencesOf(text)) {
    if (!(guard.personal || claimsAboutPerson(sentence, guard.openers, langs))) {
      out.push(sentence);
      continue;
    }
    if (unknownName(sentence, sources.known, langs)) return null;
    out.push(maskInventedNumbers(sentence, sources.texts, langs));
  }
  return out.length > 0 ? out.join(" ") : null;
}
