import { describe, expect, it } from "vitest";
import { formatFor } from "@/i18n/intl";
import en from "@/i18n/messages/en";
import { liveLine, portfolioFacts, resumeLinkLine, saveLabel, viewsLabel } from "./lines";

const W = en.portfolio;
const F = formatFor("en");
const PORTFOLIO_LINES = { ...W.otto, live: (views: number) => liveLine(W, F, views) };
const PUBLISH_NOTE = W.publishNote;

const words = (line: string) => line.trim().split(/\s+/).length;

describe("Otto's portfolio lines", () => {
  it("keep to 18 words, like every Otto line", () => {
    const lines = [
      PORTFOLIO_LINES.pick,
      PORTFOLIO_LINES.pickThin,
      PORTFOLIO_LINES.draft,
      PORTFOLIO_LINES.live(0),
      PORTFOLIO_LINES.live(1),
      PORTFOLIO_LINES.live(12_345),
      PORTFOLIO_LINES.behind,
      PORTFOLIO_LINES.noResume,
      PORTFOLIO_LINES.noResumes,
      PORTFOLIO_LINES.previews,
      PORTFOLIO_LINES.previewsSample,
      PORTFOLIO_LINES.previewsThin,
    ];
    for (const line of lines) expect(words(line)).toBeLessThanOrEqual(18);
    expect(PORTFOLIO_LINES.live(12_345)).toContain("12,345 views");
    expect(PORTFOLIO_LINES.live(1)).toContain("1 view so far");
  });

  it("state facts only in the meta line", () => {
    expect(portfolioFacts(W, F, { projects: 3, jobs: 1, skills: 0 })).toBe("3 projects · 1 job");
    expect(portfolioFacts(W, F, { projects: 0, jobs: 0, skills: 0 })).toBe("");
  });

  it("words the top bar's views, save state and publish note plainly", () => {
    expect(viewsLabel(W, F, 0)).toBe("No views yet");
    expect(viewsLabel(W, F, 1)).toBe("1 view");
    expect(viewsLabel(W, F, 1284)).toBe("1,284 views");
    expect(saveLabel(W, true, false)).toBe("Saving…");
    expect(saveLabel(W, false, false)).toBe("All changes saved");
    expect(saveLabel(W, false, true)).toBe("Saved to your live page");
    expect(PUBLISH_NOTE).toContain("Publishing comes with Pro");
  });

  it("says whether the page links the shared resume, and why not", () => {
    expect(resumeLinkLine(W, { href: "/s/abc", shared: true })).toMatch(
      /links to your shared resume/,
    );
    expect(resumeLinkLine(W, { href: null, shared: true })).toMatch(
      /contact details this page hides/,
    );
    expect(resumeLinkLine(W, { href: null, shared: false })).toMatch(/^Share this resume/);
  });
});
