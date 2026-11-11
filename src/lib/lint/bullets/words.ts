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
export const RESULT_WORDS = wordSet(`
  accelerated accelerating achieved avoided boosted boosting cheaper converted cut cutting
  decreased decreasing doubled drove driving earned eliminated eliminating enabled enabling
  exceeded expanded expanding faster fewer generated generating grew growing halved higher
  improved improving increased increasing lifted lifting lowered lowering maximized minimized
  outperformed prevented preventing quadrupled quicker raised raising recovered reduced reducing
  resulted resulting retained saved saving secured shortened shrank slashed sped surpassed
  tripled won winning
`);
// Two-word results: "used by 300 agents", "adopted by 4 teams", "leading to fewer refunds".
export const RESULT_PHRASES = indexPhrases([
  "adopted by",
  "brought in",
  "leading to",
  "led to",
  "so that",
  "used by",
  "used in",
]);
// A short line that opens with one of these and has a number is a result with no "how".
export const RESULT_OPENERS = wordSet(`
  boosted cut decreased doubled drove generated grew halved improved increased lifted lowered
  raised reduced saved tripled
`);
export const METHOD_WORDS = wordSet("after through using via with");

// As "base:past"; verbs that open lines as nouns as often ("Lead developer…") are left out.
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
export const PAST_OF = indexTenses(TENSE_VERBS);

// Not "and more" or "tons of": "and more than 200 clinics", "40 tons of produce".
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

export const FIRST_PERSON = wordSet("i me my myself our ours ourselves we");
export const TEAM_PRONOUNS = wordSet("our ours ourselves we");

export const NUMBER_WORDS = wordSet(`
  billion billions double doubled dozen dozens eight eighteen eighty eleven fifteen fifty
  five forty four fourteen half halved hundred hundreds million millions nine nineteen ninety
  one percent quadrupled seven seventeen seventy six sixteen sixty ten thirteen thirty
  thousand thousands three triple tripled twelve twenty twice two zero
`);

export const PASSIVE_AUXILIARIES = wordSet("been being was were");
// Common irregular participles; regular ones are caught by their "-ed" ending.
export const IRREGULAR_PARTICIPLES = wordSet(`
  begun bought broken brought built caught done drawn driven found given grown held hidden
  kept led made paid rebuilt rewritten run seen sent shown sold spent taken taught thrown
  told undertaken written
`);
// Adjectival "-ed" words ("was based in") and earned honors ("was promoted") read fine passive.
export const NOT_PASSIVE = wordSet(`
  accepted admitted adopted appointed awarded based certified cited commended committed
  concerned credited dedicated elected entrusted excited experienced featured focused granted
  hired honored honoured interested invited involved located motivated named nominated
  pleased praised promoted published qualified ranked recognised recognized selected
  shortlisted skilled sponsored supposed talented tired trusted voted
`);

// Words that put a roman numeral "I" after them: "Phase I", "Type I diabetes", "World War I".
export const ROMAN_NUMERAL_CONTEXT = wordSet(`
  act article book category chapter class division gen generation grade level mark module
  part phase round schedule season section series stage step tier title type unit vol volume
  war
`);

export type VagueKind = "count" | "list" | "thing";

export const STOCK_INDEX = indexPhrases(STOCK_PHRASES);
export const WEAK_START_INDEX = indexPhrases(WEAK_STARTS);
export const DUTY_INDEX = indexPhrases(DUTY_STARTS);
export const VAGUE_INDEX = indexPhrases([...VAGUE_COUNTS, ...VAGUE_LISTS, ...VAGUE_THINGS]);
export const VAGUE_KIND = new Map<string, VagueKind>([
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
