import { BRAND } from "@/config/brand";
import { DAY_MS, MINUTE_MS } from "@/lib/time";
import { offsetAt, wallTime, zonedInstant, type WallTime } from "./zones";

// RFC 5545 text for calendar files and the subscribed feed: escaped, folded and CRLF-ended.

export type IcsWhen =
  | { kind: "day"; date: Pick<WallTime, "year" | "month" | "day"> }
  | { kind: "time"; start: number; minutes: number; zone: string };

export type IcsEvent = {
  uid: string;
  // DTSTAMP and LAST-MODIFIED: when the event last changed, so calendars take the new copy.
  stamp: number;
  summary: string;
  description: string;
  url: string;
  when: IcsWhen;
  busy: boolean;
  alarm: { trigger: string; description: string } | null;
};

export type IcsCalendar = {
  events: readonly IcsEvent[];
  // Set for a subscribed feed: its name in the calendar list and how often to read it again.
  feed?: { name: string; description: string; timeZone: string; refreshHours: number };
};

export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// A line is capped at 75 octets; longer ones continue on lines that start with a space.
export function fold(line: string): string {
  const bytes = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  for (const char of line) {
    const limit = parts.length === 0 ? 75 : 74;
    if (bytes.encode(current + char).length > limit) {
      parts.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.join("\r\n ");
}

const pad = (value: number, size = 2) => String(Math.abs(value)).padStart(size, "0");

export function dateValue({ year, month, day }: Pick<WallTime, "year" | "month" | "day">): string {
  return `${pad(year, 4)}${pad(month)}${pad(day)}`;
}

function localValue(wall: WallTime, second = 0): string {
  return `${dateValue(wall)}T${pad(wall.hour)}${pad(wall.minute)}${pad(second)}`;
}

export function utcStamp(at: number): string {
  return new Date(at)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function shifted(at: number, offset: number): WallTime {
  const date = new Date(at + offset * MINUTE_MS);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
  };
}

function offsetValue(minutes: number): string {
  const sign = minutes < 0 ? "-" : "+";
  return `${sign}${pad(Math.floor(Math.abs(minutes) / 60))}${pad(Math.abs(minutes) % 60)}`;
}

type Change = { at: number; from: number; to: number };

// Every clock change between two instants, found a day at a time and then to the minute.
function changesBetween(zone: string, start: number, end: number): Change[] {
  const changes: Change[] = [];
  let at = start;
  let offset = offsetAt(at, zone);
  while (at < end) {
    const next = Math.min(at + DAY_MS, end);
    const nextOffset = offsetAt(next, zone);
    if (nextOffset !== offset) {
      let low = at;
      let high = next;
      while (high - low > MINUTE_MS) {
        const mid = Math.floor((low + high) / 2 / MINUTE_MS) * MINUTE_MS;
        if (offsetAt(mid, zone) === offset) low = mid;
        else high = mid;
      }
      changes.push({ at: high, from: offset, to: nextOffset });
      offset = nextOffset;
    }
    at = next;
  }
  return changes;
}

function observance(kind: "STANDARD" | "DAYLIGHT", start: string, from: number, to: number) {
  return [
    `BEGIN:${kind}`,
    `DTSTART:${start}`,
    `TZOFFSETFROM:${offsetValue(from)}`,
    `TZOFFSETTO:${offsetValue(to)}`,
    `END:${kind}`,
  ];
}

// The zone's offsets over whole years, as calendars that don't know IANA names (Outlook) need them.
export function vtimezone(zone: string, fromYear: number, toYear: number): string[] {
  const start = zonedInstant({ year: fromYear, month: 1, day: 1, hour: 0, minute: 0 }, zone);
  const end = zonedInstant({ year: toYear + 1, month: 1, day: 1, hour: 0, minute: 0 }, zone);
  const first = offsetAt(start, zone);
  const halfYear = offsetAt(start + 182 * DAY_MS, zone);
  const lines = [
    "BEGIN:VTIMEZONE",
    `TZID:${zone}`,
    ...observance(
      first > halfYear ? "DAYLIGHT" : "STANDARD",
      localValue(wallTime(start, zone)),
      first,
      first,
    ),
  ];
  for (const change of changesBetween(zone, start, end)) {
    // The onset is read on the clock as it was just before the change.
    const onset = localValue(shifted(change.at, change.from));
    const kind = change.to > change.from ? "DAYLIGHT" : "STANDARD";
    lines.push(...observance(kind, onset, change.from, change.to));
  }
  lines.push("END:VTIMEZONE");
  return lines;
}

function whenLines(when: IcsWhen): string[] {
  if (when.kind === "day") {
    const next = new Date(Date.UTC(when.date.year, when.date.month - 1, when.date.day + 1));
    const after = {
      year: next.getUTCFullYear(),
      month: next.getUTCMonth() + 1,
      day: next.getUTCDate(),
    };
    return [`DTSTART;VALUE=DATE:${dateValue(when.date)}`, `DTEND;VALUE=DATE:${dateValue(after)}`];
  }
  const end = when.start + when.minutes * MINUTE_MS;
  if (when.zone === "UTC") return [`DTSTART:${utcStamp(when.start)}`, `DTEND:${utcStamp(end)}`];
  return [
    `DTSTART;TZID=${when.zone}:${localValue(wallTime(when.start, when.zone))}`,
    `DTEND;TZID=${when.zone}:${localValue(wallTime(end, when.zone))}`,
  ];
}

function eventLines(event: IcsEvent): string[] {
  return [
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${utcStamp(event.stamp)}`,
    `LAST-MODIFIED:${utcStamp(event.stamp)}`,
    ...whenLines(event.when),
    `SUMMARY:${escapeText(event.summary)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    `URL:${event.url}`,
    `TRANSP:${event.busy ? "OPAQUE" : "TRANSPARENT"}`,
    ...(event.alarm
      ? [
          "BEGIN:VALARM",
          "ACTION:DISPLAY",
          `DESCRIPTION:${escapeText(event.alarm.description)}`,
          `TRIGGER:${event.alarm.trigger}`,
          "END:VALARM",
        ]
      : []),
    "END:VEVENT",
  ];
}

// One VTIMEZONE per zone a timed event uses, covering the years its events fall in.
function zoneLines(events: readonly IcsEvent[]): string[] {
  const years = new Map<string, { from: number; to: number }>();
  for (const { when } of events) {
    if (when.kind !== "time" || when.zone === "UTC") continue;
    const year = wallTime(when.start, when.zone).year;
    const known = years.get(when.zone);
    years.set(when.zone, {
      from: Math.min(known?.from ?? year, year),
      to: Math.max(known?.to ?? year, year),
    });
  }
  return [...years].flatMap(([zone, { from, to }]) => vtimezone(zone, from, to));
}

export function calendarDocument({ events, feed }: IcsCalendar): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${BRAND.name}//Interview prep//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...(feed
      ? [
          `NAME:${escapeText(feed.name)}`,
          `X-WR-CALNAME:${escapeText(feed.name)}`,
          `X-WR-CALDESC:${escapeText(feed.description)}`,
          `X-WR-TIMEZONE:${feed.timeZone}`,
          `REFRESH-INTERVAL;VALUE=DURATION:PT${feed.refreshHours}H`,
          `X-PUBLISHED-TTL:PT${feed.refreshHours}H`,
        ]
      : []),
    ...zoneLines(events),
    ...events.flatMap(eventLines),
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}
