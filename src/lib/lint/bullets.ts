import { listBullets } from "@/lib/resume/ops";
import { extrasOf, type Resume } from "@/lib/resume/schema";
import { punctuationIssues, type EntryLine } from "./punctuation";
import type { LintContext, LintIssue, LintIssueId, LintSeverity, ResumeLint } from "./types";

// Runs on every keystroke for every line: one tokenizing pass per line, word lists indexed at load.

const TOO_LONG_WORDS = 32;
const TOO_LONG_CHARS = 220;
const TOO_SHORT_WORDS = 5;
// A percentage keeps the similarity math in exact integers.
const NEAR_DUPLICATE_PERCENT = 85;
const NEAR_DUPLICATE_MIN_TOKENS = 4;
const MAX_LISTED_PHRASES = 3;

// Word lists are reviewed by hand, so keep each sorted. In phrases a space also matches a hyphen.

// Phrases recruiters skim past because nearly every resume has them.
const STOCK_PHRASES = [
  "above and beyond",
  "attention to detail",
  "best in class",
  "best of breed",
  "cutting edge",
  "detail oriented",
  "duties include",
  "duties included",
  "excellent communication skills",
  "excellent communicator",
  "excellent interpersonal skills",
  "excellent written and verbal communication skills",
  "fast paced environment",
  "fast paced environments",
  "go getter",
  "goal oriented",
  "good communication skills",
  "great communication skills",
  "hard worker",
  "hard working",
  "hardworking",
  "highly motivated",
  "hit the ground running",
  "innovative solutions",
  "move the needle",
  "moved the needle",
  "outside the box",
  "passionate about",
  "people person",
  "proven track record",
  "responsibilities include",
  "responsibilities included",
  "responsible for",
  "result driven",
  "result oriented",
  "results driven",
  "results focused",
  "results oriented",
  "rockstar",
  "seasoned professional",
  "self motivated",
  "self starter",
  "strategic thinker",
  "strong communication skills",
  "strong work ethic",
  "synergies",
  "synergize",
  "synergy",
  "team oriented",
  "team player",
  "team players",
  "think outside the box",
  "thinking outside the box",
  "thought leader",
  "thrive under pressure",
  "thrives under pressure",
  "track record of success",
  "value add",
  "wear many hats",
  "wearing many hats",
  "wore many hats",
  "work well under pressure",
  "works well under pressure",
  "world class",
];

// Openers that read like a job description: the duty, not what the person did with it.
const DUTY_STARTS = [
  "duties include",
  "duties included",
  "in charge of",
  "responsibilities include",
  "responsibilities included",
  "responsible for",
  "tasked with",
  "was in charge of",
  "was responsible for",
  "was tasked with",
  "were responsible for",
  "worked on",
  "working on",
];

// Openers that describe a supporting role or filler instead of what the person did.
const WEAK_STARTS = [
  "assisted",
  "assisted in",
  "assisted with",
  "assisting",
  "did",
  "handled",
  "handling",
  "helped",
  "helped with",
  "helping",
  "involved in",
  "participated in",
  "took part in",
  "was",
  "was involved in",
  "was part of",
  "were",
  "were involved in",
  "worked with",
];

// Words that say what changed. A line with none of these and no number lists an activity.
const RESULT_WORDS = wordSet(`
  accelerated accelerating achieved avoided boosted boosting cheaper converted cut cutting
  decreased decreasing doubled drove driving earned eliminated eliminating enabled enabling
  exceeded expanded expanding faster fewer generated generating grew growing halved higher
  improved improving increased increasing lifted lifting lowered lowering maximized minimized
  outperformed prevented preventing quadrupled quicker raised raising recovered reduced reducing
  resulted resulting retained saved saving secured shortened shrank slashed sped surpassed
  tripled won winning
`);
// Two-word results: "used by 300 agents", "adopted by 4 teams", "leading to fewer refunds".
const RESULT_PHRASES = indexPhrases([
  "adopted by",
  "brought in",
  "leading to",
  "led to",
  "so that",
  "used by",
  "used in",
]);
// A short line that opens with one of these and has a number is a result with no "how".
const RESULT_OPENERS = wordSet(`
  boosted cut decreased doubled drove generated grew halved improved increased lifted lowered
  raised reduced saved tripled
`);
const METHOD_WORDS = wordSet("after through using via with");
const NO_METHOD_MAX_WORDS = 7;

