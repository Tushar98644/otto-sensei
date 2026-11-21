import { describe, expect, it } from "vitest";
import type { Application } from "@/lib/applications/schema";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import {
  findByLink,
  interviewDayLine,
  interviewHref,
  prepChoices,
  prepPickerChoices,
  waitingForPrep,
} from "./view";

function application(id: string, patch: Partial<Application> = {}): Application {
  return {
    id,
    resumeId: null,
    resumeTitle: "",
    company: `Company ${id}`,
    role: "",
    jobUrl: "",
    appliedAt: 1_000,
    status: "applied",
    stageReached: "applied",
    jobId: null,
    hasPrep: false,
    interviewAt: null,
    statusChangedAt: 1_000,
    notes: "",
    followUpAt: null,
    createdAt: 1_000,
    updatedAt: 1_000,
    ...patch,
  };
}

describe("interview prep lists", () => {
  it("links each pack to its own page under Interview prep", () => {
    expect(interviewHref("0b9f")).toBe("/dashboard/interview/0b9f");
    expect(interviewHref("0b9f", { start: true })).toBe("/dashboard/interview/0b9f?start=1");
  });

  it("lists interviews without a pack, the soonest first, then undated, then past ones", () => {
    const now = new Date(2026, 10, 21, 9).getTime();
    const on = (day: number) => new Date(2026, 10, day, 12).getTime();
    const list = [
      application("later", { status: "interview", interviewAt: on(28) }),
      application("undated-old", { status: "interview", statusChangedAt: 2_000 }),
      application("today", { status: "interview", interviewAt: on(21) }),
      application("undated-new", { status: "interview", statusChangedAt: 5_000 }),
      application("past", { status: "interview", interviewAt: on(14) }),
      application("lately", { status: "interview", interviewAt: on(19) }),
      application("prepped", { status: "interview", interviewAt: on(22) }),
      application("applied", { status: "applied", interviewAt: on(22) }),
    ];
    expect(waitingForPrep(list, [{ applicationId: "prepped" }], now).map((item) => item.id)).toEqual([
      "today",
      "later",
      "undated-new",
      "undated-old",
      "lately",
      "past",
    ]);
    expect(waitingForPrep([], [])).toEqual([]);
  });

  it("names the interview day, not the day the card moved", () => {
    const now = new Date(2026, 10, 21, 9).getTime();
    const on = (month: number, day: number, year = 2026) => new Date(year, month, day, 12).getTime();
    expect(interviewDayLine(on(10, 21), now)).toBe("Interview today");
    expect(interviewDayLine(on(10, 22), now)).toBe("Interview tomorrow");
    expect(interviewDayLine(on(10, 23), now)).toBe("Interview Mon · in 2 days");
    expect(interviewDayLine(on(10, 28), now)).toBe("Interview Nov 28 · in 7 days");
    expect(interviewDayLine(on(0, 6, 2027), now)).toBe("Interview Jan 6, 2027 · in 46 days");
    expect(interviewDayLine(on(10, 18), now)).toBe("Interview Wed · 3 days ago");
    expect(interviewDayLine(null, now)).toBe("No interview day set yet");
    expect(interviewDayLine(on(10, 28), 0)).toBe("Interview Nov 28");
  });

  it("offers interviews first in the picker, then the newest applications", () => {
    const list = [
      application("old", { appliedAt: 1_000 }),
      application("new", { appliedAt: 8_000 }),
      application("talk", { status: "interview", appliedAt: 500 }),
    ];
    expect(prepChoices(list).map((item) => item.id)).toEqual(["talk", "new", "old"]);
    expect(list.map((item) => item.id)).toEqual(["old", "new", "talk"]);
  });

  it("offers tailored copies not sent yet after the applications", () => {
    const copy = (id: string, company: string, createdAt: number): Resume => ({
      ...emptyResume(),
      id,
      title: `Designer at ${company || "?"}`,
      source: "tailored",
      tailor: { baseResumeId: "base", jobTitle: "Designer", company, keywords: [], createdAt },
    });
    const choices = prepPickerChoices(
      [application("talk", { status: "interview", company: "Initech" }), application("sent", { resumeId: "c-sent" })],
      [
        { ...emptyResume(), id: "base" },
        copy("c-old", "Globex", 1),
        copy("c-new", "Umbrella", 9),
        copy("c-sent", "Acme", 5),
        copy("c-nameless", "", 7),
      ],
    );
    expect(choices.map((choice) => choice.value)).toEqual([
      "application:talk",
      "application:sent",
      "copy:c-new",
      "copy:c-old",
    ]);
    expect(choices[0]?.label).toBe("Initech (Interviewing)");
    expect(choices[2]?.label).toBe("Designer at Umbrella (tailored copy, not sent yet)");
  });

  it("finds the application already logged for a pasted link", () => {
    const list = [
      application("a", { jobUrl: "https://jobs.example.com/7" }),
      application("b", { jobUrl: "" }),
    ];
    expect(findByLink(list, "jobs.example.com/7")?.id).toBe("a");
    expect(findByLink(list, " https://jobs.example.com/7 ")?.id).toBe("a");
    expect(findByLink(list, "https://jobs.example.com/8")).toBeNull();
    expect(findByLink(list, "")).toBeNull();
    expect(findByLink(list, "not a link")).toBeNull();
  });
});
