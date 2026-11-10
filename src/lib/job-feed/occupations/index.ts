import { familyFits, roleFamily } from "../roles";
import type { OccupationReader, TitleKind } from "../match";
import type { OccupationOption } from "../types";
import rawData from "./data.json";
import type { OccupationData } from "./data-types";
import { CUSTOM_OCCUPATIONS, FUNCTIONS, LEAD_HEADS, TECH_NAMES, WORK_HEADS } from "./tech";
import { GENERIC_WORDS, RANK_WORDS, titleKey, titleParts } from "./title";

// Server-only (the lookup is about 1.3 MB; it never ships to the browser). Any job title -> one
// occupation: O*NET-SOC 2019 codes, with O*NET's job titles and ESCO's British-English labels as
// names for them, and our own names first for the startup, office and frontline titles O*NET
// files badly (tech.ts). Built once per process on first use (about 40 ms); a title takes
// microseconds after that. Unknown stays unknown: a title that only shares a generic word
// ("Manager", "Associate") with the taxonomy gets no occupation.

const data = rawData as OccupationData;

export type Occupation = {
  code: string;
  // One role in plain words: "Registered Nurse".
  name: string;
  // O*NET's own title, or ours for the few startup roles it lacks.
  title: string;
  // O*NET Job Zone 1-5, null when O*NET gives none.
  zone: number | null;
  // SOC major group ("29") and minor group ("29-1").
  major: string;
  minor: string;
};

export type OccupationHit = {
  code: string;
  // How it was found: the whole title, the longest name inside it, or (office titles no name
  // covers) the business function it names.
  via: "title" | "words" | "function";
  // The name it matched, as a lookup key ("registered nurse"), or the function word ("talent").
  key: string;
};

type Index = {
  byCode: Map<string, Occupation>;
  // Lookup key -> occupation code.
  keys: Map<string, string>;
  // Words that end some key: the head nouns titles are built around ("nurse", "driver").
  heads: Set<string>;
  longest: number;
  neighbours: Map<string, { close: string[]; related: string[] }>;
};

let built: Index | null = null;

function majorOf(code: string): string {
  return code.slice(0, 2);
}
function minorOf(code: string): string {
  return code.slice(0, 4);
}

