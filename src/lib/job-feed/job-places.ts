import { TIME_ZONE_PHRASE } from "@/lib/eligibility/check";
import { fieldSaysWorldwide, LOCATION_LINE, restrictedPlaces } from "@/lib/eligibility/cues";
import { findPlaces, isCountryCode, type Place, type PlaceGroup } from "@/lib/eligibility/places";

const placeToken = (place: Place) => (place.kind === "country" ? place.code : `g:${place.group}`);

// Two-letter prefixes that are also US states ("IN - Indianapolis"), so only a known city settles them.
const STATE_LIKE = new Set(
  "AL AR AZ CA CO DE GA ID IL IN KY LA MA MD ME MN MO MS MT NC NE PA SC SD TN VA".split(" "),
);
const CODE_PREFIX = /^([A-Z]{2})\s+[-–]\s+\S/;

const placeCache = new Map<string, string[]>();
const PLACE_CACHE_MAX = 20_000;

export function jobPlaceTokens(location: string): string[] {
  const key = location.trim();
  if (!key) return [];
  const known = placeCache.get(key);
  if (known) return known;
  const tokens = new Set<string>();
  for (const spot of findPlaces(key, { cities: true })) tokens.add(placeToken(spot.place));
  for (const part of key.split(/\s*[·•|;]\s*/)) {
    const code = CODE_PREFIX.exec(part)?.[1]?.replace("UK", "GB");
    if (!code || !isCountryCode(code) || STATE_LIKE.has(code)) continue;
    if (findPlaces(part, { cities: true }).length === 0) tokens.add(code);
  }
  if (tokens.size === 0 && fieldSaysWorldwide(key)) tokens.add("*");
  const out = [...tokens].sort();
  if (placeCache.size >= PLACE_CACHE_MAX) placeCache.clear();
  placeCache.set(key, out);
  return out;
}

type Zone = { tokens: readonly string[]; offset: number | null };

const g = (group: PlaceGroup) => `g:${group}`;
const NA = [g("north_america")];
const EUROPE = [g("europe")];
const zone = (tokens: readonly string[], offset: number | null = null): Zone => ({
  tokens,
  offset,
});

// [pattern, written as a capitalized abbreviation that needs no "time zone" after it, zone]
const ZONE_NAMES: Array<[string, boolean, Zone]> = [
  ["central european(?: standard| summer)? time", false, zone(EUROPE, 1)],
  ["eastern european(?: standard| summer)? time", false, zone(EUROPE, 2)],
  ["western european(?: summer)? time", false, zone(EUROPE, 0)],
  [String.raw`(?:us[- ]|u\.s\.\s)?pacific`, false, zone(NA, -8)],
  [String.raw`(?:us[- ]|u\.s\.\s)?mountain`, false, zone(NA, -7)],
  [String.raw`(?:us[- ]|u\.s\.\s)?central`, false, zone(NA, -6)],
  [String.raw`(?:us[- ]|u\.s\.\s)?eastern`, false, zone(NA, -5)],
  [String.raw`us|u\.s\.|usa|united states|american|north american?`, false, zone(NA)],
  ["eu|european|europe|uk|london", false, zone(EUROPE)],
  ["emea", false, zone([g("emea")])],
  ["americas", false, zone([g("americas")])],
  ["latam|latin american?|south american?", false, zone([g("latam")])],
  ["apac|apj|asia[- ]pacific|asian?", false, zone([g("apac")])],
  ["indian?(?: standard)?", false, zone(["IN"], 5.5)],
  ["P[SD]T|PT", true, zone(NA, -8)],
  ["M[SD]T|MT", true, zone(NA, -7)],
  ["C[SD]T|CT", true, zone(NA, -6)],
  ["E[SD]T|ET", true, zone(NA, -5)],
  ["CES?T", true, zone(EUROPE, 1)],
  ["EES?T", true, zone(EUROPE, 2)],
  ["WES?T|BST", true, zone(EUROPE, 0)],
  ["IST", true, zone(["IN"], 5.5)],
  ["SGT", true, zone(["SG"], 8)],
  ["HKT", true, zone(["HK"], 8)],
  ["JST", true, zone(["JP"], 9)],
  ["KST", true, zone(["KR"], 9)],
  ["AE[SD]T|AET|AWST|ACST", true, zone(["AU"], 10)],
  ["NZ[SD]T", true, zone(["NZ"], 12)],
  ["BRT", true, zone([g("latam")], -3)],
];
const NAMED = ZONE_NAMES.map(([source, bare, value]) => ({
  pattern: new RegExp(`(?:${source})(?![\\w+])`, bare ? "y" : "iy"),
  bare,
  zone: value,
}));
const OFFSET = /(?:UTC|GMT)(?:\s*([+\-−–])\s*(\d{1,2})(?::?(\d{2}))?)?(?![\w:])/y;
const SUFFIX =
  /(?:\s+(?:standard|daylight|summer))?(?:\s+u\.?s\.?)?\s*(?:time[- ]?zones?|timezones?|time|zones?)\b/iy;
