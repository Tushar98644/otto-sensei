import { describe, expect, it } from "vitest";
import { calendarDocument, escapeText, vtimezone, type IcsEvent } from "./ics";
import {
  addBusinessDays,
  dayKey,
  interviewStart,
  offsetAt,
  zonedInstant,
  zoneOrUtc,
} from "./zones";

const lines = (ics: string) => ics.replace(/\r\n /g, "").split("\r\n");

function event(overrides: Partial<IcsEvent> = {}): IcsEvent {
  return {
    uid: "interview-a@ottosensei.com",
    stamp: Date.UTC(2026, 10, 22, 9, 30),
    summary: "Interview: Designer at Stripe",
    description: "Your interview prep: https://otto.test/dashboard/interview/a",
    url: "https://otto.test/dashboard/interview/a",
    when: { kind: "day", date: { year: 2026, month: 11, day: 23 } },
    busy: false,
    alarm: null,
    ...overrides,
  };
}

describe("zone math", () => {
  it("reads offsets on either side of a clock change", () => {
    expect(offsetAt(Date.UTC(2026, 0, 15), "America/New_York")).toBe(-300);
    expect(offsetAt(Date.UTC(2026, 6, 15), "America/New_York")).toBe(-240);
    expect(offsetAt(Date.UTC(2026, 6, 15), "Asia/Kolkata")).toBe(330);
    expect(offsetAt(Date.UTC(2026, 0, 15), "Australia/Sydney")).toBe(660);
  });

  it("turns a wall time in a zone into the instant, across DST", () => {
    const winter = { year: 2026, month: 1, day: 15, hour: 14, minute: 30 };
    const summer = { year: 2026, month: 7, day: 15, hour: 14, minute: 30 };
    expect(zonedInstant(winter, "America/New_York")).toBe(Date.UTC(2026, 0, 15, 19, 30));
    expect(zonedInstant(summer, "America/New_York")).toBe(Date.UTC(2026, 6, 15, 18, 30));
    expect(zonedInstant(summer, "Asia/Kolkata")).toBe(Date.UTC(2026, 6, 15, 9, 0));
  });

  it("places a typed time on the interview's own day in its zone", () => {
    // Saved as local noon on 23 November in Kolkata.
    const day = Date.UTC(2026, 10, 23, 6, 30);
    expect(interviewStart(day, 14 * 60 + 30, "Asia/Kolkata")).toBe(Date.UTC(2026, 10, 23, 9, 0));
    expect(interviewStart(day, null, "Asia/Kolkata")).toBeNull();
    expect(dayKey(day, "Asia/Kolkata")).toBe("2026-11-23");
  });

  it("counts business days past a weekend", () => {
    const friday = { year: 2026, month: 11, day: 20, hour: 0, minute: 0 };
    expect(addBusinessDays(friday, 5)).toMatchObject({ month: 11, day: 27 });
    const wednesday = { year: 2026, month: 11, day: 25, hour: 0, minute: 0 };
    expect(addBusinessDays(wednesday, 5)).toMatchObject({ month: 12, day: 2 });
  });

  it("falls back to UTC for a zone it doesn't know", () => {
    expect(zoneOrUtc("Mars/Olympus")).toBe("UTC");
    expect(zoneOrUtc(null)).toBe("UTC");
    expect(zoneOrUtc("Europe/Berlin")).toBe("Europe/Berlin");
  });
});