function index(): Index {
  if (built) return built;
  const byCode = new Map<string, Occupation>();
  const keys = new Map<string, string>();
  const heads = new Set<string>();
  const close = new Map<string, string[]>();
  const related = new Map<string, string[]>();
  let longest = 1;
  const addKey = (key: string, code: string) => {
    if (!key || keys.has(key)) return;
    keys.set(key, code);
    const words = key.split(" ");
    longest = Math.max(longest, words.length);
    heads.add(words[words.length - 1]!);
  };
  data.codes.forEach((code, i) => {
    byCode.set(code, {
      code,
      name: data.names[i]!,
      title: data.titles[i]!,
      zone: data.zones[i] || null,
      major: majorOf(code),
      minor: minorOf(code),
    });
    close.set(
      code,
      data.close[i]!.map((other) => data.codes[other]!),
    );
    related.set(
      code,
      data.related[i]!.map((other) => data.codes[other]!),
    );
  });
  for (const custom of CUSTOM_OCCUPATIONS) {
    byCode.set(custom.code, {
      code: custom.code,
      name: custom.name,
      title: custom.name,
      zone: custom.zone,
      major: majorOf(custom.code),
      minor: minorOf(custom.code),
    });
    close.set(custom.code, [...custom.close]);
    related.set(custom.code, [...custom.related]);
  }
  // Our names for startup roles win over the taxonomy's for the same words, and over its names
  // that only add a rank word to ours ("senior data analyst").
  const ours = new Set<string>();
  for (const [name, code] of TECH_NAMES) {
    const key = titleKey(name);
    if (!key.includes(" ") && GENERIC_WORDS.has(key)) continue;
    addKey(key, code);
    ours.add(key);
  }
  const shadowed = (key: string) => {
    const space = key.indexOf(" ");
    return space > 0 && RANK_WORDS.has(key.slice(0, space)) && ours.has(key.slice(space + 1));
  };
  data.aliases.forEach((list, i) => {
    for (const key of list.split("|")) if (!shadowed(key)) addKey(key, data.codes[i]!);
  });
  // From the person's occupation outwards only: O*NET lists where people in an occupation move
  // to, and Registered Nurses is close to Nurse Practitioners without the reverse being true for
  // an EMT. The other O*NET codes under one SOC code count as close both ways.
  const closeSets = new Map<string, Set<string>>();
  const relatedSets = new Map<string, Set<string>>();
  const link = (sets: Map<string, Set<string>>, a: string, b: string) => {
    if (a !== b) sets.set(a, (sets.get(a) ?? new Set()).add(b));
  };
  for (const [code, list] of close) for (const other of list) link(closeSets, code, other);
  for (const [code, list] of related) for (const other of list) link(relatedSets, code, other);
  const bySoc = new Map<string, string[]>();
  for (const code of byCode.keys())
    bySoc.set(code.slice(0, 7), [...(bySoc.get(code.slice(0, 7)) ?? []), code]);
  for (const group of bySoc.values())
    for (const a of group) for (const b of group) link(closeSets, a, b);
  const neighbours = new Map<string, { close: string[]; related: string[] }>();
  for (const code of byCode.keys()) {
    const near = closeSets.get(code) ?? new Set<string>();
    neighbours.set(code, {
      close: [...near],
      related: [...(relatedSets.get(code) ?? [])].filter((other) => !near.has(other)),
    });
  }
  built = { byCode, keys, heads, longest, neighbours };
  return built;
}

/** The occupation with this code, or null for a code the data doesn't know. */
export function occupationOf(code: string | null | undefined): Occupation | null {
  return code ? (index().byCode.get(code) ?? null) : null;
}

// Keys this short are initials ("RN", "NP", "PA") that also name places ("Lancaster, PA"):
// trusted only in the first part of a title.
const SHORT_KEY = 3;

type Found = { code: string; start: number; end: number; length: number };

// Words after a job's name that only say someone works there.
const TAILS = new Set([
  "worker",
  "member",
  "team",
  "staff",
  "crew",
  "associate",
  "colleague",
  "person",
]);

function beforeTail(words: readonly string[], end: number): boolean {
  const rest = words.slice(end + 1);
  return rest.length > 0 && rest.length <= 2 && rest.every((word) => TAILS.has(word));
}

/**
 * The best name inside one part of a title: the longest key ending at the part's head noun (the
 * last word that ends any key: "nurse" in "registered nurse icu"), else the longest key anywhere
 * in it with two or more words. A single generic word never counts unless it is the whole part.
 */
function findInPart(words: readonly string[], first: boolean): Found | null {
  const { keys, heads, longest } = index();
  let head = -1;
  for (let i = words.length - 1; i >= 0; i--) {
    if (heads.has(words[i]!)) {
      head = i;
      break;
    }
  }
  let best: Found | null = null;
  // Ending at the head beats not; then longer; then further right (English titles end in the role).
  const rank = (found: Found) => [found.end === head ? 1 : 0, found.length, found.end];
  const better = (found: Found, than: Found) => {
    const [a, b] = [rank(found), rank(than)];
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i]! > b[i]!;
    return false;
  };
  for (let start = 0; start < words.length; start++) {
    for (let end = start; end < Math.min(words.length, start + longest); end++) {
      const key = words.slice(start, end + 1).join(" ");
      const code = keys.get(key);
      if (!code) continue;
      if (key.length <= SHORT_KEY && !first) continue;
      const found = { code, start, end, length: end - start + 1 };
      // A one-word name inside a longer part ("Manager" in "Market Manager") says too little,
      // unless it is the head itself ("Pharmacist" in "Clinical Pharmacist") or stands just
      // before a word that only says "worker" ("Loader Operative", "Barista Team Member").
      if (found.length === 1 && words.length > 1 && end !== head && !beforeTail(words, end))
        continue;
      if (!best || better(found, best)) best = found;
    }
  }
  return best;
}

