import { normalizeText } from "./text";

// zone: the IANA zone the day and time read in, when one is known, so a card can keep them.
export type When = { at: number; text: string; hasTime: boolean; zone: string | null };

// A fixed offset keeps the place its name usually means, used only where that place reads the same.
type Zone = { offset: number; place?: string } | { iana: string };

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH =
  "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const WEEKDAY =
  "(?:(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tues?|wed|thu(?:rs?)?|fri|sat|sun)\\.?,?\\s+)?";
const DATES: readonly { pattern: RegExp; order: "mdy" | "dmy" | "ymd" | "num" }[] = [
  {
    pattern: new RegExp(
      `\\b${WEEKDAY}${MONTH}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:,?\\s+(\\d{4}))?`,
      "gi",
    ),
    order: "mdy",
  },
  {
    pattern: new RegExp(
      `\\b${WEEKDAY}(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTH}\\.?(?:,?\\s*'?(\\d{4}|\\d{2}))?\\b`,
      "gi",
    ),
    order: "dmy",
  },
  { pattern: /\b(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?\b/g, order: "ymd" },
  { pattern: /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})\b/g, order: "num" },
];

const TIME =
  /(?<![\d:/.-])(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?\s?m\.?|p\.?\s?m\.?)(?![a-z])|(?<![\d:/.-])([01]?\d|2[0-3])[:.]([0-5]\d)(?!\d)(?:\s*(?:hrs|hours|h)\b)?/i;

const FIXED: Record<string, number> = {
  IST: 330,
  GMT: 0,
  UTC: 0,
  BST: 60,
  CET: 60,
  CEST: 120,
  EET: 120,
  EEST: 180,
  SGT: 480,
  HKT: 480,
  JST: 540,
  AEST: 600,
  AEDT: 660,
  GST: 240,
  WIB: 420,
  NZST: 720,
  NZDT: 780,
  PST: -480,
  PDT: -420,
  MST: -420,
  MDT: -360,
  CST: -360,
  CDT: -300,
  EST: -300,
  EDT: -240,
};
const PLACES: Record<string, string> = {
  IST: "Asia/Kolkata",
  GMT: "UTC",
  UTC: "UTC",
  BST: "Europe/London",
  CET: "Europe/Paris",
  CEST: "Europe/Paris",
  EET: "Europe/Athens",
  EEST: "Europe/Athens",
  SGT: "Asia/Singapore",
  HKT: "Asia/Hong_Kong",
  JST: "Asia/Tokyo",
  AEST: "Australia/Sydney",
  AEDT: "Australia/Sydney",
  GST: "Asia/Dubai",
  WIB: "Asia/Jakarta",
  NZST: "Pacific/Auckland",
  NZDT: "Pacific/Auckland",
  PST: "America/Los_Angeles",
  PDT: "America/Los_Angeles",
  MST: "America/Denver",
  MDT: "America/Denver",
  CST: "America/Chicago",
  CDT: "America/Chicago",
  EST: "America/New_York",
  EDT: "America/New_York",
};
const NAMED: Record<string, string> = {
  PT: "America/Los_Angeles",
  MT: "America/Denver",
  CT: "America/Chicago",
  ET: "America/New_York",
  AET: "Australia/Sydney",
};
const LONG: readonly [RegExp, Zone][] = [
  [/india standard time|\bindian standard time/i, { offset: 330, place: "Asia/Kolkata" }],
  [/pacific (?:standard |daylight )?time/i, { iana: "America/Los_Angeles" }],
  [/mountain (?:standard |daylight )?time/i, { iana: "America/Denver" }],
  [/central (?:standard |daylight )?time/i, { iana: "America/Chicago" }],
  [/eastern (?:standard |daylight )?time/i, { iana: "America/New_York" }],
  [/british summer time/i, { offset: 60, place: "Europe/London" }],
  [/greenwich mean time|coordinated universal time/i, { offset: 0, place: "UTC" }],
  [/central european summer time/i, { offset: 120, place: "Europe/Paris" }],
  [/central european (?:standard )?time/i, { offset: 60, place: "Europe/Paris" }],
  [/singapore (?:standard )?time/i, { offset: 480, place: "Asia/Singapore" }],
];
const US_ZONES = new Set([
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
]);

function zoneIn(text: string): Zone | null {
  const offset = /\b(?:GMT|UTC)\s?([+-])\s?(\d{1,2})(?::?(\d{2}))?\b/.exec(text);
  if (offset) {
    const minutes = Number(offset[2]) * 60 + Number(offset[3] ?? 0);
    return { offset: offset[1] === "-" ? -minutes : minutes };
  }
  const iana =
    /\b((?:Asia|America|Europe|Australia|Africa|Pacific)\/[A-Za-z_]+(?:\/[A-Za-z_]+)?)\b/.exec(
      text,
    );
  if (iana && validZone(iana[1]!)) return { iana: iana[1]! };
  for (const [pattern, zone] of LONG) if (pattern.test(text)) return zone;
  const short =
    /\b(IST|GMT|UTC|BST|CEST|CET|EEST|EET|SGT|HKT|JST|AEST|AEDT|AET|GST|WIB|NZST|NZDT|PST|PDT|PT|MST|MDT|MT|CST|CDT|CT|EST|EDT|ET)\b/.exec(
      text,
    );
  if (short) {
    const code = short[1]!;
    if (code in FIXED) return { offset: FIXED[code]!, place: PLACES[code] };
    return { iana: NAMED[code]! };
  }
  return null;
}

function validZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

function offsetAt(at: number, zone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return (
    (Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute")) - at) / 60_000
  );
}

// The account's own zone when the time reads the same there, else the one the email named.
function placeOf(zone: Zone, at: number, account: string | null): string | null {
  const offset = "iana" in zone ? offsetAt(at, zone.iana) : zone.offset;
  const named = "iana" in zone ? zone.iana : (zone.place ?? (zone.offset === 0 ? "UTC" : null));
  for (const candidate of [account, named]) {
    if (candidate && validZone(candidate) && offsetAt(at, candidate) === offset) return candidate;
  }
  return null;
}

function toEpoch(y: number, m: number, d: number, h: number, min: number, zone: Zone): number {
  const wall = Date.UTC(y, m - 1, d, h, min);
  if ("offset" in zone) return wall - zone.offset * 60_000;
  const first = wall - offsetAt(wall, zone.iana) * 60_000;
  return wall - offsetAt(first, zone.iana) * 60_000;
}

function monthOf(name: string): number {
  return MONTHS.indexOf(name.slice(0, 3).toLowerCase()) + 1;
}

type Day = {
  y: number | null;
  m: number;
  d: number;
  start: number;
  end: number;
  hour?: number;
  minute?: number;
};

function daysIn(text: string, usOrder: boolean): Day[] {
  const days: Day[] = [];
  for (const { pattern, order } of DATES) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const at = match.index ?? 0;
      const span = { start: at, end: at + match[0].length };
      if (days.some((day) => span.start < day.end && day.start < span.end)) continue;
      const g = match.slice(1);
      let day: Day | null = null;
      if (order === "mdy")
        day = { y: g[2] ? Number(g[2]) : null, m: monthOf(g[0]!), d: Number(g[1]), ...span };
      if (order === "dmy") {
        const year = g[2] ? Number(g[2].length === 2 ? `20${g[2]}` : g[2]) : null;
        day = { y: year, m: monthOf(g[1]!), d: Number(g[0]), ...span };
      }
      if (order === "ymd") {
        day = { y: Number(g[0]), m: Number(g[1]), d: Number(g[2]), ...span };
        if (g[3]) Object.assign(day, { hour: Number(g[3]), minute: Number(g[4]) });
      }
      if (order === "num") {
        const [a, b] = [Number(g[0]), Number(g[1])];
        const y = Number(g[2]!.length === 2 ? `20${g[2]}` : g[2]);
        const monthFirst = a <= 12 && (b > 12 || (usOrder && b <= 12));
        day = monthFirst ? { y, m: a, d: b, ...span } : { y, m: b, d: a, ...span };
      }
      if (day && day.m >= 1 && day.m <= 12 && day.d >= 1 && day.d <= 31) days.push(day);
    }
  }
  return days.sort((a, b) => a.start - b.start);
}

function timeOf(match: RegExpExecArray): { hour: number; minute: number } | null {
  if (match[3]) {
    let hour = Number(match[1]);
    const minute = Number(match[2] ?? 0);
    if (hour < 1 || hour > 12 || minute > 59) return null;
    const pm = match[3].toLowerCase().startsWith("p");
    if (pm && hour < 12) hour += 12;
    if (!pm && hour === 12) hour = 0;
    return { hour, minute };
  }
  return { hour: Number(match[4]), minute: Number(match[5]) };
}

// What may follow the start time in the readable text: an end time, then the zone.
const ZONE_AFTER =
  /^(?:\s*(?:-|to)\s*\d{1,2}(?:[:.]\d{2})?\s*(?:[AaPp]\.?\s?[Mm]\.?)?)?\s*\(?(?:(?:GMT|UTC)\s?[+-]\s?\d{1,2}(?::?\d{2})?|[A-Z]{2,5}\b|[A-Z][a-z]+ (?:Standard |Daylight )?Time)\)?/;

const CALENDAR =
  /DTSTART(?:;TZID=([^:;\n]+))?(?:;VALUE=DATE-TIME)?:(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})\d{0,2}(Z)?/;
const OFFERS_CHOICE =
  /\b(?:slots?|options?|following times|any of (?:these|the)|which (?:time|works|suits)|choose|pick|select|propose|alternatives?)\b/i;