describe("VTIMEZONE", () => {
  it("lists New York's two clock changes in a year, as Outlook needs them", () => {
    const block = vtimezone("America/New_York", 2026, 2026);
    expect(block[0]).toBe("BEGIN:VTIMEZONE");
    expect(block).toContain("TZID:America/New_York");
    const text = block.join("\n");
    expect(text).toContain(
      "BEGIN:DAYLIGHT\nDTSTART:20260308T020000\nTZOFFSETFROM:-0500\nTZOFFSETTO:-0400\nEND:DAYLIGHT",
    );
    expect(text).toContain(
      "BEGIN:STANDARD\nDTSTART:20261101T020000\nTZOFFSETFROM:-0400\nTZOFFSETTO:-0500\nEND:STANDARD",
    );
  });

  it("gives a zone without daylight saving one fixed offset", () => {
    const text = vtimezone("Asia/Kolkata", 2026, 2027).join("\n");
    expect(text).toContain("TZOFFSETFROM:+0530\nTZOFFSETTO:+0530");
    expect(text.match(/BEGIN:STANDARD/g)).toHaveLength(1);
    expect(text).not.toContain("DAYLIGHT");
  });

  it("starts the southern summer in daylight time", () => {
    const text = vtimezone("Australia/Sydney", 2026, 2026).join("\n");
    expect(text).toMatch(
      /^BEGIN:VTIMEZONE\nTZID:Australia\/Sydney\nBEGIN:DAYLIGHT\nDTSTART:20260101T000000\nTZOFFSETFROM:\+1100/,
    );
    expect(text).toContain("DTSTART:20260405T030000\nTZOFFSETFROM:+1100\nTZOFFSETTO:+1000");
  });
});

describe("calendarDocument", () => {
  it("writes a timed event in its own zone, with the zone defined once", () => {
    const start = Date.UTC(2026, 10, 23, 9, 0);
    const ics = calendarDocument({
      events: [
        event({ when: { kind: "time", start, minutes: 60, zone: "Asia/Kolkata" }, busy: true }),
        event({
          uid: "interview-b@ottosensei.com",
          when: { kind: "time", start: start + 86_400_000, minutes: 60, zone: "Asia/Kolkata" },
        }),
      ],
    });
    const all = lines(ics);
    expect(all).toContain("DTSTART;TZID=Asia/Kolkata:20261123T143000");
    expect(all).toContain("DTEND;TZID=Asia/Kolkata:20261123T153000");
    expect(all).toContain("TRANSP:OPAQUE");
    expect(all.filter((line) => line === "BEGIN:VTIMEZONE")).toHaveLength(1);
    expect(all.indexOf("END:VTIMEZONE")).toBeLessThan(all.indexOf("BEGIN:VEVENT"));
  });

  it("writes UTC times with a Z and no VTIMEZONE", () => {
    const ics = calendarDocument({
      events: [
        event({
          when: { kind: "time", start: Date.UTC(2026, 10, 23, 15), minutes: 60, zone: "UTC" },
        }),
      ],
    });
    expect(lines(ics)).toContain("DTSTART:20261123T150000Z");
    expect(ics).not.toContain("VTIMEZONE");
  });

  it("escapes text, folds long lines within 75 bytes and ends every line with CRLF", () => {
    const summary = "Interview: Principal Designer, Platform; Developer Experience at Acme, Inc";
    const ics = calendarDocument({
      events: [event({ summary, description: "Line one\nLine two \\ done" })],
    });
    const encoder = new TextEncoder();
    expect(ics.split("\r\n").every((line) => encoder.encode(line).length <= 75)).toBe(true);
    expect(ics.replace(/\r\n /g, "")).toContain(`SUMMARY:${escapeText(summary)}`);
    expect(escapeText(summary)).toContain("Designer\\, Platform\\; Developer");
    expect(lines(ics)).toContain("DESCRIPTION:Line one\\nLine two \\\\ done");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });

  it("names a feed and asks calendars to read it again hourly", () => {
    const all = lines(
      calendarDocument({
        events: [],
        feed: {
          name: "Otto Sensei interviews",
          description: "Yours",
          timeZone: "Europe/Berlin",
          refreshHours: 1,
        },
      }),
    );
    expect(all).toEqual(
      expect.arrayContaining([
        "X-WR-CALNAME:Otto Sensei interviews",
        "X-WR-TIMEZONE:Europe/Berlin",
        "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
        "X-PUBLISHED-TTL:PT1H",
      ]),
    );
  });
});