const JOIN = /\s*(?:,\s*(?:or\s+|and\s+)?|\/|&|\bor\b|\band\b|\bto\b|\bthrough\b|[-–—])\s*/iy;
const PLUS_MINUS = /\s*(?:±|\+\/-|\+-|plus or minus)\s*(\d{1,2}(?:\.5)?)/iy;
const HOURS_OF =
  /(?:(?:approximately|about|roughly|around)\s*)?(?:±|\+\/-|\+-|plus or minus)?\s*(\d{1,2}(?:\.5)?)\s*(?:hours?|hrs?|h)\s+(?:of|from)\s+(?:the\s+)?/iy;
const ARTICLE = /(?:the|an?|one of the|either)\s+/iy;

// Rough standard-time spans in hours east of UTC, for rules written as offsets.
const SPANS: Array<[string, number, number]> = [
  [g("north_america"), -10, -3.5],
  [g("latam"), -6, -3],
  [g("europe"), 0, 3],
  [g("emea"), -1, 4],
  [g("apac"), 5.5, 13],
];

const sticky = (pattern: RegExp, text: string, at: number) => {
  pattern.lastIndex = at;
  return pattern.exec(text);
};

type Item = { zone: Zone; end: number; needsSuffix: boolean; suffixed: boolean };

function itemAt(text: string, at: number): Item | null {
  let best: Item | null = null;
  const offset = sticky(OFFSET, text, at);
  if (offset) {
    const hours = Number(offset[2] ?? 0) + Number(offset[3] ?? 0) / 60;
    const value = offset[1] && offset[1] !== "+" ? -hours : hours;
    best = {
      zone: zone([], value),
      end: at + offset[0].length,
      needsSuffix: false,
      suffixed: false,
    };
  }
  for (const name of NAMED) {
    const match = sticky(name.pattern, text, at);
    if (!match || (best && at + match[0].length <= best.end)) continue;
    best = { zone: name.zone, end: at + match[0].length, needsSuffix: !name.bare, suffixed: false };
  }
  if (!best) return null;
  const suffix = sticky(SUFFIX, text, best.end);
  if (suffix) return { ...best, end: best.end + suffix[0].length, suffixed: true };
  return best;
}

function spanTokens(low: number, high: number): string[] {
  return SPANS.filter(([, from, to]) => low <= to && high >= from).map(([token]) => token);
}

function zonesAt(text: string, at: number): { tokens: string[]; end: number } | null {
  const around = sticky(HOURS_OF, text, at);
  const start = around ? at + around[0].length : at;
  const items: Item[] = [];
  let pos = start;
  for (;;) {
    const item = itemAt(text, pos);
    if (!item) break;
    items.push(item);
    const join = sticky(JOIN, text, item.end);
    if (!join) break;
    pos = item.end + join[0].length;
  }
  const last = items.at(-1);
  if (!last) return null;
  const kept = items.filter((item) => !item.needsSuffix || item.suffixed || last.suffixed);
  if (kept.length === 0) return null;
  const plusMinus = around ? null : sticky(PLUS_MINUS, text, last.end);
  const spread = Number(around?.[1] ?? plusMinus?.[1] ?? 0);
  const end = plusMinus ? last.end + plusMinus[0].length : last.end;
  const offsets = kept.flatMap((item) => (item.zone.offset === null ? [] : [item.zone.offset]));
  const bareOffsets = kept.every((item) => item.zone.tokens.length === 0);
  if ((spread > 0 || bareOffsets) && offsets.length > 0) {
    return {
      tokens: spanTokens(Math.min(...offsets) - spread, Math.max(...offsets) + spread),
      end,
    };
  }
  return { tokens: [...new Set(kept.flatMap((item) => item.zone.tokens))], end };
}