function fromCalendar(text: string, fallback: Zone, account: string | null): When | null {
  const match = CALENDAR.exec(text);
  if (!match) return null;
  const [, tzid, y, m, d, h, min, utc] = match;
  const zone: Zone = utc
    ? { offset: 0 }
    : tzid && validZone(tzid.trim())
      ? { iana: tzid.trim() }
      : fallback;
  const at = toEpoch(Number(y), Number(m), Number(d), Number(h), Number(min), zone);
  // An invite written in UTC names no place: it reads in the account's own zone.
  const place = utc ? (account ?? "UTC") : placeOf(zone, at, account);
  return { at, text: "", hasTime: true, zone: place };
}

function readable(source: string, start: number, end: number): string {
  return source
    .slice(start, end)
    .replace(/\s+/g, " ")
    .replace(/[\s,(]+$/, "")
    .trim()
    .slice(0, 120);
}

export function findWhen(
  subject: string,
  body: string,
  { sentAt, zone }: { sentAt: number; zone: string | null },
): When | null {
  const account = zone && validZone(zone) ? zone : null;
  const fallback: Zone = account ? { iana: account } : { offset: 0 };
  const text = normalizeText(`${subject}\n${body}`).slice(0, 12_000);
  const calendar = fromCalendar(text, fallback, account);
  const statedZone = zoneIn(text);
  const usOrder = statedZone !== null && "iana" in statedZone && US_ZONES.has(statedZone.iana);
  const found: (When & { start: number })[] = [];
  for (const day of daysIn(text, usOrder)) {
    const after = text.slice(day.end, day.end + 90);
    const before = text.slice(Math.max(0, day.start - 60), day.start);
    const late = TIME.exec(after);
    const early =
      /(\d{1,2}(?:[:.]\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)|\b(?:[01]?\d|2[0-3])[:.][0-5]\d)\s*(?:-|to|–)\s*\d{1,2}(?:[:.]\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?\s*,?\s*(?:on\s+)?$/i.exec(
        before,
      );
    const earlyTime = early ? TIME.exec(early[1]!) : null;
    const clock =
      day.hour !== undefined
        ? { hour: day.hour, minute: day.minute ?? 0 }
        : late
          ? timeOf(late)
          : earlyTime
            ? timeOf(earlyTime)
            : null;
    const nearby = late
      ? text.slice(day.end, day.end + (late.index ?? 0) + late[0].length + 40)
      : early
        ? before
        : "";
    const zoneHere = (nearby ? zoneIn(nearby) : null) ?? statedZone ?? fallback;
    let year = day.y ?? new Date(sentAt).getUTCFullYear();
    let at = toEpoch(year, day.m, day.d, clock?.hour ?? 12, clock?.minute ?? 0, zoneHere);
    if (day.y === null && at < sentAt - 7 * 86_400_000) {
      year += 1;
      at = toEpoch(year, day.m, day.d, clock?.hour ?? 12, clock?.minute ?? 0, zoneHere);
    }
    const check = new Date(Date.UTC(year, day.m - 1, day.d));
    if (check.getUTCMonth() !== day.m - 1) continue;
    const zoneEnd = late ? day.end + (late.index ?? 0) + late[0].length : day.end;
    const tail = text.slice(zoneEnd, zoneEnd + 60);
    const zoneText = late ? ZONE_AFTER.exec(tail) : null;
    const start = early && !late ? day.start - early[0].length : day.start;
    const end = zoneText ? zoneEnd + zoneText[0].length : zoneEnd;
    found.push({
      at,
      hasTime: clock !== null,
      text: readable(text, start, end),
      zone: placeOf(zoneHere, at, account),
      start,
    });
  }
  const ahead = found.filter(
    (when) => when.at >= sentAt - 12 * 3_600_000 && when.at <= sentAt + 366 * 86_400_000,
  );
  if (calendar && calendar.at >= sentAt - 12 * 3_600_000) {
    return {
      ...calendar,
      text:
        ahead.find((when) => Math.abs(when.at - calendar.at) < 60_000)?.text ??
        ahead[0]?.text ??
        "",
    };
  }
  const subjectEnd = subject.length;
  const inSubject = ahead.find((when) => when.start < subjectEnd);
  const timed = ahead.filter((when) => when.hasTime);
  if (inSubject) {
    // A subject that names only the day borrows the body's time for that same day.
    const sameDay = inSubject.hasTime
      ? null
      : timed.find(
          (when) => when.start >= subjectEnd && Math.abs(when.at - inSubject.at) < 86_400_000,
        );
    return strip(sameDay ?? inSubject);
  }
  const distinct = new Set(timed.map((when) => when.at));
  if (distinct.size > 1 && OFFERS_CHOICE.test(body)) return null;
  const pick = timed[0] ?? ahead[0];
  return pick ? strip(pick) : null;
}

function strip({ at, text, hasTime, zone }: When): When {
  return { at, text, hasTime, zone };
}
