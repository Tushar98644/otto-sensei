import { describe, expect, it } from "vitest";
import { calendarFileName, interviewCalendar, interviewTitle } from "./calendar-file";

const NOW = Date.UTC(2026, 10, 22, 9, 30);
const ORIGIN = "https://ottosensei.com";

function lines(ics: string): string[] {
  return ics.split("\r\n");
}

describe("the interview's calendar file", () => {
  it("is an all-day event on the interview's own day, linking back to the prep", () => {
    const ics = interviewCalendar(
      {
        applicationId: "c02e",
        company: "Stripe",
        role: "Senior Product Designer",
        interviewAt: new Date(2026, 10, 23, 15).getTime(),
        interviewTime: null,
        interviewZone: null,
      },
      ORIGIN,
      NOW,
    );
    expect(lines(ics)).toEqual(
      expect.arrayContaining([
        "BEGIN:VCALENDAR",
        "DTSTART;VALUE=DATE:20261123",
        "DTEND;VALUE=DATE:20261124",
        "DTSTAMP:20261122T093000Z",
        "SUMMARY:Interview: Senior Product Designer at Stripe",
        "URL:https://ottosensei.com/dashboard/interview/c02e",
        "TRIGGER:-PT15H",
      ]),
    );
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("ends on the next day across a month's end", () => {
    const ics = interviewCalendar(
      {
        applicationId: "a",
        company: "Figma",
        role: "",
        interviewAt: new Date(2026, 10, 30, 9).getTime(),
        interviewTime: null,
        interviewZone: null,
      },
      ORIGIN,
      NOW,
    );
    expect(lines(ics)).toContain("DTEND;VALUE=DATE:20261201");
  });

  it("escapes commas and semicolons and keeps every line within 75 bytes", () => {
    const ics = interviewCalendar(
      {
        applicationId: "a",
        company: "Acme, Inc; Labs",
        role: "Principal Product Designer, Platform and Developer Experience",
        interviewAt: new Date(2026, 10, 23, 9).getTime(),
        interviewTime: null,
        interviewZone: null,
      },
      ORIGIN,
      NOW,
    );
    const encoder = new TextEncoder();
    expect(ics.replace(/\r\n /g, "")).toContain(
      "Platform and Developer Experience at Acme\\, Inc\\; Labs",
    );
    expect(lines(ics).every((line) => encoder.encode(line).length <= 75)).toBe(true);
  });

  it("names the event and the file after the job", () => {
    expect(interviewTitle({ company: "Stripe", role: "" })).toBe("Interview: Stripe");
    expect(interviewTitle({ company: "", role: "" })).toBe("Interview");
    expect(calendarFileName("Stripe, Inc.")).toBe("stripe-interview.ics");
    expect(calendarFileName("")).toBe("my-interview.ics");
  });
});
