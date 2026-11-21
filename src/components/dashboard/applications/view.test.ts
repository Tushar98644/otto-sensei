import { describe, expect, it } from "vitest";
import type { Application } from "@/lib/applications/schema";
import {
  filterApplications,
  filterCounts,
  formatDay,
  latestFor,
  sentLabel,
  sortApplications,
  upsertApplication,
  withoutApplication,
} from "./view";

function app(id: string, overrides: Partial<Application> = {}): Application {
  return {
    id,
    resumeId: "copy-1",
    resumeTitle: "PM at Stripe",
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
    ...overrides,
  };
}

const ids = (list: readonly Application[]) => list.map((item) => item.id);

describe("sortApplications", () => {
  it("puts the newest application first, then the larger id, like the API", () => {
    const list = [
      app("a", { appliedAt: 1 }),
      app("b", { appliedAt: 3 }),
      app("c", { appliedAt: 3 }),
    ];
    expect(ids(sortApplications(list))).toEqual(["c", "b", "a"]);
  });
});

describe("upsertApplication", () => {
  it("adds in order, replaces newer copies, and ignores older ones", () => {
    const list = [app("b", { appliedAt: 5 }), app("a", { appliedAt: 1 })];
    expect(ids(upsertApplication(list, app("c", { appliedAt: 3 })))).toEqual(["b", "c", "a"]);

    const newer = app("a", { appliedAt: 1, status: "interview", updatedAt: 2_000 });
    expect(upsertApplication(list, newer)[1]?.status).toBe("interview");
    const stale = app("a", { appliedAt: 1, status: "offer", updatedAt: 500 });
    expect(upsertApplication([newer], stale)[0]?.status).toBe("interview");
    expect(upsertApplication([newer], { ...newer, status: "applied" })[0]?.status).toBe("applied");
  });

  it("re-sorts when the applied date changed", () => {
    const list = [app("b", { appliedAt: 5 }), app("a", { appliedAt: 1 })];
    expect(ids(upsertApplication(list, app("a", { appliedAt: 9, updatedAt: 2_000 })))).toEqual([
      "a",
      "b",
    ]);
    expect(ids(withoutApplication(list, "b"))).toEqual(["a"]);
  });
});

describe("filters", () => {
  const list = [app("a"), app("b", { status: "interview" }), app("c", { status: "interview" })];

  it("counts each status and filters by one", () => {
    expect(filterCounts(list)).toEqual({
      all: 3,
      applied: 1,
      interview: 2,
      offer: 0,
      rejected: 0,
      no_reply: 0,
    });
    expect(ids(filterApplications(list, "interview"))).toEqual(["b", "c"]);
    expect(ids(filterApplications(list, "all"))).toEqual(["a", "b", "c"]);
    expect(filterCounts([]).all).toBe(0);
  });
});

describe("latestFor", () => {
  it("finds the newest application sent with a version, or none", () => {
    const list = [
      app("a", { appliedAt: 1 }),
      app("b", { appliedAt: 7 }),
      app("c", { appliedAt: 9, resumeId: "other" }),
    ];
    expect(latestFor(list, "copy-1")?.id).toBe("b");
    expect(latestFor(list, "missing")).toBeNull();
  });
});

describe("sentLabel", () => {
  const titles = new Map([["copy-1", { title: "PM at Stripe, renamed" }]]);

  it("names the live version, a deleted one by its old title, or a file outside Otto", () => {
    expect(sentLabel(app("a"), titles)).toBe("“PM at Stripe, renamed”");
    expect(sentLabel(app("a", { resumeId: "gone", resumeTitle: "Old copy" }), titles)).toBe(
      "“Old copy” (deleted)",
    );
    expect(sentLabel(app("a", { resumeId: "gone", resumeTitle: "" }), titles)).toBe(
      "a deleted resume",
    );
    expect(sentLabel(app("a", { resumeId: null }), titles)).toBe("a resume not in Otto");
  });
});

describe("formatDay", () => {
  it("drops the year inside the current one", () => {
    const now = new Date(2026, 10, 7).getTime();
    expect(formatDay(new Date(2026, 9, 12).getTime(), now)).toBe("Oct 12");
    expect(formatDay(new Date(2025, 11, 30).getTime(), now)).toBe("Dec 30, 2025");
  });
});
