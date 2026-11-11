export type Zone = { label: string } & ({ timeZone: string } | { fixed: number });

export type TimeRule =
  | { kind: "range"; label: string; min: Zone; max: Zone }
  | { kind: "within"; zone: Zone; hours: number }
  | { kind: "overlap"; zone: Zone; hours: number | null }
  | { kind: "zone"; zones: Zone[] };

export function offsetMinutes(timeZone: string, at: number): number | null {
  try {
    const name = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
      .formatToParts(at)
      .find((part) => part.type === "timeZoneName")?.value;
    if (!name) return null;
    if (name === "GMT") return 0;
    const match = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(name);
    if (!match) return null;
    const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0);
    return match[1] === "-" ? -minutes : minutes;
  } catch {
    return null;
  }
}

export function zoneOffset(zone: Zone, at: number): number | null {
  return "fixed" in zone ? zone.fixed : offsetMinutes(zone.timeZone, at);
}

export function formatOffset(minutes: number): string {
  if (minutes === 0) return "UTC";
  const sign = minutes > 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  const rest = abs % 60;
  return `UTC${sign}${Math.floor(abs / 60)}${rest ? `:${String(rest).padStart(2, "0")}` : ""}`;
}

export function formatHours(minutes: number): string {
  const hours = Math.round((minutes / 60) * 4) / 4;
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

export function gapMinutes(a: number, b: number): number {
  const raw = Math.abs(a - b) % 1440;
  return Math.min(raw, 1440 - raw);
}

const iana = (label: string, timeZone: string): Zone => ({ label, timeZone });

const NAMED: Array<[string, Zone]> = [
  ["Central European(?: Standard| Summer)? [Tt]ime|CEST|CET", iana("CET", "Europe/Berlin")],
  ["Eastern European(?: Standard| Summer)? [Tt]ime|EEST|EET", iana("EET", "Europe/Helsinki")],
  ["Western European(?: Summer)? [Tt]ime|WEST|WET", iana("WET", "Europe/Lisbon")],
  [
    "Pacific(?: Standard| Daylight)? [Tt]ime|US[- ]Pacific|PST|PDT|PT",
    iana("Pacific time", "America/Los_Angeles"),
  ],
  [
    "Mountain(?: Standard| Daylight)? [Tt]ime|US[- ]Mountain|MST|MDT|MT",
    iana("Mountain time", "America/Denver"),
  ],
  [
    "Central(?: Standard| Daylight)? [Tt]ime|US[- ]Central|CST|CDT|CT",
    iana("Central time", "America/Chicago"),
  ],
  [
    "Eastern(?: Standard| Daylight)? [Tt]ime|US[- ]Eastern|EST|EDT|ET",
    iana("Eastern time", "America/New_York"),
  ],
  ["UK [Tt]ime|London [Tt]ime|GMT|BST", iana("UK time", "Europe/London")],
  ["UTC", { label: "UTC", fixed: 0 }],
  ["India(?: Standard)? [Tt]ime|IST", iana("India time", "Asia/Kolkata")],
  ["Singapore [Tt]ime|SGT", iana("Singapore time", "Asia/Singapore")],
  ["JST", iana("Japan time", "Asia/Tokyo")],
  ["AEST|AEDT|AET", iana("Sydney time", "Australia/Sydney")],
  ["NZST|NZDT", iana("New Zealand time", "Pacific/Auckland")],
  ["BRT", iana("Brazil time", "America/Sao_Paulo")],
];

const NAMED_PATTERNS = NAMED.map(([source, zone]): [RegExp, Zone] => [
  new RegExp(`\\b(?:${source})\\b`, "g"),
  zone,
]);

const OFFSET = String.raw`(?:UTC|GMT)\s?([+\-−–])\s?(\d{1,2})(?::?(\d{2}))?`;

function offsetFrom(sign: string | undefined, hours: string | undefined, minutes?: string): number {
  const value = Number(hours ?? 0) * 60 + Number(minutes ?? 0);
  return sign === "+" ? value : -value;
}

function fixedZone(minutes: number): Zone {
  return { label: formatOffset(minutes), fixed: minutes };
}

type Spot = { zone: Zone; index: number };

function zonesIn(line: string): Spot[] {
  const spots: Spot[] = [];
  const taken: Array<[number, number]> = [];
  const take = (index: number, length: number) => {
    if (taken.some(([a, b]) => index < b && index + length > a)) return false;
    taken.push([index, index + length]);
    return true;
  };
  for (const match of line.matchAll(new RegExp(OFFSET, "g"))) {
    if (take(match.index, match[0].length)) {
      spots.push({
        zone: fixedZone(offsetFrom(sign(match[1]), match[2], match[3])),
        index: match.index,
      });
    }
  }
  for (const [pattern, zone] of NAMED_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of line.matchAll(pattern)) {
      if (take(match.index, match[0].length)) spots.push({ zone, index: match.index });
    }
  }
  return spots.sort((a, b) => a.index - b.index);
}

