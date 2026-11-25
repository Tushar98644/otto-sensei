import { describe, expect, it } from "vitest";
import type { Application } from "@/lib/applications/schema";
import { DAY_MS } from "@/lib/time";
import type { BoardCard, ToApplyItem } from "../board";
import { EN, FORMAT_EN } from "../../../messages-testing";
import { interviewWhen, span, stageTime } from "./when";

const NOW = new Date(2026, 10, 22, 15, 0).getTime();

function app(overrides: Partial<Application> = {}): BoardCard {
  const application: Application = {
    id: "a1",
    resumeId: null,
    resumeTitle: "",
    company: "Stripe",
    role: "Product Designer",
    jobUrl: "",
    appliedAt: NOW,
    status: "applied",
    stageReached: "applied",
    statusChangedAt: NOW,
    notes: "",
    followUpAt: null,
    jobId: null,
    hasPrep: false,
    interviewAt: null,
    interviewTime: null,
    interviewZone: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
  return { kind: "application", key: `application:${application.id}`, application, copy: null };
}

function saved(addedAt: number): BoardCard {
  const item: ToApplyItem = {
    key: "job:1",
    job: null,
    copy: null,
    company: "Notion",
    role: "Designer",
    jobUrl: "",
    jobId: null,
    addedAt,
    closed: false,
  };
  return { kind: "to_apply", key: item.key, item };
}

describe("interviewWhen", () => {
  it("reads the day like a calendar: month, day, then how soon", () => {
    const when = interviewWhen(
      new Date(2026, 10, 23, 9, 0).getTime(),
      NOW,
      EN.applications,
      FORMAT_EN,
    );
    expect(when).toMatchObject({
      month: "NOV",
      day: "23",
      lead: "Tomorrow",
      detail: "Interview · Monday",
      soon: true,
      past: false,
    });
    expect(when.spoken).toBe("November 23, 2026");
  });

  it("counts calendar days, not 24-hour spans", () => {
    expect(
      interviewWhen(new Date(2026, 10, 22, 23, 30).getTime(), NOW, EN.applications, FORMAT_EN).lead,
    ).toBe("Today");
    expect(
      interviewWhen(new Date(2026, 10, 27, 8, 0).getTime(), NOW, EN.applications, FORMAT_EN).lead,
    ).toBe("In 5 days");
    expect(
      interviewWhen(new Date(2026, 10, 21, 18, 0).getTime(), NOW, EN.applications, FORMAT_EN),
    ).toMatchObject({
      lead: "Yesterday",
      past: true,
      soon: false,
    });
    expect(
      interviewWhen(new Date(2026, 10, 19, 12, 0).getTime(), NOW, EN.applications, FORMAT_EN).lead,
    ).toBe("3 days ago");
  });

  it("names the year when the interview falls in another one", () => {
    expect(
      interviewWhen(new Date(2027, 0, 4, 12, 0).getTime(), NOW, EN.applications, FORMAT_EN).detail,
    ).toBe("Interview · Monday, 2027");
  });
});

describe("stageTime", () => {
  it("stays quiet while a card is fresh", () => {
    expect(
      stageTime(app({ appliedAt: NOW - 3 * DAY_MS }), NOW, EN.applications, FORMAT_EN),
    ).toBeNull();
    expect(stageTime(saved(NOW - 2 * DAY_MS), NOW, EN.applications, FORMAT_EN)).toBeNull();
    expect(stageTime(app({ status: "rejected" }), NOW, EN.applications, FORMAT_EN)).toBeNull();
    expect(stageTime(app(), 0, EN.applications, FORMAT_EN)).toBeNull();
  });

  it("says how long it has been, in words, once it matters", () => {
    expect(
      stageTime(app({ appliedAt: NOW - 9 * DAY_MS }), NOW, EN.applications, FORMAT_EN),
    ).toEqual({
      text: "Applied 9 days ago",
      late: false,
    });
    expect(stageTime(saved(NOW - 15 * DAY_MS), NOW, EN.applications, FORMAT_EN)).toEqual({
      text: "Tailored 2 weeks ago",
      late: false,
    });
    expect(
      stageTime(
        app({ status: "offer", statusChangedAt: NOW - 3 * DAY_MS }),
        NOW,
        EN.applications,
        FORMAT_EN,
      )?.text,
    ).toBe("Offer came 3 days ago");
    expect(
      stageTime(
        app({ status: "interview", statusChangedAt: NOW - 8 * DAY_MS }),
        NOW,
        EN.applications,
        FORMAT_EN,
      )?.text,
    ).toBe("Interviewing for 8 days");
    expect(
      stageTime(
        app({ status: "interview", statusChangedAt: NOW - 8 * DAY_MS, interviewAt: NOW }),
        NOW,
        EN.applications,
        FORMAT_EN,
      ),
    ).toBeNull();
  });

  it("marks a long wait on Applied as late, unless a follow-up already asks for action", () => {
    const long = { appliedAt: NOW - 16 * DAY_MS, statusChangedAt: NOW - 16 * DAY_MS };
    expect(stageTime(app(long), NOW, EN.applications, FORMAT_EN)).toEqual({
      text: "Applied 2 weeks ago",
      late: true,
    });
    expect(
      stageTime(app({ ...long, followUpAt: NOW - DAY_MS }), NOW, EN.applications, FORMAT_EN)?.late,
    ).toBe(false);
  });
});

describe("span", () => {
  it("moves from days to weeks to months", () => {
    expect([1, 13, 14, 59, 60].map((days) => span(days, EN.applications, FORMAT_EN))).toEqual([
      "1 day",
      "13 days",
      "2 weeks",
      "8 weeks",
      "2 months",
    ]);
  });
});
