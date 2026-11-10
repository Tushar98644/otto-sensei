import { describe, expect, it } from "vitest";
import type { Application } from "./schema";
import {
  compareVersions,
  comparisonLine,
  countsLine,
  interviewRate,
  MIN_FOR_RATE,
  outcomeOf,
  rateHeadline,
  statsByVersion,
  swingNote,
  tally,
  type VersionInfo,
} from "./stats";
import { stageAfter, type ApplicationStage, type ApplicationStatus } from "./status";

type Item = Pick<Application, "resumeId" | "resumeTitle" | "status" | "stageReached" | "appliedAt">;

function app(status: ApplicationStatus, overrides: Partial<Item> = {}): Item {
  const stageReached: ApplicationStage = stageAfter("applied", status);
  return {
    resumeId: "a",
    resumeTitle: "Version A",
    status,
    stageReached,
    appliedAt: 1_000,
    ...overrides,
  };
}

const many = (count: number, status: ApplicationStatus, overrides: Partial<Item> = {}) =>
  Array.from({ length: count }, () => app(status, overrides));

describe("stageAfter", () => {
  it("records steps forward and back, and keeps the step an ending happened at", () => {
    expect(stageAfter("applied", "interview")).toBe("interview");
    expect(stageAfter("offer", "interview")).toBe("interview");
    expect(stageAfter("interview", "rejected")).toBe("interview");
    expect(stageAfter("applied", "no_reply")).toBe("applied");
  });
});

describe("outcomeOf", () => {
  it.each([
    ["applied", "applied", { interviewed: false, offered: false }],
    ["no_reply", "applied", { interviewed: false, offered: false }],
    ["rejected", "applied", { interviewed: false, offered: false }],
    ["interview", "interview", { interviewed: true, offered: false }],
    ["offer", "offer", { interviewed: true, offered: true }],
    // Rejected after an interview is still an interview.
    ["rejected", "interview", { interviewed: true, offered: false }],
    // A recruiter call, then silence: the call counts as Interviewing.
    ["no_reply", "interview", { interviewed: true, offered: false }],
  ] as const)("%s after reaching %s", (status, stageReached, expected) => {
    expect(outcomeOf({ status, stageReached })).toEqual(expected);
  });

  it("trusts the status when the stored step lags behind it", () => {
    expect(outcomeOf({ status: "offer", stageReached: "applied" }).offered).toBe(true);
  });
});

describe("tally and the interview rate", () => {
  it("is all zeros, with no rate, for no applications", () => {
    const counts = tally([]);
    expect(counts).toEqual({ applications: 0, interviews: 0, offers: 0, waiting: 0 });
    expect(interviewRate(counts)).toEqual({ shown: false, needed: MIN_FOR_RATE });
    expect(countsLine(counts)).toBe("No applications logged yet");
    expect(swingNote(counts)).toMatch(/never an average from other people/);
  });

  it("shows counts but no rate under 5 applications", () => {
    const counts = tally([app("interview"), app("applied"), app("rejected"), app("no_reply")]);
    expect(counts).toEqual({ applications: 4, interviews: 1, offers: 0, waiting: 1 });
    expect(interviewRate(counts)).toEqual({ shown: false, needed: 1 });
    expect(countsLine(counts)).toBe("1 interview from 4 applications");
    expect(swingNote(counts)).toBe(
      "Small numbers swing a lot, so the rate shows from 5 applications.",
    );
  });

  it("counts mixed statuses and rounds the rate from 5 applications on", () => {
    const list = [
      ...many(12, "applied"),
      ...many(3, "no_reply"),
      ...many(2, "rejected"),
      app("no_reply", { stageReached: "interview" }),
      app("interview"),
      app("rejected", { stageReached: "interview" }),
      app("offer"),
    ];
    const counts = tally(list);
    expect(counts).toEqual({ applications: 21, interviews: 4, offers: 1, waiting: 12 });
    expect(interviewRate(counts)).toEqual({ shown: true, percent: 19 });
    expect(countsLine(counts)).toBe("4 interviews from 21 applications");
    expect(swingNote(counts)).toBe(
      "Small numbers swing a lot: with 21 applications, 1 interview moves the rate by 5 points.",
    );
    expect(interviewRate(tally(many(5, "applied")))).toEqual({ shown: true, percent: 0 });
  });

  it("leads with counts and adds the rate only from 5 applications", () => {
    expect(rateHeadline(tally([]))).toBe("No applications logged yet.");
    expect(rateHeadline(tally([app("interview"), app("applied")]))).toBe(
      "1 interview from 2 applications. The interview rate shows from 5 applications, 3 to go.",
    );
    expect(rateHeadline(tally([...many(3, "interview"), ...many(17, "applied")]))).toBe(
      "3 interviews from 20 applications: a 15% interview rate.",
    );
  });

  it("stops calling it a small number at 100 applications", () => {
    expect(swingNote(tally(many(100, "applied")))).toBe(
      "With 100 applications, 1 interview moves the rate by 1 point.",
    );
    expect(swingNote(tally(many(250, "applied")))).toBe(
      "With 250 applications, 1 interview moves the rate by under 1 point.",
    );
    expect(countsLine(tally(many(1_200, "interview")))).toBe(
      "1,200 interviews from 1,200 applications",
    );
  });
});