// As "base:past" (regular ones get "-ed"). Left out: words that open a line as a noun or adjective
// as often as a verb ("Lead developer…", "Design system…", "Support engineer…").
const TENSE_VERBS = `
  administer analyse analyze answer assess assist automate build:built close coach collaborate
  communicate compile conduct configure coordinate create debug deliver deploy develop document
  draft drive:drove edit establish evaluate fix generate greet grow:grew guide handle help hire
  identify implement improve increase install integrate interview launch maintain manage map:mapped
  mentor migrate monitor negotiate operate optimise optimize organise organize oversee:oversaw own
  perform prepare present produce provide publish recruit reduce refactor resolve rewrite:rewrote
  run:ran schedule sell:sold serve ship:shipped streamline supervise teach:taught track train
  troubleshoot tutor write:wrote work
`;
const PAST_OF = indexTenses(TENSE_VERBS);

// "and more" and "tons of" are left out on purpose: "and more than 200 clinics", "40 tons of
// produce".
const VAGUE_COUNTS = [
  "a bunch of",
  "a lot",
  "a lot of",
  "a number of",
  "a variety of",
  "countless",
  "lots of",
  "many",
  "multiple",
  "numerous",
  "several",
  "various",
];
const VAGUE_LISTS = ["and so forth", "and so on", "et cetera", "etc"];
const VAGUE_THINGS = ["stuff", "things"];

function wordSet(list: string): ReadonlySet<string> {
  return new Set(list.trim().split(/\s+/));
}

const FIRST_PERSON = wordSet("i me my myself our ours ourselves we");
const TEAM_PRONOUNS = wordSet("our ours ourselves we");

const NUMBER_WORDS = wordSet(`
  billion billions double doubled dozen dozens eight eighteen eighty eleven fifteen fifty
  five forty four fourteen half halved hundred hundreds million millions nine nineteen ninety
  one percent quadrupled seven seventeen seventy six sixteen sixty ten thirteen thirty
  thousand thousands three triple tripled twelve twenty twice two zero
`);

const PASSIVE_AUXILIARIES = wordSet("been being was were");
// Common irregular participles; regular ones are caught by their "-ed" ending.
const IRREGULAR_PARTICIPLES = wordSet(`
  begun bought broken brought built caught done drawn driven found given grown held hidden
  kept led made paid rebuilt rewritten run seen sent shown sold spent taken taught thrown
  told undertaken written
`);
// Adjectival "-ed" words ("was based in") and earned honors ("was promoted"), where passive is
// natural.
const NOT_PASSIVE = wordSet(`
  accepted admitted adopted appointed awarded based certified cited commended committed
  concerned credited dedicated elected entrusted excited experienced featured focused granted
  hired honored honoured interested invited involved located motivated named nominated
  pleased praised promoted published qualified ranked recognised recognized selected
  shortlisted skilled sponsored supposed talented tired trusted voted
`);

// Words that put a roman numeral "I" after them: "Phase I", "Type I diabetes", "World War I".
const ROMAN_NUMERAL_CONTEXT = wordSet(`
  act article book category chapter class division gen generation grade level mark module
  part phase round schedule season section series stage step tier title type unit vol volume
  war
`);

