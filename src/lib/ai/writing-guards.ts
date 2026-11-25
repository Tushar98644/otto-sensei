import { hasInventedNumbers, maskInventedNumbers, NUMBER_PLACEHOLDER, type NumberLangs } from "./guards";
import { oneLine, placeholdersIn } from "./text";
import { FOREIGN_BLANK_WORDS, FOREIGN_CLICHES, FOREIGN_UNBACKED, foreignOf, type Phrase } from "./writing-guards-lang";

const WORD = /[\p{L}\p{N}]+(?:['’]\p{L}+)?/gu;
const SENTENCE_BREAK = /(?<=[.!?]["”’»)]?)\s+(?=["“‘(¿¡«„]?\s?[\p{Lu}\p{N}])/u;
const PLACEHOLDER = /\[([^\]\n]*)\]/g;
const BLANK_WORDS = /^(?:your|the|a|an|insert|add|x|n|number|amount|name|company|date|role|city)\b/i;

export const CLICHES: readonly { label: string; pattern: RegExp }[] = [
  { label: "I am writing to", pattern: /\bI(?: am|['’]m) writing to\b/i },
  { label: "express my interest", pattern: /\bexpress(?:ing)? (?:my|our) (?:\w+ )?interest\b/i },
  { label: "passionate", pattern: /\bpassion(?:ate|ately)?\b/i },
  { label: "excited to", pattern: /\b(?:excited|thrilled|delighted|eager) to\b/i },
  { label: "leverage", pattern: /\blever(?:age|aging|aged)\b/i },
  { label: "synergy", pattern: /\bsynerg\w*/i },
  { label: "dynamic", pattern: /\bdynamic\b/i },
  { label: "fast-paced", pattern: /\bfast[- ]paced\b/i },
  { label: "proven track record", pattern: /\btrack record\b/i },
  { label: "results-driven", pattern: /\bresults[- ]driven\b/i },
  { label: "team player", pattern: /\bteam player\b/i },
  { label: "hit the ground running", pattern: /\bhit the ground running\b/i },
  { label: "perfect fit", pattern: /\b(?:perfect|great|ideal|strong|excellent) fit\b/i },
  { label: "unique blend", pattern: /\bunique (?:blend|combination|mix)\b/i },
  { label: "delve", pattern: /\bdelv(?:e|es|ing)\b/i },
  { label: "tapestry", pattern: /\btapestry\b/i },
  { label: "testament", pattern: /\btestament\b/i },
  { label: "furthermore", pattern: /\b(?:furthermore|moreover)\b/i },
  { label: "in today's world", pattern: /\bin today['’]s\b/i },
  { label: "I am confident", pattern: /\bI(?: am|['’]m) confident (?:that )?(?:I|my)\b/i },
  { label: "cutting-edge", pattern: /\bcutting[- ]edge\b/i },
  { label: "spearheaded", pattern: /\bspearhead\w*/i },
  { label: "wear many hats", pattern: /\bwear(?:ing)? many hats\b/i },
  { label: "make a meaningful impact", pattern: /\bmeaningful (?:impact|contribution)\b/i },
];

const IRREGULAR_PAST: ReadonlySet<string> = new Set([
  "led", "built", "wrote", "drove", "ran", "oversaw",
]);

export const UNBACKED: readonly { label: string; pattern: RegExp }[] = [
  { label: "taught me", pattern: /\btaught me\b/i },
  { label: "I learned", pattern: /\bI(?:['’]ve)? learned\b/i },
  { label: "I realized", pattern: /\bI(?:['’]ve)? reali[sz]ed\b/i },
  { label: "in hindsight", pattern: /\bin hindsight\b/i },
  { label: "looking back", pattern: /\blooking back\b/i },
  {
    label: "for the last few years",
    pattern: /\b(?:for|over|in) the (?:last|past) (?:few|several|many|couple of) (?:years|months)\b/i,
  },
  { label: "daily", pattern: /\b(?:daily|every day|day[- ]to[- ]day)\b/i },
];

const STRONG_VERBS: readonly (readonly string[])[] = [
  ["lead", "led", "leading", "leads"],
  ["own", "owned", "owning", "owns"],
  ["build", "built", "building", "builds"],
  ["write", "wrote", "written", "writing", "writes"],
  ["design", "designed", "designing"],
  ["architect", "architected", "architecting"],
  ["launch", "launched", "launching"],
  ["create", "created", "creating"],
  ["founded", "co-founded", "cofounded"],
  ["drive", "drove", "driven", "driving"],
  ["manage", "managed", "managing"],
  ["publish", "published", "publishing"],
  ["develop", "developed", "developing"],
  ["deliver", "delivered", "delivering"],
  ["ship", "shipped", "shipping"],
  ["implement", "implemented", "implementing"],
  ["establish", "established"],
  ["author", "authored"],
  ["ran"],
  ["oversee", "oversaw", "overseeing", "overseen"],
  ["engineer", "engineered"],
  ["spearhead", "spearheaded"],
];
const CLAIMS: ReadonlySet<string> = new Set(
  STRONG_VERBS.flat().filter((form) => /(?:ed|en)$/.test(form) || IRREGULAR_PAST.has(form)),
);
const LEADING: ReadonlySet<string> = new Set([
  "led", "owned", "managed", "ran", "oversaw", "spearheaded",
]);
const VERB_GROUP = new Map<string, number>(
  STRONG_VERBS.flatMap((forms, group) => forms.map((form): [string, number] => [form, group])),
);
const SUPPORT =
  "help(?:ed|ing|s)?|assist(?:ed|ing|s)?|support(?:ed|ing|s)?|contribut(?:ed|ing|es)|" +
  "participat(?:ed|ing|es)|took part|was involved|were involved|" +
  "worked (?:closely )?(?:on|with|alongside)|shadow(?:ed|ing)";
const WEAK_ROLE = new RegExp(`\\b(?:${SUPPORT})\\b`, "i");
const WEAK_START = new RegExp(`^(?:I\\s+)?(?:${SUPPORT})\\b`, "i");
const STOP = new Set(
  (
    "the and for with from into that this then than them they their our your you was were are " +
    "has have had its his her who what when where which while about after before over under " +
    "also more most some such very can will would could should just only each every all any"
  ).split(" "),
);
const MIN_SHARED_WORDS = 2;

export type Upgrade = {
  verb: string;
  line: string;
};

export function wordCount(text: string): number {
  return text.match(WORD)?.length ?? 0;
}

export function sentencesOf(text: string): string[] {
  return text
    .split(SENTENCE_BREAK)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function lowerWords(text: string): string[] {
  return text.toLowerCase().match(/[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*/gu) ?? [];
}

const ENGLISH: NumberLangs = ["en"];

const isBlank = (value: string, langs: NumberLangs) =>
  BLANK_WORDS.test(value) || foreignOf(langs).some((lang) => FOREIGN_BLANK_WORDS[lang].test(value));

export function unwrapKnown(text: string, sources: readonly string[], langs: NumberLangs = ENGLISH): string {
  const haystack = sources.join("\n").toLowerCase();
  return text.replace(PLACEHOLDER, (match: string, inner: string) => {
    const value = oneLine(inner);
    if (!value || isBlank(value, langs)) return match;
    if (/\d/.test(value)) return hasInventedNumbers(value, sources, langs) ? match : value;
    return value.length >= 3 && haystack.includes(value.toLowerCase()) ? value : match;
  });
}

const scansOf = (phrases: readonly Phrase[]) =>
  phrases.map(({ label, pattern }) => ({ label, scan: new RegExp(pattern.source, `${pattern.flags}g`) }));
const CLICHE_SCANS = scansOf(CLICHES);
const FOREIGN_CLICHE_SCANS = {
  es: scansOf(FOREIGN_CLICHES.es),
  pt: scansOf(FOREIGN_CLICHES.pt),
  fr: scansOf(FOREIGN_CLICHES.fr),
  de: scansOf(FOREIGN_CLICHES.de),
};
const NEXT_WORD = /^[\s-]+([\p{L}\p{N}]+)/u;

function spaced(text: string): string {
  return ` ${(text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).join(" ")} `;
}

// A stock word inside a term the resume itself uses ("dynamic pricing") is the person's own.
function ownTerm(text: string, hit: RegExpExecArray, sources: () => string): boolean {
  const next = NEXT_WORD.exec(text.slice(hit.index + hit[0].length))?.[1];
  if (!next || next.length < 3 || STOP.has(next.toLowerCase())) return false;
  return sources().includes(spaced(`${hit[0]} ${next}`));
}

// English stock phrases are checked in every language, as a model can slip into them.
export function clichesIn(
  text: string,
  sources: readonly string[] = [],
  langs: NumberLangs = ENGLISH,
): string[] {
  let joined: string | undefined;
  const haystack = () => (joined ??= spaced(sources.join("\n")));
  const scans = [...CLICHE_SCANS, ...foreignOf(langs).flatMap((lang) => FOREIGN_CLICHE_SCANS[lang])];
  return scans.filter(({ scan }) =>
    Array.from(text.matchAll(scan)).some((hit) => !ownTerm(text, hit, haystack)),
  ).map(({ label }) => label);
}

export function unbackedIn(
  text: string,
  sources: readonly string[] = [],
  langs: NumberLangs = ENGLISH,
): string[] {
  const claims = sentencesOf(text).filter((sentence) => !/\[[^\]\n]*\]/.test(sentence));
  const phrases = [...UNBACKED, ...foreignOf(langs).flatMap((lang) => FOREIGN_UNBACKED[lang])];
  return phrases.filter(
    ({ pattern }) =>
      claims.some((sentence) => pattern.test(sentence)) &&
      !sources.some((source) => pattern.test(source)),
  ).map(({ label }) => label);
}

export function dropClichedSentences(
  paragraphs: readonly string[],
  minWords: number,
  sources: readonly string[] = [],
  langs: NumberLangs = ENGLISH,
): { paragraphs: string[]; dropped: number } {
  let dropped = 0;
  const kept = paragraphs
    .map((paragraph) =>
      sentencesOf(paragraph)
        .filter((sentence) => {
          const cliched = clichesIn(sentence, sources, langs).length > 0;
          if (cliched) dropped += 1;
          return !cliched;
        })
        .join(" "),
    )
    .filter((paragraph) => paragraph.trim() !== "");
  if (dropped === 0 || wordCount(kept.join(" ")) < minWords) {
    return { paragraphs: [...paragraphs], dropped: 0 };
  }
  return { paragraphs: kept, dropped };
}

function contentWords(text: string): Set<string> {
  return new Set(
    lowerWords(text).filter(
      (word) => word.length >= 3 && !STOP.has(word) && !VERB_GROUP.has(word),
    ),
  );
}

export function upgradedVerbs(text: string, lines: readonly string[]): Upgrade[] {
  const sourceLines = lines
    .map((line) => {
      const clean = oneLine(line);
      const groups = new Set(lowerWords(clean).map((word) => VERB_GROUP.get(word)));
      return { line: clean, words: contentWords(clean), groups, weak: WEAK_START.test(clean) };
    })
    .filter((entry) => entry.line !== "");
  const found: Upgrade[] = [];
  const seen = new Set<string>();
  for (const sentence of sentencesOf(text)) {
    const verbs = [...new Set(lowerWords(sentence).filter((word) => CLAIMS.has(word)))];
    if (verbs.length === 0) continue;
    const words = contentWords(sentence);
    const related = sourceLines
      .map((entry) => ({
        entry,
        shared: [...entry.words].filter((word) => words.has(word)).length,
      }))
      .filter(({ shared }) => shared >= MIN_SHARED_WORDS)
      .sort((a, b) => b.shared - a.shared)
      .map(({ entry }) => entry);
    const [closest] = related;
    const weak = related.find((entry) => entry.weak);
    for (const verb of verbs) {
      const backed = related.some((entry) => entry.groups.has(VERB_GROUP.get(verb)));
      const line = weak ?? (LEADING.has(verb) ? closest : undefined);
      if (seen.has(verb) || backed || !line) continue;
      seen.add(verb);
      found.push({ verb, line: line.line });
    }
  }
  return found;
}

export function droppedSupport(source: string, output: string): boolean {
  return WEAK_ROLE.test(source) && !WEAK_ROLE.test(output);
}

export function verbsAdded(source: string, output: string): string[] {
  if (!WEAK_ROLE.test(source)) return [];
  const groups = new Set(lowerWords(source).map((word) => VERB_GROUP.get(word)));
  const added = lowerWords(output).filter(
    (word) => CLAIMS.has(word) && !groups.has(VERB_GROUP.get(word)),
  );
  return [...new Set(added)];
}

export function clipToWords(paragraphs: readonly string[], maxWords: number): string[] {
  let total = 0;
  const out: string[] = [];
  for (const paragraph of paragraphs) {
    const kept: string[] = [];
    for (const sentence of sentencesOf(paragraph)) {
      const words = wordCount(sentence);
      if (total + words > maxWords && total > 0) {
        return kept.length ? [...out, kept.join(" ")] : out;
      }
      kept.push(sentence);
      total += words;
    }
    if (kept.length) out.push(kept.join(" "));
  }
  return out;
}

export type ProseCheck = {
  paragraphs: string[];
  words: number;
  cliches: string[];
  upgrades: Upgrade[];
  unbacked: string[];
  maskedNumbers: number;
  placeholders: string[];
};

export function checkProse(
  paragraphs: readonly string[],
  sources: readonly string[],
  resumeLines: readonly string[],
  langs: NumberLangs = ENGLISH,
): ProseCheck {
  const cleaned = paragraphs.map(oneLine).filter((paragraph) => /[\p{L}\p{N}]/u.test(paragraph));
  const unwrapped = cleaned.map((paragraph) => unwrapKnown(paragraph, sources, langs));
  const masked = unwrapped.map((paragraph) => maskInventedNumbers(paragraph, sources, langs));
  const before = unwrapped.join(" ").split(NUMBER_PLACEHOLDER).length;
  const text = masked.join("\n\n");
  return {
    paragraphs: masked,
    words: wordCount(text),
    cliches: clichesIn(text, sources, langs),
    upgrades: upgradedVerbs(text, resumeLines),
    unbacked: unbackedIn(text, sources, langs),
    maskedNumbers: text.split(NUMBER_PLACEHOLDER).length - before,
    placeholders: placeholdersIn(text),
  };
}

export function retryNotes(check: ProseCheck, range: { min: number; max: number }): string[] {
  const notes: string[] = [];
  if (check.cliches.length) {
    const phrases = check.cliches.map((phrase) => `"${phrase}"`).join(", ");
    notes.push(`Don't use these stock phrases: ${phrases}.`);
  }
  for (const upgrade of check.upgrades) {
    notes.push(
      `You wrote "${upgrade.verb}", but the resume line says: "${upgrade.line}". ` +
        "Use the resume's own verb for that work.",
    );
  }
  if (check.unbacked.length) {
    const phrases = check.unbacked.map((phrase) => `"${phrase}"`).join(", ");
    notes.push(
      `Don't write lessons, reasons or time spans the resume doesn't state (${phrases}). ` +
        "Leave a [blank] for the person instead.",
    );
  }
  if (check.maskedNumbers > 0) {
    notes.push("Use only numbers that appear in the resume, written as they are there.");
  }
  if (check.words > range.max) notes.push(`Keep it under ${range.max} words.`);
  if (check.words < range.min) notes.push(`Write at least ${range.min} words.`);
  return notes;
}

export function problemScore(check: ProseCheck, range: { min: number; max: number }): number {
  const length = check.words > range.max || check.words < range.min ? 1 : 0;
  return (
    check.cliches.length +
    check.unbacked.length +
    2 * check.upgrades.length +
    2 * check.maskedNumbers +
    length
  );
}
