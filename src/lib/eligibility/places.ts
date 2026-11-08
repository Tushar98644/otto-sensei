// Client-safe. Countries, the regions job posts name ("EU", "LATAM", "APAC"), and finding them in
// a line of text. Country names come from Intl.DisplayNames, so nothing here needs translating.

const CODES = `AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ
BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE
EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR
HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS
LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL
NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI
SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY
UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW`;

/** ISO 3166-1 alpha-2 codes. */
export const COUNTRY_CODES: readonly string[] = CODES.split(/\s+/);
const CODE_SET = new Set(COUNTRY_CODES);

export function isCountryCode(value: string): boolean {
  return CODE_SET.has(value);
}

const set = (codes: string) => new Set(codes.split(" "));

const EU = set("AT BE BG CY CZ DE DK EE ES FI FR GR HR HU IE IT LT LU LV MT NL PL PT RO SE SI SK");
// EEA members and Switzerland: their citizens may work anywhere in the EU, but they aren't in it.
const EEA_EXTRA = set("IS LI NO CH");
const EUROPE_OTHER = set("GB AD AL BA BY FO GG GI IM JE MC MD ME MK RS RU SM UA VA AX SJ");
const MIDDLE_EAST = set("AE BH IL IQ IR JO KW LB OM PS QA SA SY TR YE");
const AFRICA = set(
  "AO BF BI BJ BW CD CF CG CI CM CV DJ DZ EG EH ER ET GA GH GM GN GQ GW KE KM LR LS LY MA MG ML MR MU " +
    "MW MZ NA NE NG RE RW SC SD SH SL SN SO SS ST SZ TD TG TN TZ UG YT ZA ZM ZW",
);
const US_TERRITORIES = set("US PR GU VI MP AS UM");
const LATAM = set(
  "AR BO BR BZ CL CO CR CU DO EC GT HN HT MX NI PA PE PR PY SV UY VE GY SR GF JM TT BS BB",
);
const APAC = set(
  "AU NZ JP KR CN HK TW MO SG MY TH VN PH ID IN PK BD LK NP BT MV MM KH LA BN MN TL PG FJ",
);

export type PlaceGroup =
  "eu" | "europe" | "emea" | "north_america" | "latam" | "americas" | "apac" | "anz";

const GROUP_NAMES: Record<PlaceGroup, string> = {
  eu: "the EU",
  europe: "Europe",
  emea: "EMEA",
  north_america: "North America",
  latam: "Latin America",
  americas: "the Americas",
  apac: "Asia-Pacific",
  anz: "Australia and New Zealand",
};

export type Place = { kind: "country"; code: string } | { kind: "group"; group: PlaceGroup };

function inGroup(group: PlaceGroup, code: string): boolean {
  switch (group) {
    case "eu":
      return EU.has(code);
    case "europe":
      return EU.has(code) || EEA_EXTRA.has(code) || EUROPE_OTHER.has(code);
    case "emea":
      return inGroup("europe", code) || MIDDLE_EAST.has(code) || AFRICA.has(code);
    case "north_america":
      return US_TERRITORIES.has(code) || code === "CA" || code === "MX";
    case "latam":
      return LATAM.has(code);
    case "americas":
      return inGroup("north_america", code) || LATAM.has(code);
    case "apac":
      return APAC.has(code);
    case "anz":
      return code === "AU" || code === "NZ";
  }
}

/** Whether someone living in `country` is inside `place`. */
export function placeContains(place: Place, country: string): boolean {
  if (place.kind === "group") return inGroup(place.group, country);
  if (place.code === "US") return US_TERRITORIES.has(country);
  return place.code === country;
}

const displayNames = new Intl.DisplayNames(["en"], { type: "region" });

/** "Germany" for "DE", the code itself if the runtime doesn't know it. */
export function countryName(code: string): string {
  return displayNames.of(code) ?? code;
}