const SEVERITY: Record<LintIssueId, LintSeverity> = {
  "stock-phrase": "high",
  duty: "high",
  "no-result": "high",
  "weak-start": "high",
  "first-person": "high",
  "too-long": "high",
  // A line that already says what changed reads fine without its size; low keeps "Add a number"
  // from crowding out real problems.
  "no-number": "low",
  "no-method": "low",
  tense: "low",
  "too-short": "low",
  passive: "low",
  vague: "low",
  duplicate: "low",
  punctuation: "low",
};
// Breaks ties within a severity, and decides which issue keeps words two matches share.
const PRIORITY: readonly LintIssueId[] = [
  "duty",
  "weak-start",
  "stock-phrase",
  "first-person",
  "no-result",
  "too-long",
  "tense",
  "passive",
  "vague",
  "no-number",
  "no-method",
  "too-short",
  "duplicate",
  "punctuation",
];
// Whole-line issues (no match to point at) sort after the ones that point at specific words.
const WHOLE_LINE = Number.MAX_SAFE_INTEGER;

const WORK: LintContext = { kind: "work" };
const OTHER: LintContext = { kind: "other" };
const NO_RESULT_MESSAGE =
  "What changed because of this? Add the result, and how much if you know it.";
const NO_NUMBER_MESSAGE = "How many, how much, or how fast? Add a number if you know it.";
const NO_METHOD_MESSAGE = "Say how you did it: what did you build, change or run?";
const TOO_SHORT_MESSAGE = "This line is too short to show much. Add what you did and what changed.";
const DUPLICATE_MESSAGE =
  "This line repeats another one. Keep one, or make each say something new.";

const WORD = /[\p{L}\p{M}\p{N}]+/gu;
const CONTENT = /[\p{L}\p{N}]/u;
const NUMERIC = /[\p{N}%\p{Sc}]/u;
const PHRASE_GAP = /^[\s\-‐‑]+$/u;
const SPACES = /^\s+$/u;
const HYPHEN = /[-‐‑]/u;
// "I/O", "i.e.", "I-9": glued to more letters or digits, so not the pronoun.
const GLUED_AFTER = /^[/.\-‐‑][\p{L}\p{N}]/u;
// "Phase I and II", "Levels I-III", "I/II"
const NUMERAL_SEQUENCE = /^\s*(?:[/&,\-‐‑–]|and|or|to|through)\s*(?:I{2,3}|IV|VI{0,3}|IX|X)\b/;

type Token = { text: string; lower: string; start: number; end: number };
type Span = { start: number; end: number; text: string; key: string; tokens: number };
type VagueKind = "count" | "list" | "thing";

const STOCK_INDEX = indexPhrases(STOCK_PHRASES);
const WEAK_START_INDEX = indexPhrases(WEAK_STARTS);
const DUTY_INDEX = indexPhrases(DUTY_STARTS);
const VAGUE_INDEX = indexPhrases([...VAGUE_COUNTS, ...VAGUE_LISTS, ...VAGUE_THINGS]);
const VAGUE_KIND = new Map<string, VagueKind>([
  ...VAGUE_COUNTS.map((phrase) => [phrase, "count"] as const),
  ...VAGUE_LISTS.map((phrase) => [phrase, "list"] as const),
  ...VAGUE_THINGS.map((phrase) => [phrase, "thing"] as const),
]);

function indexPhrases(phrases: readonly string[]): ReadonlyMap<string, readonly string[][]> {
  const index = new Map<string, string[][]>();
  for (const phrase of phrases) {
    const words = phrase.split(" ");
    const first = words[0] ?? "";
    index.set(first, [...(index.get(first) ?? []), words]);
  }
  // Longest first, so "assisted with" wins over "assisted".
  for (const list of index.values()) list.sort((a, b) => b.length - a.length);
  return index;
}

function fold(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase();
}

function tokenize(text: string): Token[] {
  return Array.from(text.matchAll(WORD), (match) => ({
    text: match[0],
    lower: fold(match[0]),
    start: match.index,
    end: match.index + match[0].length,
  }));
}

function spanOf(first: Token, last: Token, text: string, tokens: number): Span {
  const matched = text.slice(first.start, last.end);
  return { start: first.start, end: last.end, text: matched, key: fold(matched), tokens };
}