const CUE =
  /\b(?:(?:home[- ])?based|located|resid(?:e|es|ing|ents?)|liv(?:e|es|ing)|situated|candidates?|applicants?|remote(?:ly)?|be)\s+(?:(?:currently|physically)\s+)?(?:(?:based|located|residing|living)\s+)?(?:in|within|between)\s+|\bwork(?:ing)?\s+from\s+|\brequired\s+time[- ]?zones?\s*[:\-–]?\s*/gi;
const SUBJECT =
  /\b(?:you|your|you're|you'll|candidates?|applicants?|role|position|job|opening|must|required?|requires?|needs? to|only|seeking|looking for|hir(?:e|es|ing)|remote|eligible|open to|considered)\b|^\s*(?:work|be|are)\b/i;
const PREFERENCE = /\b(?:prefer\w*|ideal(?:ly)?|bonus|a plus|nice to have|advantage\w*)\b/i;
const WORKING_HOURS =
  /^\s*(?:time\s+)?(?:business\s+|working\s+|work\s+|core\s+|office\s+|daytime\s+)?(?:hours|schedule|shifts?)\b/i;
const CLAUSE_BREAK = /[;:()!?]|,\s|\s[-–—]\s|\bbut\b|\bwhile\b|\bwith\b|\bwhereas\b/gi;

function clauseAround(line: string, start: number, end: number): string {
  let from = 0;
  for (const match of line.slice(0, start).matchAll(CLAUSE_BREAK))
    from = match.index + match[0].length;
  const rest = line.slice(end);
  const stop = rest.search(CLAUSE_BREAK);
  return line.slice(from, stop === -1 ? line.length : end + stop);
}

// "Must be based in PST or MST" restricts where people live; "overlap with PST hours" doesn't.
export function residenceZones(line: string): string[] {
  const tokens = new Set<string>();
  for (const cue of line.matchAll(CUE)) {
    const at = cue.index + cue[0].length;
    const article = sticky(ARTICLE, line, at);
    const found = zonesAt(line, article ? at + article[0].length : at);
    if (!found || found.tokens.length === 0) continue;
    if (WORKING_HOURS.test(line.slice(found.end))) continue;
    if (!SUBJECT.test(line.slice(Math.max(0, cue.index - 100), at))) continue;
    if (PREFERENCE.test(clauseAround(line, cue.index, found.end))) continue;
    for (const token of found.tokens) tokens.add(token);
  }
  return [...tokens].sort();
}

export function textPlaceTokens(rulesText: string): string[] {
  const tokens = new Set<string>();
  for (const raw of rulesText.split("\n")) {
    const text = raw.trim();
    if (!text) continue;
    const field = LOCATION_LINE.exec(text)?.[1];
    const named = field ? jobPlaceTokens(field).filter((token) => token !== "*") : [];
    const line = text.replace(TIME_ZONE_PHRASE, " ");
    const places = named.length
      ? named
      : restrictedPlaces(line, findPlaces(line, { cities: true })).map(placeToken);
    for (const token of places.length ? places : residenceZones(text)) tokens.add(token);
  }
  return [...tokens].sort();
}

// A location that names no place, or only "Remote" or "Anywhere", takes the places the post restricts to.
export function jobPlaces(location: string, rulesText: string): string[] {
  const field = jobPlaceTokens(location);
  if (!rulesText || field.some((token) => token !== "*")) return field;
  const said = textPlaceTokens(rulesText);
  return said.length > 0 ? said : field;
}
