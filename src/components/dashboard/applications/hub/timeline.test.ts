import { describe, expect, it } from "vitest";
import { EN, FORMAT_EN } from "../../messages-testing";
import { nextStepLine, timelineSteps } from "./timeline";

const DAY = 24 * 60 * 60 * 1_000;
const SENT = Date.UTC(2026, 9, 12, 12);

describe("the application's timeline", () => {
  it("shows the steps passed, where it stands and what's ahead", () => {
    const steps = timelineSteps(
      {
        status: "interview",
        stageReached: "interview",
        appliedAt: SENT,
        statusChangedAt: SENT + 8 * DAY,
      },
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
      {
        status: "rejected",
        stageReached: "offer",
        appliedAt: SENT,
        statusChangedAt: SENT + 20 * DAY,
      },
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
      {
        status: "interview",
        stageReached: "interview",
        appliedAt: SENT,
        statusChangedAt: SENT + 5 * DAY,
      },
      [],
    );
    expect(steps.find((step) => step.status === "interview")).toEqual({
      status: "interview",
      state: "current",
      at: SENT + 5 * DAY,
    });
    expect(
      timelineSteps(
        {
          status: "no_reply",
          stageReached: "applied",
          appliedAt: SENT,
          statusChangedAt: SENT + 30 * DAY,
        },
        [],
      ),
    ).toEqual([
      { status: "applied", state: "done", at: SENT },
      { status: "no_reply", state: "current", at: SENT + 30 * DAY },
    ]);
  });
});

describe("Otto's next step", () => {
  it("names the follow-up day, or says it's due", () => {
    const now = SENT + 3 * DAY;
    expect(
      nextStepLine(
        { status: "applied", followUpAt: SENT + 7 * DAY },
        false,
        now,
        EN.applications,
        FORMAT_EN,
      ),
    ).toMatch(/follow up on Oct 19/);
    expect(
      nextStepLine(
        { status: "applied", followUpAt: SENT + DAY },
        false,
        now,
        EN.applications,
        FORMAT_EN,
      ),
    ).toMatch(/time to follow up/);
    expect(
      nextStepLine({ status: "applied", followUpAt: null }, false, now, EN.applications, FORMAT_EN),
    ).toMatch(/Waiting/);
  });

  it("offers prep at the interview until it's made, in 18 words or fewer", () => {
    const lines = [
      nextStepLine(
        { status: "interview", followUpAt: null },
        false,
        SENT,
        EN.applications,
        FORMAT_EN,
      ),
      nextStepLine(
        { status: "interview", followUpAt: null },
        true,
        SENT,
        EN.applications,
        FORMAT_EN,
      ),
      ...(["offer", "rejected", "no_reply"] as const).map((status) =>
        nextStepLine({ status, followUpAt: null }, false, SENT, EN.applications, FORMAT_EN),
      ),
      nextStepLine(
        { status: "applied", followUpAt: SENT + DAY },
        false,
        SENT + 2 * DAY,
        EN.applications,
        FORMAT_EN,
      ),
    ];
    expect(lines[0]).toMatch(/make prep/);
    expect(lines[1]).toMatch(/prep is ready/);
    for (const line of lines) expect(line.split(/\s+/).length).toBeLessThanOrEqual(18);
  });
});