function phraseAt(
  tokens: readonly Token[],
  i: number,
  text: string,
  index: ReadonlyMap<string, readonly string[][]>,
): Span | null {
  const first = tokens[i];
  if (!first) return null;
  for (const words of index.get(first.lower) ?? []) {
    let last = first;
    let fits = true;
    for (let offset = 1; fits && offset < words.length; offset++) {
      const token = tokens[i + offset];
      fits =
        token !== undefined &&
        token.lower === words[offset] &&
        PHRASE_GAP.test(text.slice(last.end, token.start));
      if (token) last = token;
    }
    if (fits) return { ...spanOf(first, last, text, words.length), key: words.join(" ") };
  }
  return null;
}

function findPhrases(
  tokens: readonly Token[],
  text: string,
  index: ReadonlyMap<string, readonly string[][]>,
): Span[] {
  const spans: Span[] = [];
  for (let i = 0; i < tokens.length;) {
    const span = phraseAt(tokens, i, text, index);
    if (span) spans.push(span);
    i += span ? span.tokens : 1;
  }
  return spans;
}

// Where the line's first real word is: past list numbering ("1. Helped…") and a leading "I" or
// "We", which is its own issue while the verb after it still counts.
function openerIndex(tokens: readonly Token[], text: string): number {
  let i = 0;
  const first = tokens[0];
  if (
    first &&
    /^\p{N}+$/u.test(first.text) &&
    /^[.)]\s/u.test(text.slice(first.end, first.end + 2))
  ) {
    i = 1;
  }
  const pronoun = tokens[i];
  if (pronoun && (pronoun.lower === "i" || pronoun.lower === "we")) i += 1;
  return i;
}

function opener(
  tokens: readonly Token[],
  text: string,
  index: ReadonlyMap<string, readonly string[][]>,
): Span[] {
  const span = phraseAt(tokens, openerIndex(tokens, text), text, index);
  return span ? [span] : [];
}

function indexTenses(list: string): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  for (const entry of list.trim().split(/\s+/)) {
    const [base = "", irregular] = entry.split(":");
    const stem = /[^aeiou]y$/.test(base) ? base.slice(0, -1) : base;
    const past =
      irregular ?? (base.endsWith("e") ? `${base}d` : stem === base ? `${base}ed` : `${stem}ied`);
    // One short vowel before a final consonant doubles it: run -> running, ship -> shipping.
    const doubled = /^[^aeiou]+[aeiou][^aeiouwxy]$/.test(base);
    const gerund = doubled
      ? `${base}${base.slice(-1)}ing`
      : /[^e]e$/.test(base)
        ? `${base.slice(0, -1)}ing`
        : `${base}ing`;
    const third = /(?:s|sh|ch|x|z|o)$/.test(base)
      ? `${base}es`
      : stem === base
        ? `${base}s`
        : `${stem}ies`;
    for (const form of [base, third, gerund]) map.set(form, past);
  }
  return map;
}

// "Build internal tools…" under a job that ended: the verb is the line's first real word.
function tenseSpan(tokens: readonly Token[], text: string): { span: Span; past: string } | null {
  const token = tokens[openerIndex(tokens, text)];
  const past = token ? PAST_OF.get(token.lower) : undefined;
  if (!token || !past || past === token.lower) return null;
  return { span: spanOf(token, token, text, 1), past };
}

function resultMarker(tokens: readonly Token[], text: string): Span | null {
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token) continue;
    if (RESULT_WORDS.has(token.lower)) return spanOf(token, token, text, 1);
    const phrase = phraseAt(tokens, i, text, RESULT_PHRASES);
    if (phrase) return phrase;
  }
  return null;
}

// "by" before a number is the measure ("by 20%"); before anything else it's the method.
function lacksMethod(tokens: readonly Token[], text: string): boolean {
  const first = tokens[openerIndex(tokens, text)];
  const words = countWords(text);
  // Under five words "too short" already asks for more.
  if (!first || !RESULT_OPENERS.has(first.lower)) return false;
  if (words > NO_METHOD_MAX_WORDS || words < TOO_SHORT_WORDS) return false;
  return !tokens.some((token, k) => {
    if (METHOD_WORDS.has(token.lower)) return true;
    if (k > 0 && token.lower.length > 4 && token.lower.endsWith("ing")) return true;
    const next = tokens[k + 1];
    return token.lower === "by" && next !== undefined && !/^\p{N}/u.test(next.text);
  });
}