// How the rules name a place in a sentence: "the US", "Germany", "the EU".
export function placeName(place: Place): string {
  if (place.kind === "group") return GROUP_NAMES[place.group];
  if (place.code === "US") return "the US";
  if (place.code === "GB") return "the UK";
  if (place.code === "AE") return "the UAE";
  if (place.code === "NL") return "the Netherlands";
  if (place.code === "PH") return "the Philippines";
  return countryName(place.code);
}

/** The visa regions the work profile asks about, for a place a post names. */
export function rightsRegionOf(place: Place): "us" | "uk" | "eu" | "ca" | null {
  if (place.kind === "group") return place.group === "eu" ? "eu" : null;
  if (US_TERRITORIES.has(place.code)) return "us";
  if (place.code === "GB") return "uk";
  if (place.code === "CA") return "ca";
  // A right to work in the EU (an EU passport, say) covers each member country.
  return EU.has(place.code) ? "eu" : null;
}

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

type Matcher = { pattern: RegExp; place: Place };

const country = (code: string): Place => ({ kind: "country", code });
const group = (name: PlaceGroup): Place => ({ kind: "group", group: name });

// Names that aren't Intl's English name, plus cities and states that pin a post to one country.
const ALIASES: Array<[string, string]> = [
  ["united states of america", "US"],
  ["new jersey", "US"],
  ["new mexico", "US"],
  ["america", "US"],
  ["great britain", "GB"],
  ["britain", "GB"],
  ["england", "GB"],
  ["scotland", "GB"],
  ["wales", "GB"],
  ["northern ireland", "GB"],
  ["czech republic", "CZ"],
  ["holland", "NL"],
  ["turkey", "TR"],
  ["hong kong", "HK"],
  ["macau", "MO"],
  ["burma", "MM"],
  ["myanmar", "MM"],
  ["ivory coast", "CI"],
  ["korea", "KR"],
  ["south korea", "KR"],
  ["uae", "AE"],
  ["emirates", "AE"],
  ["california", "US"],
  ["new york", "US"],
  ["texas", "US"],
  ["florida", "US"],
  ["washington", "US"],
  ["massachusetts", "US"],
  ["illinois", "US"],
  ["colorado", "US"],
  ["san francisco", "US"],
  ["bay area", "US"],
  ["seattle", "US"],
  ["austin", "US"],
  ["boston", "US"],
  ["chicago", "US"],
  ["los angeles", "US"],
  ["denver", "US"],
  ["nyc", "US"],
  ["ontario", "CA"],
  ["british columbia", "CA"],
  ["quebec", "CA"],
  ["alberta", "CA"],
  ["toronto", "CA"],
  ["vancouver", "CA"],
  ["montreal", "CA"],
  ["london", "GB"],
  ["manchester", "GB"],
  ["edinburgh", "GB"],
  ["berlin", "DE"],
  ["munich", "DE"],
  ["hamburg", "DE"],
  ["paris", "FR"],
  ["amsterdam", "NL"],
  ["dublin", "IE"],
  ["madrid", "ES"],
  ["barcelona", "ES"],
  ["lisbon", "PT"],
  ["stockholm", "SE"],
  ["warsaw", "PL"],
  ["zurich", "CH"],
  ["bangalore", "IN"],
  ["bengaluru", "IN"],
  ["sydney", "AU"],
  ["melbourne", "AU"],
  ["tokyo", "JP"],
  ["sao paulo", "BR"],
  ["são paulo", "BR"],
  ["mexico city", "MX"],
];

const GROUP_PATTERNS: Array<[RegExp, PlaceGroup]> = [
  // "the EU." ends a sentence; "EU.example" is not a place.
  [/\b(?:European Union|E\.U\.|EU)(?!\w)(?!\.\w)/g, "eu"],
  [/\bEurope(?:an)?\b(?!\s+Union)/gi, "europe"],
  [/\bEMEA\b/gi, "emea"],
  [/\bNorth America(?:n)?\b/gi, "north_america"],
  [/\b(?:LATAM|LatAm|(?:Latin|South|Central) America(?:n)?)\b/g, "latam"],
  [/\b(?:the\s+)?Americas\b/gi, "americas"],
  [/\b(?:APAC|Asia[- ]Pacific|Asia)\b/gi, "apac"],
  [/\b(?:ANZ|Australia and New Zealand)\b/g, "anz"],
];