describe("statsByVersion", () => {
  const versions = new Map<string, VersionInfo>([
    ["a", { title: "PM at Stripe", tailored: true }],
    ["b", { title: "General PM", tailored: false }],
  ]);

  it("is empty for no applications", () => {
    expect(statsByVersion([], versions)).toEqual([]);
  });

  it("groups by version, most-used first, with live titles", () => {
    const stats = statsByVersion(
      [...many(2, "interview", { resumeId: "a" }), ...many(6, "applied", { resumeId: "b" })],
      versions,
    );
    expect(
      stats.map((version) => [version.title, version.state, version.tally.applications]),
    ).toEqual([
      ["General PM", "live", 6],
      ["PM at Stripe", "live", 2],
    ]);
    expect(stats[0]?.rate).toEqual({ shown: true, percent: 0 });
    expect(stats[1]?.rate).toEqual({ shown: false, needed: 3 });
    expect(stats[1]?.tailored).toBe(true);
  });

  it("keeps a deleted version's numbers under its last known title", () => {
    const stats = statsByVersion(
      [
        app("interview", { resumeId: "gone", resumeTitle: "Old title", appliedAt: 1 }),
        app("applied", { resumeId: "gone", resumeTitle: "Renamed before deleting", appliedAt: 2 }),
        app("applied", { resumeId: "gone-too", resumeTitle: "" }),
        app("offer", { resumeId: null, resumeTitle: "" }),
      ],
      versions,
    );
    expect(
      stats.map((version) => [version.title, version.state, version.tally.interviews]),
    ).toEqual([
      ["Renamed before deleting", "deleted", 1],
      ["A resume not in Otto", "none", 1],
      ["A deleted resume", "deleted", 0],
    ]);
    expect(stats[1]?.resumeId).toBeNull();
    expect(stats[0]?.tailored).toBe(false);
  });
});

describe("compareVersions", () => {
  const versions = new Map<string, VersionInfo>([
    ["a", { title: "PM at Stripe", tailored: true }],
    ["b", { title: "General PM", tailored: false }],
    ["c", { title: "Short one", tailored: false }],
  ]);

  it("needs two versions with 5 or more applications each", () => {
    const one = statsByVersion(
      [...many(9, "applied", { resumeId: "a" }), ...many(4, "interview", { resumeId: "b" })],
      versions,
    );
    expect(compareVersions(one)).toBeNull();
    expect(
      compareVersions(statsByVersion(many(30, "interview", { resumeId: "a" }), versions)),
    ).toBeNull();
    expect(compareVersions([])).toBeNull();
  });

  it("puts the higher rate first and says how far apart they are", () => {
    const stats = statsByVersion(
      [
        ...many(2, "interview", { resumeId: "a" }),
        ...many(8, "applied", { resumeId: "a" }),
        ...many(1, "interview", { resumeId: "b" }),
        ...many(24, "applied", { resumeId: "b" }),
        // Fewer than 5: never compared, however good it looks.
        ...many(3, "offer", { resumeId: "c" }),
      ],
      versions,
    );
    const comparison = compareVersions(stats);
    expect(comparison?.first.title).toBe("PM at Stripe");
    expect(comparison?.second.title).toBe("General PM");
    expect(comparison?.points).toBe(16);
    expect(comparison && comparisonLine(comparison)).toBe(
      "“PM at Stripe” led to interviews for 20% of 10 applications, “General PM” for 4% of 25 applications.",
    );
  });

  it("says so when two versions do equally well", () => {
    const stats = statsByVersion(
      [...many(5, "interview", { resumeId: "a" }), ...many(5, "interview", { resumeId: "b" })],
      versions,
    );
    const comparison = compareVersions(stats);
    expect(comparison?.points).toBe(0);
    expect(comparison && comparisonLine(comparison)).toMatch(/at the same rate so far/);
  });
});