function isNumeralI(tokens: readonly Token[], k: number, text: string): boolean {
  const token = tokens[k];
  if (!token || token.text !== "I") return false;
  const rest = text.slice(token.end);
  if (NUMERAL_SEQUENCE.test(rest)) return true;
  const prev = tokens[k - 1];
  if (!prev) return false;
  const gap = text.slice(prev.end, token.start);
  // "Phase I", "Phases I", "Vol. I", "Type-I"
  const singular = prev.lower.replace(/s$/, "");
  const context = ROMAN_NUMERAL_CONTEXT.has(prev.lower) || ROMAN_NUMERAL_CONTEXT.has(singular);
  if (context && /^\.?[\s\-‐‑]+$/u.test(gap)) return true;
  // Course names: "Calculus I". "Bob and I." stays a pronoun because "and" is lowercase.
  return /^ +$/.test(gap) && /^\p{Lu}/u.test(prev.text) && /^\s*(?:[,.;:)\]]|$)/.test(rest);
}

function firstPerson(tokens: readonly Token[], text: string): Span[] {
  const hasLowercase = /\p{Ll}/u.test(text);
  const spans: Span[] = [];
  tokens.forEach((token, k) => {
    if (!FIRST_PERSON.has(token.lower)) return;
    if (GLUED_AFTER.test(text.slice(token.end, token.end + 2))) return;
    if (isNumeralI(tokens, k, text)) return;
    // All-caps "ME" or "MY" inside normal text is an abbreviation (Maine, Malaysia), not a pronoun.
    if (token.lower !== "i" && hasLowercase && token.text === token.text.toUpperCase()) return;
    spans.push(spanOf(token, token, text, 1));
  });
  return spans;
}

function isParticiple(word: string): boolean {
  if (NOT_PASSIVE.has(word)) return false;
  if (IRREGULAR_PARTICIPLES.has(word)) return true;
  // "need", "speed", "exceed" end in "-ed" but aren't participles.
  return word.length >= 4 && word.endsWith("ed") && !word.endsWith("eed");
}

// Conservative on purpose: "was/were/been/being", an optional "-ly" adverb, then a participle.
function passives(tokens: readonly Token[], text: string): Span[] {
  const spaced = (a: Token, b: Token) => SPACES.test(text.slice(a.end, b.start));
  const spans: Span[] = [];
  tokens.forEach((aux, k) => {
    if (!PASSIVE_AUXILIARIES.has(aux.lower)) return;
    let j = k + 1;
    const adverb = tokens[j];
    if (adverb && /^\p{L}{3,}ly$/u.test(adverb.lower) && spaced(aux, adverb)) j += 1;
    const verb = tokens[j];
    const before = tokens[j - 1];
    if (verb && before && spaced(before, verb) && isParticiple(verb.lower)) {
      spans.push(spanOf(aux, verb, text, j - k + 1));
    }
  });
  return spans;
}

function vagueSpans(tokens: readonly Token[], text: string): Span[] {
  return (
    findPhrases(tokens, text, VAGUE_INDEX)
      // "many-to-many", "multiple-choice": hyphenated compounds are terms, not filler.
      .filter((span) => !HYPHEN.test(text.charAt(span.start - 1) + text.charAt(span.end)))
      .map((span) =>
        span.key === "etc" && text.charAt(span.end) === "."
          ? { ...span, end: span.end + 1, text: `${span.text}.` }
          : span,
      )
  );
}

function quoteList(items: readonly string[]): string {
  const quoted = items.map((item) => `"${item}"`);
  if (quoted.length < 2) return quoted.join("");
  return `${quoted.slice(0, -1).join(", ")} and ${quoted[quoted.length - 1] ?? ""}`;
}