function sign(value: string | undefined): string {
  return value === "+" ? "+" : "-";
}

const GROUPS: Array<[RegExp, string, string, string]> = [
  [
    /\b(?:EU|European|Europe|CET|EMEA)\s+time[- ]?zones?\b/i,
    "European time zones",
    "Europe/London",
    "Europe/Helsinki",
  ],
  [
    /\b(?:US|U\.S\.|American|United States)\s+time[- ]?zones?\b/i,
    "US time zones",
    "America/Los_Angeles",
    "America/New_York",
  ],
  [
    /\bNorth American?\s+time[- ]?zones?\b/i,
    "North American time zones",
    "America/Los_Angeles",
    "America/New_York",
  ],
  [
    /\bAmericas\s+time[- ]?zones?\b/i,
    "Americas time zones",
    "America/Los_Angeles",
    "America/Sao_Paulo",
  ],
  [
    /\b(?:LATAM|Latin American?)\s+time[- ]?zones?\b/i,
    "Latin American time zones",
    "America/Mexico_City",
    "America/Sao_Paulo",
  ],
  [
    /\b(?:APAC|Asia[- ]Pacific|Asian)\s+time[- ]?zones?\b/i,
    "Asia-Pacific time zones",
    "Asia/Karachi",
    "Pacific/Auckland",
  ],
];

const WITHIN =
  /\b(?:within|plus or minus)\s+(\d{1,2}(?:\.5)?)\s*(?:hours?|hrs?|h)\b|(?:±|\+\/-|\+-)\s*(\d{1,2}(?:\.5)?)\s*(?:hours?|hrs?|h)?\b/i;
const OVERLAP_HOURS =
  /\b(\d{1,2})\+?\s*(?:hours?|hrs?)\s+(?:of\s+)?(?:daily\s+|working\s+|time\s+)?overlap|\boverlap\s+(?:of\s+|by\s+)?(?:at least\s+|a minimum of\s+)?(\d{1,2})\+?\s*(?:hours?|hrs?)/i;
const OVERLAP = /\boverlap\b/i;
const HOURS = /\bhours\b|\bavailab(?:le|ility)\b|\bschedule\b/i;
const IN_ZONE = /\btime[- ]?zones?\b|\bbased in\b|\blocated in\b/i;

export function findTimeRule(line: string): TimeRule | null {
  for (const [pattern, label, min, max] of GROUPS) {
    if (pattern.test(line))
      return { kind: "range", label, min: iana(label, min), max: iana(label, max) };
  }
  const range = new RegExp(
    `${OFFSET}\\s*(?:to|and|through|-|–|—)\\s*(?:UTC|GMT)?\\s?([+\\-−–])\\s?(\\d{1,2})(?::?(\\d{2}))?`,
    "i",
  ).exec(line);
  if (range) {
    const a = offsetFrom(sign(range[1]), range[2], range[3]);
    const b = offsetFrom(sign(range[4]), range[5], range[6]);
    return {
      kind: "range",
      label: `${formatOffset(Math.min(a, b))} to ${formatOffset(Math.max(a, b))}`,
      min: fixedZone(Math.min(a, b)),
      max: fixedZone(Math.max(a, b)),
    };
  }
  const zones = zonesIn(line);
  const first = zones[0]?.zone;
  if (!first) return null;
  const within = WITHIN.exec(line);
  if (within) return { kind: "within", zone: first, hours: Number(within[1] ?? within[2]) };
  const overlapHours = OVERLAP_HOURS.exec(line);
  if (overlapHours) {
    return { kind: "overlap", zone: first, hours: Number(overlapHours[1] ?? overlapHours[2]) };
  }
  if (OVERLAP.test(line) || HOURS.test(line)) return { kind: "overlap", zone: first, hours: null };
  if (IN_ZONE.test(line)) return { kind: "zone", zones: zones.map((spot) => spot.zone) };
  return null;
}
