import { describe, expect, it, vi } from "vitest";
import { designOf, withDesign } from "@/lib/pdf/design";
import { fitCandidates, hideLines, showLines } from "@/lib/pdf/fit";
import { listBullets } from "@/lib/resume/ops";
import { createSampleResume } from "@/lib/resume/sample";
import type { Resume } from "@/lib/resume/schema";
import { findNearFit, NEAR_FIT_LINES, stillApplied, tightened } from "./near-fit";

const hiddenCount = (resume: Resume) =>
  listBullets(resume, { includeHidden: true }).length - listBullets(resume).length;

describe("findNearFit", () => {
  it("offers tighter spacing when that alone fits the page", async () => {
    const pagesOf = vi.fn(async (resume: Resume) => (designOf(resume).density ? 1 : 2));
    expect(await findNearFit(createSampleResume(0), pagesOf)).toEqual({ kind: "tighten" });
    expect(pagesOf).toHaveBeenCalledTimes(1);
  });

  it("offers nothing when tighter spacing is not enough, so the full fit card takes over", async () => {
    expect(await findNearFit(createSampleResume(0), async () => 2)).toBeNull();
  });

  it("on tight spacing, offers the fewest weak lines that fit, at most two", async () => {
    const resume = withDesign(createSampleResume(0), { density: "compact" });
    const weakest = fitCandidates(resume).slice(0, 2);
    const pagesOf = vi.fn(async (candidate: Resume) => (hiddenCount(candidate) >= 2 ? 1 : 2));
    const offer = await findNearFit(resume, pagesOf);
    expect(offer).toEqual({ kind: "hide", lines: weakest });
    expect(pagesOf).toHaveBeenCalledTimes(2);
  });

  it("stops after two lines, because a longer spill needs the person to choose", async () => {
    const resume = withDesign(createSampleResume(0), { density: "compact" });
    const pagesOf = vi.fn(async (candidate: Resume) => (hiddenCount(candidate) >= 3 ? 1 : 2));
    expect(await findNearFit(resume, pagesOf)).toBeNull();
    expect(pagesOf).toHaveBeenCalledTimes(NEAR_FIT_LINES);
  });

  it("never changes the resume it was given", async () => {
    const resume = withDesign(createSampleResume(0), { density: "compact" });
    const before = structuredClone(resume);
    await findNearFit(resume, async () => 1);
    expect(resume).toEqual(before);
  });
});

describe("stillApplied", () => {
  it("follows tighter spacing until someone puts it back", () => {
    const resume = createSampleResume(0);
    expect(stillApplied(tightened(resume), { kind: "tighten" })).toBe(true);
    expect(stillApplied(resume, { kind: "tighten" })).toBe(false);
  });

  it("follows hidden lines until every one of them shows again", () => {
    const resume = withDesign(createSampleResume(0), { density: "compact" });
    const ids = fitCandidates(resume)
      .slice(0, 2)
      .map((line) => line.bulletId);
    const hidden = hideLines(resume, new Set(ids));
    expect(stillApplied(hidden, { kind: "hide", ids })).toBe(true);
    expect(stillApplied(showLines(hidden, new Set([ids[0]!])), { kind: "hide", ids })).toBe(true);
    expect(stillApplied(showLines(hidden, new Set(ids)), { kind: "hide", ids })).toBe(false);
  });
});