function stockMessage(_first: Span, spans: readonly Span[]): string {
  const distinct = [...new Map(spans.map((span) => [span.key, span.text])).values()];
  const listed = distinct.slice(0, MAX_LISTED_PHRASES);
  const verb = listed.length === 1 ? "is a phrase" : "are phrases";
  return `${quoteList(listed)} ${verb} recruiters skip. Show the result instead.`;
}

function weakStartMessage(span: Span): string {
  return `Swap "${span.text}" for what you did, like "Built", "Cut" or "Led".`;
}

function dutyMessage(span: Span): string {
  return `"${span.text}" reads like a job description. Say what you did and what changed.`;
}

function tenseMessage(span: Span, past: string): string {
  const word = /^\p{Lu}/u.test(span.text) ? past.charAt(0).toUpperCase() + past.slice(1) : past;
  return `This job has ended, so write "${word}", not "${span.text}".`;
}

function noNumberMessage(marker: Span): string {
  return /^\p{L}+$/u.test(marker.text) && marker.tokens === 1
    ? `"${marker.text}" by how much, or for how many? Add a number if you know it.`
    : NO_NUMBER_MESSAGE;
}

function firstPersonMessage(span: Span): string {
  return TEAM_PRONOUNS.has(span.key)
    ? `"${span.text}" hides your part. Say what you did.`
    : `Drop "${span.text}". Resume lines leave out I, me and my.`;
}

function passiveMessage(span: Span): string {
  return `"${span.text}" hides who did it. Say what you did instead.`;
}

function vagueMessage(span: Span): string {
  const kind = VAGUE_KIND.get(span.key);
  if (kind === "list") return `"${span.text}" is vague. Name what matters, or cut it.`;
  if (kind === "thing") return `"${span.text}" is vague. Say exactly what.`;
  return `"${span.text}" is vague. Give the real number.`;
}

function tooLongMessage(size: string): string {
  return `This line has ${size}. Trim it to two lines so it's easy to skim.`;
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((chunk) => CONTENT.test(chunk)).length;
}

type Analysis = { issues: LintIssue[]; hasContent: boolean; hasNumber: boolean; words: string[] };
type Ranked = { issue: LintIssue; position: number };

function rank({ issue, position }: Ranked): [number, number, number] {
  return [issue.severity === "high" ? 0 : 1, position, PRIORITY.indexOf(issue.id)];
}

function overlaps(a: Span, b: Span): boolean {
  return a.start < b.end && b.start < a.end;
}

function analyze(text: string, context: LintContext = WORK): Analysis {
  // Nothing to lint in an empty line or a lone "-" someone just typed.
  if (!CONTENT.test(text)) return { issues: [], hasContent: false, hasNumber: false, words: [] };
  const tokens = tokenize(text);

  const found: Ranked[] = [];
  const claimed: Span[] = [];
  const add = (id: LintIssueId, message: string, match: string | null, position: number) => {
    found.push({ issue: { id, severity: SEVERITY[id], message, match }, position });
  };
  // At most one issue per id, so callers can key by id. Words an earlier id matched are taken.
  const claim = (
    id: LintIssueId,
    spans: readonly Span[],
    message: (first: Span, free: readonly Span[]) => string,
  ) => {
    const free = spans.filter((span) => !claimed.some((taken) => overlaps(span, taken)));
    const [first] = free;
    if (!first) return false;
    claimed.push(...free);
    add(id, message(first, free), first.text, first.start);
    return true;
  };

  const duty = claim("duty", opener(tokens, text, DUTY_INDEX), dutyMessage);
  claim("weak-start", opener(tokens, text, WEAK_START_INDEX), weakStartMessage);
  claim("stock-phrase", findPhrases(tokens, text, STOCK_INDEX), stockMessage);
  claim("first-person", firstPerson(tokens, text), firstPersonMessage);
  if (context.ended) {
    const tense = tenseSpan(tokens, text);
    if (tense) claim("tense", [tense.span], (span) => tenseMessage(span, tense.past));
  }
  claim("passive", passives(tokens, text), passiveMessage);
  claim("vague", vagueSpans(tokens, text), vagueMessage);

  const hasNumber = NUMERIC.test(text) || tokens.some((token) => NUMBER_WORDS.has(token.lower));
  if (context.kind === "work") {
    const marker = hasNumber ? null : resultMarker(tokens, text);
    // A duty opener already asks what changed; saying it twice is noise.
    if (!hasNumber && !marker && !duty) add("no-result", NO_RESULT_MESSAGE, null, WHOLE_LINE);
    if (marker) add("no-number", noNumberMessage(marker), null, WHOLE_LINE);
    if (hasNumber && lacksMethod(tokens, text)) {
      add("no-method", NO_METHOD_MESSAGE, null, WHOLE_LINE);
    }
  }

  const words = countWords(text);
  const chars = text.trim().length;
  if (words > TOO_LONG_WORDS || chars > TOO_LONG_CHARS) {
    const size = words > TOO_LONG_WORDS ? `${words} words` : `${chars} characters`;
    add("too-long", tooLongMessage(size), null, WHOLE_LINE);
  } else if (context.kind === "work" && words < TOO_SHORT_WORDS) {
    // "GPA: 3.8/4.0", "Dean's List" or an award line is meant to be short.
    add("too-short", TOO_SHORT_MESSAGE, null, WHOLE_LINE);
  }

  found.sort((a, b) => {
    const [x, y] = [rank(a), rank(b)];
    return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
  });
  return {
    issues: found.map((entry) => entry.issue),
    hasContent: true,
    hasNumber,
    words: tokens.map((token) => token.lower),
  };
}

