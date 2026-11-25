import { indexPhrases, vagueOf, wordSet, type LintLanguage } from "./types";

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

const RESULT_WORDS = wordSet(`
  accelerated accelerating achieved avoided boosted boosting cheaper converted cut cutting
  decreased decreasing doubled drove driving earned eliminated eliminating enabled enabling
  exceeded expanded expanding faster fewer generated generating grew growing halved higher
  improved improving increased increasing lifted lifting lowered lowering maximized minimized
  outperformed prevented preventing quadrupled quicker raised raising recovered reduced reducing
  resulted resulting retained saved saving secured shortened shrank slashed sped surpassed
  tripled won winning
`);
const RESULT_PHRASES = indexPhrases([
  "adopted by",
  "brought in",
  "leading to",
  "led to",
  "so that",
  "used by",
  "used in",
]);
const RESULT_OPENERS = wordSet(`
  boosted cut decreased doubled drove generated grew halved improved increased lifted lowered
  raised reduced saved tripled
`);
const METHOD_WORDS = wordSet("after through using via with");

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

const NUMBER_WORDS = wordSet(`
  billion billions double doubled dozen dozens eight eighteen eighty eleven fifteen fifty
  five forty four fourteen half halved hundred hundreds million millions nine nineteen ninety
  one percent quadrupled seven seventeen seventy six sixteen sixty ten thirteen thirty
  thousand thousands three triple tripled twelve twenty twice two zero
`);

const PASSIVE_AUXILIARIES = wordSet("been being was were");
const IRREGULAR_PARTICIPLES = wordSet(`
  begun bought broken brought built caught done drawn driven found given grown held hidden
  kept led made paid rebuilt rewritten run seen sent shown sold spent taken taught thrown
  told undertaken written
`);
const NOT_PASSIVE = wordSet(`
  accepted admitted adopted appointed awarded based certified cited commended committed
  concerned credited dedicated elected entrusted excited experienced featured focused granted
  hired honored honoured interested invited involved located motivated named nominated
  pleased praised promoted published qualified ranked recognised recognized selected
  shortlisted skilled sponsored supposed talented tired trusted voted
`);

const ROMAN_NUMERAL_CONTEXT = wordSet(`
  act article book category chapter class division gen generation grade level mark module
  part phase round schedule season section series stage step tier title type unit vol volume
  war
`);

const ABBREVIATIONS = wordSet("al approx co corp dept etc inc jr ltd pty sr vs");

function indexTenses(list: string): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  for (const entry of list.trim().split(/\s+/)) {
    const [base = "", irregular] = entry.split(":");
    const stem = /[^aeiou]y$/.test(base) ? base.slice(0, -1) : base;
    const past =
      irregular ?? (base.endsWith("e") ? `${base}d` : stem === base ? `${base}ed` : `${stem}ied`);
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

export const en: LintLanguage = {
  lang: "en",
  openerSkips: wordSet("i we"),
  elisions: false,
  abbreviations: ABBREVIATIONS,
  stock: indexPhrases(STOCK_PHRASES),
  duty: indexPhrases(DUTY_STARTS),
  weakStart: indexPhrases(WEAK_STARTS),
  firstPerson: {
    words: wordSet("i me my myself our ours ourselves we"),
    team: wordSet("our ours ourselves we"),
  },
  result: { words: RESULT_WORDS, phrases: RESULT_PHRASES, suffixes: [], openers: RESULT_OPENERS },
  method: {
    words: METHOD_WORDS,
    phrases: new Map(),
    gerund: /^.{2,}ing$/u,
    lead: { word: "by", next: (word) => !/^\p{N}/u.test(word) },
  },
  numberWords: NUMBER_WORDS,
  vague: vagueOf({ count: VAGUE_COUNTS, list: VAGUE_LISTS, thing: VAGUE_THINGS }, ["etc"]),
  tense: { pastOf: indexTenses(TENSE_VERBS) },
  passive: {
    auxiliaries: PASSIVE_AUXILIARIES,
    irregular: IRREGULAR_PARTICIPLES,
    notPassive: NOT_PASSIVE,
  },
  romanNumeralContext: ROMAN_NUMERAL_CONTEXT,
};