// Short forms are case-sensitive: "us" and "uk" in lower case are ordinary words.
const CODE_PATTERNS: Array<[RegExp, string]> = [
  [/(?<![A-Za-z.])(?:U\.S\.A\.?|U\.S\.|USA|US)(?![A-Za-z])/g, "US"],
  [/(?<![A-Za-z.])(?:U\.K\.|UK)(?![A-Za-z])/g, "GB"],
];

// After a comma in "Austin, TX": US states and DC, and Canadian provinces. CA is California
// there; NL is left out because "Amsterdam, NL" is far more common than Newfoundland.
const US_STATES =
  "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY";
const PROVINCES = "ON BC QC AB MB SK NS NB PE YT NT NU";
const STATE_PATTERN = new RegExp(
  `,\\s*(${US_STATES.replace(/ /g, "|")}|${PROVINCES.replace(/ /g, "|")})\\b`,
  "g",
);
const PROVINCE_SET = set(PROVINCES);

// Country names that are just as often a US state or a person: "Georgia", "Jordan", "Chad".
const AMBIGUOUS = new Set(["georgia", "jordan", "chad", "jersey"]);

let nameMatchers: Matcher[] | null = null;

function namedCountries(): Matcher[] {
  if (nameMatchers) return nameMatchers;
  const names = new Map<string, string>();
  for (const code of COUNTRY_CODES) {
    const name = displayNames.of(code);
    if (name && name !== code && !AMBIGUOUS.has(name.toLowerCase())) {
      names.set(name.toLowerCase(), code);
    }
  }
  for (const [name, code] of ALIASES) names.set(name, code);
  // Longest first, so "Northern Ireland" wins over "Ireland" and "South Africa" over nothing.
  nameMatchers = [...names.entries()]
    .sort((a, b) => b[0].length - a[0].length)
    .map(([name, code]) => ({
      pattern: new RegExp(`(?<![\\p{L}])${escape(name)}(?![\\p{L}])`, "giu"),
      place: country(code),
    }));
  return nameMatchers;
}

export type FoundPlace = { place: Place; index: number; text: string };

/**
 * Every country or region named in `line`, in reading order, without repeats. Matches are taken
 * longest first and never overlap, so "Northern Ireland" isn't also "Ireland" and "North America"
 * isn't also "America".
 */
export function findPlaces(line: string): FoundPlace[] {
  const taken: Array<[number, number]> = [];
  const found: FoundPlace[] = [];
  const free = (start: number, end: number) => taken.every(([a, b]) => end <= a || start >= b);
  const add = (pattern: RegExp, place: Place, group = 0) => {
    pattern.lastIndex = 0;
    for (const match of line.matchAll(pattern)) {
      const text = match[group] ?? match[0];
      const start = match.index + (group ? match[0].indexOf(text) : 0);
      const end = start + text.length;
      if (!free(start, end)) continue;
      taken.push([start, end]);
      found.push({ place, index: start, text });
    }
  };
  for (const [pattern, name] of GROUP_PATTERNS) add(pattern, group(name));
  for (const matcher of namedCountries()) add(matcher.pattern, matcher.place);
  for (const [pattern, code] of CODE_PATTERNS) add(pattern, country(code));
  // State codes only when nothing else names the place: "Berlin, DE" is Germany, not Delaware.
  for (const match of found.length > 0 ? [] : line.matchAll(STATE_PATTERN)) {
    const code = match[1] ?? "";
    add(new RegExp(`,\\s*(${code})\\b`, "g"), country(PROVINCE_SET.has(code) ? "CA" : "US"), 1);
  }
  const seen = new Set<string>();
  return found
    .sort((a, b) => a.index - b.index)
    .filter(({ place }) => {
      const key = place.kind === "group" ? `g:${place.group}` : `c:${place.code}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