function isNearDuplicate(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap += 1;
  return overlap * 100 >= (a.size + b.size - overlap) * NEAR_DUPLICATE_PERCENT;
}

// All-pairs Jaccard with prefix filtering (Bayardo et al.): with tokens sorted rarest first, only
// sets sharing an early token are compared, keeping a 2,000-bullet resume near-linear per
// keystroke.
function markNearDuplicates(lines: readonly (readonly string[])[], into: Set<number>): void {
  type Entry = { index: number; set: Set<string>; ordered: string[] };
  const entries: Entry[] = [];
  lines.forEach((words, index) => {
    if (words.length < NEAR_DUPLICATE_MIN_TOKENS) return;
    const set = new Set(words);
    entries.push({ index, set, ordered: [...set] });
  });
  const frequency = new Map<string, number>();
  for (const entry of entries) {
    for (const token of entry.ordered) frequency.set(token, (frequency.get(token) ?? 0) + 1);
  }
  const rarity = (token: string) => frequency.get(token) ?? 0;
  for (const entry of entries) {
    entry.ordered.sort((a, b) => rarity(a) - rarity(b) || (a < b ? -1 : a > b ? 1 : 0));
  }
  entries.sort((a, b) => a.set.size - b.set.size);

  const postings = new Map<string, Entry[]>();
  for (const entry of entries) {
    const size = entry.set.size;
    const prefix = size - Math.ceil((size * NEAR_DUPLICATE_PERCENT) / 100) + 1;
    const compared = new Set<Entry>();
    for (const token of entry.ordered.slice(0, prefix)) {
      const list = postings.get(token);
      for (const other of list ?? []) {
        if (compared.has(other)) continue;
        compared.add(other);
        // Entries arrive smallest first, so `other` is never larger; too small can't reach the bar.
        if (other.set.size * 100 < size * NEAR_DUPLICATE_PERCENT) continue;
        if (isNearDuplicate(entry.set, other.set)) {
          into.add(entry.index);
          into.add(other.index);
        }
      }
      if (list) list.push(entry);
      else postings.set(token, [entry]);
    }
  }
}

function findDuplicates(lines: readonly (readonly string[])[]): Set<number> {
  const duplicates = new Set<number>();
  const byText = new Map<string, number[]>();
  lines.forEach((words, index) => {
    if (words.length === 0) return;
    const key = words.join(" ");
    const group = byText.get(key);
    if (group) group.push(index);
    else byText.set(key, [index]);
  });
  for (const group of byText.values()) {
    if (group.length > 1) for (const index of group) duplicates.add(index);
  }
  markNearDuplicates(lines, duplicates);
  return duplicates;
}

