const CODES = `AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ
BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE
EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR
HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS
LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL
NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI
SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY
UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW`;

export const COUNTRY_CODES: readonly string[] = CODES.split(/\s+/);
const CODE_SET = new Set(COUNTRY_CODES);

export function isCountryCode(value: string): boolean {
  return CODE_SET.has(value);
}

const set = (codes: string) => new Set(codes.split(" "));

const EU = set("AT BE BG CY CZ DE DK EE ES FI FR GR HR HU IE IT LT LU LV MT NL PL PT RO SE SI SK");
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

export function placeContains(place: Place, country: string): boolean {
  if (place.kind === "group") return inGroup(place.group, country);
  if (place.code === "US") return US_TERRITORIES.has(country);
  return place.code === country;
}

const displayNames = new Intl.DisplayNames(["en"], { type: "region" });

export function countryName(code: string): string {
  return displayNames.of(code) ?? code;
}

export function placeName(place: Place): string {
  if (place.kind === "group") return GROUP_NAMES[place.group];
  if (place.code === "US") return "the US";
  if (place.code === "GB") return "the UK";
  if (place.code === "AE") return "the UAE";
  if (place.code === "NL") return "the Netherlands";
  if (place.code === "PH") return "the Philippines";
  return countryName(place.code);
}

export function rightsRegionOf(place: Place): "us" | "uk" | "eu" | "ca" | null {
  if (place.kind === "group") return place.group === "eu" ? "eu" : null;
  if (US_TERRITORIES.has(place.code)) return "us";
  if (place.code === "GB") return "uk";
  if (place.code === "CA") return "ca";
  return EU.has(place.code) ? "eu" : null;
}

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const country = (code: string): Place => ({ kind: "country", code });
const group = (name: PlaceGroup): Place => ({ kind: "group", group: name });

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
  ["china", "CN"],
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
  [/\b(?:European Union|E\.U\.|EU)(?!\w)(?!\.\w)/g, "eu"],
  [/\bEurope(?:an)?\b(?!\s+Union)/gi, "europe"],
  [/\bEMEA\b/gi, "emea"],
  [/\bNorth America(?:n)?\b/gi, "north_america"],
  [/\b(?:LATAM|LatAm|(?:Latin|South|Central) America(?:n)?)\b/g, "latam"],
  [/\b(?:the\s+)?Americas\b/gi, "americas"],
  [/\b(?:APAC|Asia[- ]Pacific|Asia)\b/gi, "apac"],
  [/\b(?:ANZ|Australia and New Zealand)\b/g, "anz"],
];

const CODE_PATTERNS: Array<[RegExp, string]> = [
  [/(?<![A-Za-z.])(?:U\.S\.A\.?|U\.S\.|USA|US)(?![A-Za-z])/g, "US"],
  [/(?<![A-Za-z.])(?:U\.K\.|UK)(?![A-Za-z])/g, "GB"],
];

const US_STATES =
  "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY";
const PROVINCES = "ON BC QC AB MB SK NS NB PE YT NT NU";
const STATE_PATTERN = new RegExp(
  `,\\s*(${US_STATES.replace(/ /g, "|")}|${PROVINCES.replace(/ /g, "|")})\\b`,
  "g",
);
const PROVINCE_SET = set(PROVINCES);