/**
 * The occupation a job title names, or null when it can't tell. Startup roles first (tech.ts),
 * then the whole title, then each part in order ("Registered Nurse - ICU - Nights"), also read the
 * other way round for "Manager, Sales".
 */
export function classifyTitle(title: string): OccupationHit | null {
  const parts = titleParts(title);
  if (parts.length === 0) return null;
  const { keys } = index();
  const all = parts.flat().join(" ");
  const whole = keys.get(all);
  if (whole) return { code: whole, via: "title", key: all };
  // The whole part, give or take rank words ("Senior Manufacturing Engineer"), or a name inside it.
  const hit = (words: readonly string[], found: Found): OccupationHit => ({
    code: found.code,
    via: words.every((word, i) => (i >= found.start && i <= found.end) || RANK_WORDS.has(word))
      ? "title"
      : "words",
    key: words.slice(found.start, found.end + 1).join(" "),
  });
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    // "Manager, Sales" and "Director, Product Design": a short head first, its field after.
    const next = parts[i + 1];
    if (part.length <= 2 && next && next.length <= 4) {
      const flipped = [...next, ...part];
      const found = findInPart(flipped, i === 0);
      if (found && found.end === flipped.length - 1) return hit(flipped, found);
    }
    // "Director of Nursing" is a name of its own; "Director of Clinical Operations" reads as
    // "Clinical Operations Director", "Teacher of Maths" as "Maths Teacher".
    const of = part.indexOf("of");
    if (of > 0 && of <= 3 && of < part.length - 1) {
      const direct = findInPart(part, i === 0);
      if (direct && direct.length > 1) return hit(part, direct);
      const flipped = [...part.slice(of + 1), ...part.slice(0, of)];
      const found = findInPart(flipped, i === 0);
      if (found && found.end === flipped.length - 1) return hit(flipped, found);
    }
    const found = findInPart(part, i === 0);
    if (found) return hit(part, found);
  }
  return byFunction(parts);
}

/**
 * Office titles no name covers, by the business function they name and whether the head word
 * leads ("Director, Talent Analytics" -> HR managers) or does the work ("Brand Specialist" ->
 * marketing specialists). Only when the title has such a head word: "Market Manager" names no
 * function and stays unknown.
 */
function byFunction(parts: readonly (readonly string[])[]): OccupationHit | null {
  const words = parts.flat();
  const leads = words.some((word) => LEAD_HEADS.has(word));
  const works = words.some((word) => WORK_HEADS.has(word));
  if (!leads && !works) return null;
  const text = ` ${words.join(" ")} `;
  for (const [rule, leadCode, workCode] of FUNCTIONS) {
    const match = rule.exec(text);
    if (!match) continue;
    // Clinical and quality work names too many different jobs to guess from.
    const code = leads ? leadCode : workCode;
    return code ? { code, via: "function", key: match[0].trim() } : null;
  }
  return null;
}

/**
 * Where people in `code` move to, by O*NET's Related Occupations: its closest five and next five,
 * plus the other O*NET codes under the same SOC code (Registered Nurses 29-1141.00 and Acute Care
 * Nurses 29-1141.01). Our own startup roles name theirs in tech.ts.
 */
export function neighboursOf(code: string): {
  close: readonly string[];
  related: readonly string[];
} {
  return index().neighbours.get(code) ?? { close: [], related: [] };
}

const titleCache = new Map<string, TitleKind>();
const TITLE_CACHE_MAX = 50_000;

/**
 * A title's kind of role (roles.ts) and occupation. The kind of role is dropped when the
 * occupation says it can't be one ("Support Worker" is social care, not customer support).
 */
