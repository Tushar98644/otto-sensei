import { describe, expect, it } from "vitest";
import { PORTFOLIO_LINES, portfolioFacts } from "./lines";

const words = (line: string) => line.trim().split(/\s+/).length;

describe("Otto's portfolio lines", () => {
  it("keep to 18 words, like every Otto line", () => {
    const lines = [
      PORTFOLIO_LINES.start,
      PORTFOLIO_LINES.draft,
      PORTFOLIO_LINES.live(0),
      PORTFOLIO_LINES.live(1),
      PORTFOLIO_LINES.live(12_345),
      PORTFOLIO_LINES.behind,
      PORTFOLIO_LINES.noResume,
      PORTFOLIO_LINES.noResumes,
      PORTFOLIO_LINES.previews,
      PORTFOLIO_LINES.previewsSample,
    ];
    for (const line of lines) expect(words(line)).toBeLessThanOrEqual(18);
    expect(PORTFOLIO_LINES.live(12_345)).toContain("12,345 views");
    expect(PORTFOLIO_LINES.live(1)).toContain("1 view so far");
  });

  it("state facts only in the meta line", () => {
    expect(portfolioFacts({ projects: 3, jobs: 1, skills: 0 })).toBe("3 projects · 1 job");
    expect(portfolioFacts({ projects: 0, jobs: 0, skills: 0 })).toBe("");
  });
});