// Read by the job feed only, so the eligibility check's wording stays as it was.
const CITIES: Record<string, string> = {
  US:
    "alabama|alaska|arizona|arkansas|connecticut|delaware|hawaii|idaho|indiana|iowa|kansas|kentucky|" +
    "louisiana|maine|maryland|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|" +
    "new hampshire|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|" +
    "south carolina|south dakota|tennessee|utah|vermont|virginia|west virginia|wisconsin|wyoming|" +
    "district of columbia|washington dc|washington, d.c.|atlanta|miami|dallas|houston|phoenix|" +
    "philadelphia|pittsburgh|portland|san diego|salt lake city|minneapolis|detroit|nashville|raleigh|" +
    "baltimore|palo alto|mountain view|menlo park|sunnyvale|santa clara|redwood city|oakland|" +
    "sacramento|brooklyn|manhattan|indianapolis|kansas city|st. louis|saint louis|las vegas|orlando|" +
    "tampa|irvine|san mateo|boulder|ann arbor|cincinnati|cleveland|milwaukee|hartford|new haven|" +
    "bridgeport|providence|honolulu|albuquerque|tucson|scottsdale|plano|fort worth|san antonio|" +
    "jacksonville|silicon valley|lehi|bellevue|redmond|santa monica|pasadena|emeryville|stamford|" +
    "jersey city|hoboken|reston|mclean|herndon|bethesda|des moines|omaha|boise|louisville|" +
    "new orleans|south san francisco|cupertino|san bruno|foster city|burlingame",
  CA: "manitoba|saskatchewan|nova scotia|new brunswick|ottawa|calgary|edmonton|winnipeg|halifax|mississauga",
  IN:
    "delhi|new delhi|mumbai|bombay|pune|hyderabad|chennai|kolkata|calcutta|gurgaon|gurugram|noida|" +
    "ahmedabad|jaipur|kochi|cochin|coimbatore|chandigarh|indore|lucknow|bhubaneswar|" +
    "thiruvananthapuram|trivandrum|visakhapatnam|nagpur|mysore|mysuru|vadodara|surat|mohali|" +
    "karnataka|maharashtra|telangana|tamil nadu|kerala|haryana|uttar pradesh|west bengal|gujarat|" +
    "rajasthan|andhra pradesh|odisha|goa",
  GB: "bristol|glasgow|leeds|liverpool|belfast|cardiff|milton keynes|oxford|nottingham|sheffield",
  IE: "galway|limerick",
  FR: "lyon|lille|marseille|toulouse|bordeaux|nantes|cannes|montpellier|grenoble|sophia antipolis",
  DE: "frankfurt|cologne|köln|stuttgart|düsseldorf|dusseldorf|leipzig|dresden|nuremberg|karlsruhe",
  NL: "rotterdam|utrecht|eindhoven|the hague",
  BE: "brussels|bruxelles|brussel|antwerp|ghent",
  CH: "geneva|lausanne|basel|bern",
  AT: "vienna|wien|graz",
  IT: "milan|milano|rome|turin|torino|bologna",
  ES: "seville|bilbao|malaga|málaga",
  PT: "porto|braga",
  CZ: "prague|brno",
  PL: "krakow|kraków|wroclaw|wrocław|gdansk|gdańsk|poznan|poznań|katowice",
  DK: "copenhagen|aarhus",
  NO: "oslo",
  SE: "gothenburg|malmö|malmo",
  FI: "helsinki|tampere",
  HU: "budapest",
  RO: "bucharest|cluj-napoca|cluj",
  BG: "sofia",
  UA: "kyiv|kiev|lviv",
  LT: "vilnius|kaunas",
  LV: "riga",
  EE: "tallinn",
  HR: "zagreb",
  RS: "belgrade",
  SI: "ljubljana",
  SK: "bratislava",
  GR: "thessaloniki",
  TR: "istanbul|ankara|izmir",
  AM: "yerevan",
  GE: "tbilisi",
  AZ: "baku",
  IL: "tel aviv|tel aviv-yafo|jerusalem|haifa|herzliya",
  AE: "dubai|abu dhabi",
  SA: "riyadh|jeddah",
  QA: "doha",
  EG: "cairo",
  MA: "casablanca",
  NG: "lagos|abuja",
  KE: "nairobi",
  GH: "accra",
  ZA: "johannesburg|cape town|durban|pretoria",
  MY: "kuala lumpur|penang",
  ID: "jakarta",
  PH: "manila|makati|cebu",
  TH: "bangkok",
  VN: "ho chi minh city|saigon|hanoi|da nang",
  KR: "seoul|busan",
  CN: "shanghai|beijing|shenzhen|guangzhou|hangzhou|chengdu|wuhan|nanjing|suzhou",
  TW: "taipei",
  JP: "osaka|kyoto|fukuoka|yokohama",
  AU: "brisbane|adelaide|canberra",
  NZ: "auckland|wellington|christchurch",
  PK: "karachi|lahore|islamabad",
  BD: "dhaka",
  LK: "colombo",
  NP: "kathmandu",
  AR: "buenos aires",
  CO: "bogota|bogotá|medellin|medellín",
  UY: "montevideo",
  MX: "guadalajara|monterrey",
  BR: "rio de janeiro|curitiba|belo horizonte|porto alegre|florianopolis|florianópolis|recife|sao jose dos campos|são josé dos campos",
};

const AMBIGUOUS = new Set(["georgia", "jordan", "chad", "jersey"]);

type NameMatcher = { pattern: RegExp; codes: Map<string, string> };
const nameMatchers = new Map<boolean, NameMatcher>();

function namedPlaces(cities: boolean): NameMatcher {
  const known = nameMatchers.get(cities);
  if (known) return known;
  const codes = new Map<string, string>();
  for (const code of COUNTRY_CODES) {
    const name = displayNames.of(code);
    if (name && name !== code && !AMBIGUOUS.has(name.toLowerCase())) {
      codes.set(name.toLowerCase(), code);
    }
  }
  for (const [name, code] of ALIASES) codes.set(name, code);
  if (cities)
    for (const [code, names] of Object.entries(CITIES))
      for (const name of names.split("|")) codes.set(name, code);
  const names = [...codes.keys()].sort((a, b) => b.length - a.length).map(escape);
  const matcher = {
    pattern: new RegExp(`(?<![\\p{L}])(?:${names.join("|")})(?![\\p{L}])`, "giu"),
    codes,
  };
  nameMatchers.set(cities, matcher);
  return matcher;
}

export type FoundPlace = { place: Place; index: number; text: string };

export function findPlaces(line: string, { cities = false } = {}): FoundPlace[] {
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
  const names = namedPlaces(cities);
  names.pattern.lastIndex = 0;
  for (const match of line.matchAll(names.pattern)) {
    const code = names.codes.get(match[0].toLowerCase());
    const end = match.index + match[0].length;
    if (!code || !free(match.index, end)) continue;
    taken.push([match.index, end]);
    found.push({ place: country(code), index: match.index, text: match[0] });
  }
  for (const [pattern, code] of CODE_PATTERNS) add(pattern, country(code));
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