export function readTitle(title: string): TitleKind {
  const known = titleCache.get(title);
  if (known) return known;
  const occupation = classifyTitle(title)?.code ?? null;
  const family = roleFamily(title);
  const kind = { family: family && familyFits(family, occupation) ? family : null, occupation };
  if (titleCache.size >= TITLE_CACHE_MAX) titleCache.clear();
  titleCache.set(title, kind);
  return kind;
}

/** What match.ts needs from the occupation data, for the server's match requests. */
export const OCCUPATIONS: OccupationReader = {
  read: readTitle,
  neighbours: neighboursOf,
  zone: (code) => occupationOf(code)?.zone ?? null,
};

/**
 * Occupations whose names start with the words typed, best first: the "Looking for" card's
 * search. Matches the plain name, O*NET's title and every alias, so "RN", "HGV driver" and
 * "Solicitor" all find their occupation.
 */
// Every name the search reads, split into words once: plain names and O*NET titles first
// (they rank higher), then every lookup key.
type SearchRow = { code: string; text: string; words: readonly string[]; own: boolean };
let searchRows: SearchRow[] | null = null;

function rowsToSearch(): SearchRow[] {
  if (searchRows) return searchRows;
  const { keys, byCode } = index();
  const rows: SearchRow[] = [];
  for (const occupation of byCode.values()) {
    for (const label of new Set([titleKey(occupation.name), titleKey(occupation.title)]))
      rows.push({ code: occupation.code, text: label, words: label.split(" "), own: true });
  }
  for (const [key, code] of keys) rows.push({ code, text: key, words: key.split(" "), own: false });
  searchRows = rows;
  return rows;
}

/**
 * Occupations whose names hold the words typed, the last one as a prefix ("store man"), best
 * first: the "Looking for" card's search. Matches the plain name, O*NET's title and every name
 * for it, so "RN", "HGV driver" and "Solicitor" all find their occupation.
 */
export function searchOccupations(query: string, limit = 8): OccupationOption[] {
  const words = titleKey(query).split(" ").filter(Boolean);
  if (words.length === 0) return [];
  const typed = words.join(" ");
  const last = words[words.length - 1]!;
  const scores = new Map<string, number>();
  for (const row of rowsToSearch()) {
    if (!row.text.includes(last)) continue;
    const fits = words.every((word, i) =>
      i === words.length - 1 ? row.words.some((w) => w.startsWith(word)) : row.words.includes(word),
    );
    if (!fits) continue;
    // Exact before starts-with before anywhere; an occupation's own name before other names;
    // shorter names first among those.
    const score =
      (row.text === typed ? 300 : row.text.startsWith(typed) ? 200 : 100) +
      (row.own ? 50 : 0) -
      row.text.length / 100;
    if (score > (scores.get(row.code) ?? -1)) scores.set(row.code, score);
  }
  const { byCode } = index();
  return [...scores]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([code]) => {
      const occupation = byCode.get(code)!;
      return { code, name: occupation.name, group: MAJOR_GROUPS[occupation.major] ?? "" };
    });
}

// SOC 2018 major groups, in plain words.
export const MAJOR_GROUPS: Record<string, string> = {
  "11": "Management",
  "13": "Business and finance",
  "15": "Computers and maths",
  "17": "Architecture and engineering",
  "19": "Science",
  "21": "Community and social services",
  "23": "Legal",
  "25": "Education",
  "27": "Arts, design, media and sport",
  "29": "Healthcare practitioners",
  "31": "Healthcare support",
  "33": "Protective services",
  "35": "Food and hospitality",
  "37": "Cleaning and grounds",
  "39": "Personal care and service",
  "41": "Sales",
  "43": "Office and administration",
  "45": "Farming, fishing and forestry",
  "47": "Construction and extraction",
  "49": "Installation, maintenance and repair",
  "51": "Production and manufacturing",
  "53": "Transport and logistics",
  "55": "Military",
};
