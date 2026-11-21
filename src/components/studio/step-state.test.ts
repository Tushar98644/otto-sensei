import { describe, expect, it } from "vitest";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import {
  adjacentStep,
  hasTailoredCopy,
  resolveStep,
  stepDone,
  stepStatus,
  stepsToPreload,
  visibleSteps,
} from "./step-state";

const empty = { hasResume: false, hasReport: false, hasTailored: false };
const scratch = { hasResume: true, hasReport: false, hasTailored: false };
const uploaded = { hasResume: true, hasReport: true, hasTailored: false };

describe("stepStatus", () => {
  it("only allows upload until a resume exists", () => {
    expect(stepStatus("upload", empty)).toBe("available");
    expect(stepStatus("review", empty)).toBe("disabled");
    expect(stepStatus("download", empty)).toBe("disabled");
  });

  it("hides the recruiter view for resumes that weren't uploaded", () => {
    expect(stepStatus("review", scratch)).toBe("hidden");
    expect(stepStatus("review", uploaded)).toBe("available");
    expect(stepStatus("fix", scratch)).toBe("available");
  });
});

describe("visibleSteps", () => {
  it("numbers four steps for a sample, scratch or imported resume", () => {
    expect(visibleSteps(scratch)).toEqual(["upload", "fix", "tailor", "download"]);
  });

  it("keeps all five for an upload, and before anything is open", () => {
    expect(visibleSteps(uploaded)).toHaveLength(5);
    expect(visibleSteps(empty)).toHaveLength(5);
  });
});

describe("stepDone", () => {
  it("ticks the steps behind the current one", () => {
    expect(stepDone("upload", "fix", uploaded)).toBe(true);
    expect(stepDone("review", "fix", uploaded)).toBe(true);
    expect(stepDone("fix", "fix", uploaded)).toBe(false);
    expect(stepDone("fix", "review", uploaded)).toBe(false);
  });

  it("ticks Tailor only once a tailored copy exists, wherever you are", () => {
    expect(stepDone("tailor", "download", uploaded)).toBe(false);
    expect(stepDone("tailor", "download", { ...uploaded, hasTailored: true })).toBe(true);
    expect(stepDone("tailor", "fix", { ...uploaded, hasTailored: true })).toBe(true);
    expect(stepDone("tailor", "tailor", { ...uploaded, hasTailored: true })).toBe(false);
  });

  it("never ticks a step that can't be opened", () => {
    expect(stepDone("review", "download", scratch)).toBe(false);
    expect(stepDone("fix", "upload", empty)).toBe(false);
  });
});

describe("hasTailoredCopy", () => {
  const base = { ...emptyResume(1), id: "base" };
  const other = { ...emptyResume(1), id: "other" };
  const copy: Resume = {
    ...emptyResume(2),
    id: "copy",
    source: "tailored",
    tailor: {
      baseResumeId: "base",
      jobTitle: "Analyst",
      company: "Acme",
      keywords: [],
      createdAt: 2,
    },
  };
  const resumes = { base, other, copy };

  it("is true for a resume a copy was tailored from, and for the copy itself", () => {
    expect(hasTailoredCopy(resumes, "base")).toBe(true);
    expect(hasTailoredCopy(resumes, "copy")).toBe(true);
  });

  it("is false for a resume nothing was tailored from", () => {
    expect(hasTailoredCopy(resumes, "other")).toBe(false);
    expect(hasTailoredCopy(resumes, null)).toBe(false);
  });
});

describe("adjacentStep", () => {
  it("steps over the hidden recruiter view", () => {
    expect(adjacentStep("fix", -1, scratch)).toBe("upload");
    expect(adjacentStep("upload", 1, scratch)).toBe("fix");
    expect(adjacentStep("upload", 1, uploaded)).toBe("review");
  });

  it("returns null at either end or when nothing is open", () => {
    expect(adjacentStep("download", 1, uploaded)).toBeNull();
    expect(adjacentStep("upload", -1, uploaded)).toBeNull();
    expect(adjacentStep("upload", 1, empty)).toBeNull();
  });
});

describe("resolveStep", () => {
  it("keeps a step that is open", () => {
    expect(resolveStep("tailor", scratch)).toBe("tailor");
  });

  it("moves a stale step to one that works", () => {
    expect(resolveStep("review", scratch)).toBe("fix");
    expect(resolveStep("download", empty)).toBe("upload");
  });
});

describe("stepsToPreload", () => {
  it("warms only the next step from the upload screen", () => {
    expect(stepsToPreload("upload", "review")).toEqual(["review"]);
    expect(stepsToPreload("upload", "fix")).toEqual(["fix"]);
    expect(stepsToPreload("upload", null)).toEqual([]);
  });

  it("warms the next step first, then every other step", () => {
    expect(stepsToPreload("review", "fix")).toEqual(["fix", "upload", "tailor", "download"]);
    expect(stepsToPreload("fix", "tailor")).toEqual(["tailor", "upload", "review", "download"]);
  });

  it("still warms the earlier steps at the end of the flow", () => {
    expect(stepsToPreload("download", null)).toEqual(["upload", "review", "fix", "tailor"]);
  });
});
