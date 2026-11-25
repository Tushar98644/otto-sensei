import "server-only";
import { citiesNamed, cityKey, type City } from "./cities";

// Names job posts use that GeoNames files under another (its English or local name).
const ALIASES: Record<string, string> = {
  nyc: "new york city",
  "new york": "new york city",
  "new york ny": "new york city",
  sf: "san francisco",
  "sf bay area": "san francisco",
  "bay area": "san francisco",
  "san francisco bay area": "san francisco",
  "washington dc": "washington",
  "washington d c": "washington",
  "greater london": "london",
  "city of london": "london",
  bangalore: "bengaluru",
  gurgaon: "gurugram",
  bombay: "mumbai",
  calcutta: "kolkata",
  madras: "chennai",
  cologne: "koln",
  munchen: "munich",
  nurnberg: "nuremberg",
  frankfurt: "frankfurt am main",
  saigon: "ho chi minh city",
  kiev: "kyiv",
  "den haag": "the hague",
  lisboa: "lisbon",
  wien: "vienna",
  praha: "prague",
  warszawa: "warsaw",
  roma: "rome",
  milano: "milan",
  firenze: "florence",
  napoli: "naples",
  torino: "turin",
  geneve: "geneva",
  bruxelles: "brussels",
  brussel: "brussels",
  antwerpen: "antwerp",
  goteborg: "gothenburg",
  kobenhavn: "copenhagen",
  cdmx: "mexico city",
  "ciudad de mexico": "mexico city",
  "tel aviv yafo": "tel aviv",
  "hong kong sar": "hong kong",
};

// The country an alias means, so "Frankfurt" isn't Frankfurt (Oder) when the post names no country.
const ALIAS_COUNTRY: Record<string, string> = {
  "new york city": "US",
  "san francisco": "US",
  washington: "US",
  london: "GB",
  "frankfurt am main": "DE",
};

const US_STATE_NAMES: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  "new york": "NY",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
  "district of columbia": "DC",
};
const US_STATE_CODES = new Set(Object.values(US_STATE_NAMES));

// Canada's provinces by their usual letters, as GeoNames numbers them.
const PROVINCES: Record<string, string> = {
  ab: "01",
  alberta: "01",
  bc: "02",
  "british columbia": "02",
  mb: "03",
  manitoba: "03",
  nb: "04",
  "new brunswick": "04",
  nl: "05",
  newfoundland: "05",
  ns: "07",
  "nova scotia": "07",
  on: "08",
  ontario: "08",
  pe: "09",
  qc: "10",
  quebec: "10",
  sk: "11",
  saskatchewan: "11",
};

// A part that names one of these is never a city, though a small town may share the name.
const NOT_A_CITY = new Set([
  "remote",
  "hybrid",
  "onsite",
  "on site",
  "in office",
  "office",
  "hq",
  "headquarters",
  "anywhere",
  "worldwide",
  "global",
  "flexible",
  "multiple locations",
  "various locations",
  "usa",
  "us",
  "united states",
  "united states of america",
  "uk",
  "united kingdom",
  "england",
  "scotland",
  "wales",
  "europe",
  "emea",
  "apac",
  "latam",
  "americas",
  "north america",
  "canada",
  "india",
  "germany",
  "france",
  "spain",
  "italy",
  "mexico",
  "brazil",
  "australia",
  "netherlands",
  "ireland",
  "poland",
  "portugal",
  "japan",
  "china",
  "remote first",
  "field",
  "home based",
]);

// City-states, whose city shares the country's name.
const CITY_STATES = new Set(["singapore", "hong kong", "luxembourg", "monaco", "macau", "kuwait"]);

const NOISE =
  /\b(?:greater|metro(?:politan)?(?: area)?|area|region|office|hq|headquarters|campus|downtown|remote|hybrid|on ?site|in office|based)\b/g;

function cityLike(key: string): boolean {
  if (!key) return false;
  if (ALIASES[key] || CITY_STATES.has(key)) return true;
  return !NOT_A_CITY.has(key) && !US_STATE_NAMES[key] && !PROVINCES[key];
}

type Hints = { countries: ReadonlySet<string>; admins: ReadonlySet<string> };

function pick(key: string, hints: Hints): City | null {
  const alias = ALIASES[key];
  const name = alias ?? key;
  const found = citiesNamed(name);
  if (found.length === 0) return null;
  const aliasCountry = alias || ALIASES[name] ? ALIAS_COUNTRY[name] : undefined;
  const countries = hints.countries.size > 0 ? hints.countries : null;
  const inCountry = countries
    ? found.filter((city) => countries.has(city.country))
    : aliasCountry
      ? found.filter((city) => city.country === aliasCountry)
      : found;
  if (inCountry.length === 0) return null;
  return (
    inCountry.find((city) => hints.admins.has(`${city.country}:${city.admin}`)) ?? inCountry[0]!
  );
}

function hintsOf(parts: readonly string[], raw: readonly string[], countries: readonly string[]) {
  const admins = new Set<string>();
  const found = new Set(countries);
  for (const [index, key] of parts.entries()) {
    const word = raw[index]?.trim() ?? "";
    const state =
      US_STATE_NAMES[key] ?? (/^[A-Z]{2}$/.test(word) && US_STATE_CODES.has(word) ? word : null);
    if (state) admins.add(`US:${state}`);
    const province = PROVINCES[key];
    if (province && (key.length > 2 || /^[A-Z]{2}$/.test(word))) admins.add(`CA:${province}`);
  }
  return { countries: found, admins };
}

const SEGMENTS = /\s*(?:[;|·•\n]|\s\/\s|\bor\b|\band\b)\s*/i;
const PARTS = /\s*(?:,|\s[-–—]\s|[():>])\s*/;

// The first city a job's location names, or null: "Austin, TX" is Austin, Texas; "Remote - US" is none.
// `countries` are the country codes already read from it (job-places.ts), which settle a shared name.
export function geocode(location: string, countries: readonly string[] = []): City | null {
  const text = location.trim();
  if (!text) return null;
  for (const segment of text.split(SEGMENTS)) {
    const whole = cityKey(segment);
    if (!whole) continue;
    const raw = segment.split(PARTS);
    const parts = raw.map(cityKey);
    const hints = hintsOf(parts, raw, countries);
    const direct = ALIASES[whole] ? pick(whole, hints) : null;
    if (direct) return direct;
    for (const part of parts) {
      if (!cityLike(part)) continue;
      const city =
        pick(part, hints) ?? pick(part.replace(NOISE, " ").replace(/\s+/g, " ").trim(), hints);
      if (city) return city;
    }
    // Workday writes "USA-CA-San Jose" and "IND-Bangalore".
    const dashed = segment.split("-");
    const last = cityKey(dashed.at(-1) ?? "");
    if (dashed.length > 1 && cityLike(last)) {
      const city = pick(last, hintsOf(dashed.map(cityKey), dashed, countries));
      if (city) return city;
    }
  }
  return null;
}
