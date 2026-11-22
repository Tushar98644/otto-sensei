import { describe, expect, it } from "vitest";
import { calendarFeed, feedEvents, type FeedApplication } from "./feed";

const NOW = Date.UTC(2026, 10, 22, 9, 0);
const DAY = 86_400_000;
const ORIGIN = "https://otto.test";

function app(overrides: Partial<FeedApplication> = {}): FeedApplication {
  return {
    applicationId: "a1",
    company: "Stripe",
    role: "Product Designer",
    status: "interview",
    statusChangedAt: NOW - 3 * DAY,
    // Local noon on 24 November in Kolkata, as the board saves a day.
    interviewAt: Date.UTC(2026, 10, 24, 6, 30),
    interviewTime: null,
    interviewZone: null,
    followUpAt: null,
    updatedAt: NOW - DAY,
    ...overrides,
  };
}

const unfold = (ics: string) => ics.replace(/\r\n /g, "").split("\r\n");
const options = { origin: ORIGIN, timeZone: "Asia/Kolkata", now: NOW };

describe("the calendar feed", () => {
  it("puts a timed interview at its time in the zone it was typed in, linking to its prep", () => {
    const ics = calendarFeed(
      [
        app({
          interviewTime: 15 * 60,
          interviewZone: "America/New_York",
          interviewAt: Date.UTC(2026, 10, 24, 17),
        }),
      ],
      options,
    );
    const all = unfold(ics);
    expect(all).toEqual(
      expect.arrayContaining([
        "UID:interview-a1@ottosensei.com",
        "DTSTART;TZID=America/New_York:20261124T150000",
        "DTEND;TZID=America/New_York:20261124T160000",
        "SUMMARY:Interview: Product Designer at Stripe",
        "URL:https://otto.test/dashboard/interview/a1",
        "TRIGGER:-PT1H",
        "TZID:America/New_York",
      ]),
    );
    // Opening the event never starts a pack.
    expect(ics).not.toContain("start=1");
  });

  it("makes a day with no time an all-day event in the account's zone", () => {
    const all = unfold(calendarFeed([app()], options));
    expect(all).toContain("DTSTART;VALUE=DATE:20261124");
    expect(all).toContain("DTEND;VALUE=DATE:20261125");
    expect(all).toContain("TRANSP:TRANSPARENT");
    expect(all).toContain("TRIGGER:-PT15H");
  });

  it("adds each follow-up day as an all-day reminder, for applied and interviewed jobs only", () => {
    const events = feedEvents(
      [
        app({
          applicationId: "f1",
          company: "Linear",
          status: "applied",
          interviewAt: null,
          followUpAt: Date.UTC(2026, 10, 26, 3),
        }),
        app({ applicationId: "f2", company: "Figma", followUpAt: Date.UTC(2026, 10, 30, 3) }),
        app({
          applicationId: "f3",
          status: "rejected",
          interviewAt: null,
          followUpAt: Date.UTC(2026, 10, 30),
        }),
      ],
      options,
    );
    const followUps = events.filter((item) => item.uid.startsWith("follow-up-"));
    expect(followUps.map((item) => item.summary)).toEqual([
      "Follow up with Linear",
      "Follow up with Figma",
    ]);
    expect(followUps[0]?.when).toEqual({
      kind: "day",
      date: expect.objectContaining({ month: 11, day: 26 }),
    });
    expect(followUps[0]?.url).toBe("https://otto.test/dashboard/applications/f1");
  });

  it("drops an interview booked and then closed before its day, and keeps one that happened", () => {
    const interviewAt = Date.UTC(2026, 10, 18, 6, 30);
    const events = feedEvents(
      [
        app({
          applicationId: "gone",
          status: "rejected",
          interviewAt,
          statusChangedAt: interviewAt - DAY,
        }),
        app({
          applicationId: "held",
          status: "rejected",
          interviewAt,
          statusChangedAt: interviewAt + DAY,
        }),
        app({ applicationId: "offer", status: "offer", interviewAt }),
        app({ applicationId: "old", interviewAt: NOW - 200 * DAY }),
      ],
      options,
    );
    expect(events.map((item) => item.uid)).toEqual([
      "interview-held@ottosensei.com",
      "interview-offer@ottosensei.com",
    ]);
  });

  it("changes when an interview moves, and loses it when the day is cleared", () => {
    const before = unfold(calendarFeed([app()], options));
    const moved = unfold(
      calendarFeed(
        [
          app({
            interviewAt: Date.UTC(2026, 10, 26, 6, 30),
            interviewTime: 10 * 60,
            interviewZone: "Asia/Kolkata",
            updatedAt: NOW,
          }),
        ],
        options,
      ),
    );
    expect(before).toContain("DTSTART;VALUE=DATE:20261124");
    expect(moved).toContain("DTSTART;TZID=Asia/Kolkata:20261126T100000");
    expect(moved).toContain("DTSTAMP:20261122T090000Z");
    expect(moved).toContain("LAST-MODIFIED:20261122T090000Z");
    expect(before.find((line) => line.startsWith("UID:"))).toBe(
      moved.find((line) => line.startsWith("UID:")),
    );
    const cleared = calendarFeed([app({ interviewAt: null })], options);
    expect(cleared).not.toContain("BEGIN:VEVENT");
    expect(cleared).toContain("X-WR-CALNAME:Otto Sensei interviews");
  });

  it("escapes the company and role the person typed", () => {
    const ics = calendarFeed(
      [app({ company: "Acme, Inc; Labs", role: "Designer\nLead" })],
      options,
    );
    expect(ics.replace(/\r\n /g, "")).toContain(
      "SUMMARY:Interview: Designer\\nLead at Acme\\, Inc\\; Labs",
    );
  });
});
