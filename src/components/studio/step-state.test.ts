import { describe, expect, it } from "vitest";
import { adjacentStep, resolveStep, stepStatus } from "./step-state";

const empty = { hasResume: false, hasReport: false };
const scratch = { hasResume: true, hasReport: false };
const uploaded = { hasResume: true, hasReport: true };

describe("stepStatus", () => {
  it("only allows upload until a resume exists", () => {
    expect(stepStatus("upload", empty)).toBe("available");
    expect(stepStatus("review", empty)).toBe("disabled");
    expect(stepStatus("download", empty)).toBe("disabled");
  });

  it("skips the recruiter view for resumes that weren't uploaded", () => {
    expect(stepStatus("review", scratch)).toBe("skipped");
    expect(stepStatus("review", uploaded)).toBe("available");
    expect(stepStatus("fix", scratch)).toBe("available");
  });
});

describe("adjacentStep", () => {
  it("steps over the skipped recruiter view", () => {
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
