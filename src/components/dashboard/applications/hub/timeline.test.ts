import { describe, expect, it } from "vitest";
import type { ApplicationStatus } from "@/lib/applications/status";
import { nextStepLine, timelineSteps } from "./timeline";

const DAY = 24 * 60 * 60 * 1_000;
const SENT = Date.UTC(2026, 9, 12, 12);

describe("the application's timeline", () => {
  it("shows the steps passed, where it stands and what's ahead", () => {
    const steps = timelineSteps(
      { status: "interview", stageReached: "interview", appliedAt: SENT, statusChangedAt: SENT + 8 * DAY },
      [
        { status: "applied", at: SENT },
        { status: "interview", at: SENT + 8 * DAY },
      ],
    );
    expect(steps).toEqual([
      { status: "applied", state: "done", at: SENT },
      { status: "interview", state: "current", at: SENT + 8 * DAY },
      { status: "offer", state: "next", at: null },
    ]);
  });

  it("ends at the step it reached, then how it ended", () => {
    const steps = timelineSteps(
      { status: "rejected", stageReached: "offer", appliedAt: SENT, statusChangedAt: SENT + 20 * DAY },
      [
        { status: "applied", at: SENT },
        { status: "offer", at: SENT + 10 * DAY },
        { status: "rejected", at: SENT + 20 * DAY },
      ],
    );
    expect(steps.map((step) => [step.status, step.state, step.at])).toEqual([
      ["applied", "done", SENT],
      ["interview", "done", null],
      ["offer", "done", SENT + 10 * DAY],
      ["rejected", "current", SENT + 20 * DAY],
    ]);
  });

  it("falls back to the last change for rows logged before the timeline", () => {
    const steps = timelineSteps(
      { status: "interview", stageReached: "interview", appliedAt: SENT, statusChangedAt: SENT + 5 * DAY },
      [],
    );
    expect(steps.find((step) => step.status === "interview")).toEqual({
      status: "interview",
      state: "current",
      at: SENT + 5 * DAY,
    });
    expect(
      timelineSteps(
        { status: "no_reply", stageReached: "applied", appliedAt: SENT, statusChangedAt: SENT + 30 * DAY },
        [],
      ),
    ).toEqual([
      { status: "applied", state: "done", at: SENT },
      { status: "no_reply", state: "current", at: SENT + 30 * DAY },
    ]);
  });
});

describe("Otto's next step", () => {
  const step = (status: ApplicationStatus, followUpAt: number | null = null) => ({
    status,
    followUpAt,
    interviewAt: null,
  });

  it("names the follow-up day, or says it's due", () => {
    const now = SENT + 3 * DAY;
    expect(nextStepLine(step("applied", SENT + 7 * DAY), false, now)).toMatch(/follow up on Oct 19/);
    expect(nextStepLine(step("applied", SENT + DAY), false, now)).toMatch(/time to follow up/);
    expect(nextStepLine(step("applied"), false, now)).toMatch(/Waiting/);
  });

  it("offers prep at the interview until it's made, in 18 words or fewer", () => {
    const lines = [
      nextStepLine(step("interview"), false, SENT),
      nextStepLine(step("interview"), true, SENT),
      ...(["offer", "rejected", "no_reply"] as const).map((status) =>
        nextStepLine(step(status), false, SENT),
      ),
      nextStepLine(step("applied", SENT + DAY), false, SENT + 2 * DAY),
    ];
    expect(lines[0]).toMatch(/make prep/);
    expect(lines[1]).toMatch(/prep is ready/);
    for (const line of lines) expect(line.split(/\s+/).length).toBeLessThanOrEqual(18);
  });

  it("names the interview day, in 18 words or fewer", () => {
    const now = new Date(2026, 10, 21, 9).getTime();
    const at = (date: number) => new Date(2026, 10, date, 12).getTime();
    const line = (date: number, prep: boolean) =>
      nextStepLine({ status: "interview", followUpAt: null, interviewAt: at(date) }, prep, now);
    expect(line(23, false)).toBe(
      "Your interview is Mon, in 2 days. I can make prep from this job and your resume.",
    );
    expect(line(22, true)).toBe(
      "Your interview is tomorrow. Your prep is ready to practice out loud.",
    );
    expect(line(21, false)).toMatch(/^Your interview is today\./);
    expect(line(19, false)).toMatch(/How did the interview go/);
    for (const text of [line(23, false), line(30, false), line(30, true), line(19, true)]) {
      expect(text.split(/\s+/).length).toBeLessThanOrEqual(18);
    }
  });
});
