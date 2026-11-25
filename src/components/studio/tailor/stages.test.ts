import { describe, expect, it } from "vitest";
import { EN } from "../testing";
import { nextStageIn, TAILOR_STAGES, tailorStage } from "./stages";

describe("tailor wait stages", () => {
  it("moves through the stages as time passes, and stays on the last", () => {
    expect(EN.studioTailor.stages[tailorStage(0)]).toBe("Otto is reading the job post.");
    expect(EN.studioTailor.stages[tailorStage(7_999)]).toBe("Otto is reading the job post.");
    expect(EN.studioTailor.stages[tailorStage(8_000)]).toBe("Otto is comparing it with your resume.");
    expect(EN.studioTailor.stages[tailorStage(30_000)]).toBe("Otto is writing your tailored lines.");
    expect(EN.studioTailor.stages[tailorStage(120_000)]).toBe("Still writing. Long posts take a little longer.");
  });

  it("says when the line changes next", () => {
    expect(nextStageIn(0)).toBe(8_000);
    expect(nextStageIn(8_000)).toBe(12_000);
    expect(nextStageIn(120_000)).toBeNull();
  });

  it("has 2 to 4 plain stages that start at 0 and go in order", () => {
    expect(TAILOR_STAGES.length).toBeGreaterThanOrEqual(2);
    expect(TAILOR_STAGES.length).toBeLessThanOrEqual(4);
    expect(TAILOR_STAGES[0].from).toBe(0);
    const starts = TAILOR_STAGES.map((stage) => stage.from);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
    for (const stage of TAILOR_STAGES) expect(EN.studioTailor.stages[stage.key]).toMatch(/^[A-Z][^…!]*\.$/);
  });
});