// Most important first. Without a context the line is read as possibly ongoing work.
export function lintBullet(text: string, context: LintContext = WORK): LintIssue[] {
  return analyze(text, context).issues;
}

const PRESENT = /^(?:present|current|now|today|ongoing|to date)$/i;
// A custom section could hold anything, so it gets the lighter checks.
const WORK_EXTRAS: ReadonlySet<string> = new Set(["volunteering"]);

export function hasEnded(endDate: string): boolean {
  const end = endDate.trim();
  return end !== "" && !PRESENT.test(end);
}

export function lintContexts(resume: Resume): ReadonlyMap<string, LintContext> {
  const contexts = new Map<string, LintContext>();
  for (const job of resume.experience) {
    const context: LintContext = { kind: "work", ended: hasEnded(job.endDate) };
    for (const bullet of job.bullets) contexts.set(bullet.id, context);
  }
  for (const project of resume.projects) {
    for (const bullet of project.bullets) contexts.set(bullet.id, WORK);
  }
  for (const school of resume.education) {
    for (const bullet of school.bullets) contexts.set(bullet.id, OTHER);
  }
  for (const section of extrasOf(resume)) {
    const context = WORK_EXTRAS.has(section.kind) ? WORK : OTHER;
    for (const item of section.items) {
      for (const bullet of item.bullets) contexts.set(bullet.id, context);
    }
  }
  return contexts;
}

function entryGroups(refs: ReturnType<typeof listBullets>): EntryLine[][] {
  const groups = new Map<string, EntryLine[]>();
  for (const ref of refs) {
    if (ref.section !== "experience" && ref.section !== "projects") continue;
    const key = `${ref.section}:${ref.parentId}`;
    const group = groups.get(key) ?? [];
    group.push({ id: ref.bulletId, text: ref.text });
    groups.set(key, group);
  }
  return [...groups.values()];
}

// Also adds "duplicate" across the resume and "punctuation" within each entry. Hidden lines never
// print, so they don't count in totals, duplicates or full stops.
export function lintResume(resume: Resume): ResumeLint {
  const contexts = lintContexts(resume);
  const refs = listBullets(resume);
  const lines = refs.map((ref) => ({
    id: ref.bulletId,
    ...analyze(ref.text, contexts.get(ref.bulletId) ?? WORK),
  }));
  const duplicates = findDuplicates(lines.map((line) => line.words));
  const punctuation = new Map<string, LintIssue>();
  for (const group of entryGroups(refs)) {
    for (const [id, issue] of punctuationIssues(group)) punctuation.set(id, issue);
  }
  const totals = { bullets: 0, withIssues: 0, withNumbers: 0, highSeverity: 0 };
  const entries: [string, LintIssue[]][] = [];
  lines.forEach((line, index) => {
    const duplicate: LintIssue = {
      id: "duplicate",
      severity: SEVERITY.duplicate,
      message: DUPLICATE_MESSAGE,
      match: null,
    };
    // Both low and whole-line, so they always sort last.
    const pattern = punctuation.get(line.id);
    const issues = [
      ...line.issues,
      ...(duplicates.has(index) ? [duplicate] : []),
      ...(pattern ? [pattern] : []),
    ];
    entries.push([line.id, issues]);
    if (!line.hasContent) return;
    totals.bullets += 1;
    if (issues.length > 0) totals.withIssues += 1;
    if (line.hasNumber) totals.withNumbers += 1;
    if (issues.some((issue) => issue.severity === "high")) totals.highSeverity += 1;
  });
  // fromEntries defines own properties, so an id like "__proto__" can't touch the prototype.
  return { byBullet: Object.fromEntries(entries), totals };
}

// Prose, not results, so only the voice checks apply: stock phrases and first person.
export function lintSummary(summary: string): LintIssue[] {
  return analyze(summary, OTHER).issues.filter(
    (issue) => issue.id === "stock-phrase" || issue.id === "first-person",
  );
}
