import { describe, expect, it } from "vitest";
import { downloadChecked, fixIssues, reviewOverall, reviewSummary, uploadFailed } from "./otto";
import { screenerLine } from "./tailor/otto";
import { EN, EN_FORMAT } from "./testing";

const otto = EN.studio.otto;
const screener = EN.studioTailor.otto.screener;

const SAMPLES: string[] = [
  ...["That file isn't a PDF or Word document.", "No text found", "  "].map((reason) =>
    uploadFailed(otto, reason),
  ),
  ...[
    { fail: 2, warn: 1, pass: 8 },
    { fail: 1, warn: 0, pass: 1 },
    { fail: 13, warn: 0, pass: 0 },
    { fail: 0, warn: 3, pass: 9 },
    { fail: 0, warn: 0, pass: 12 },
  ].map((counts) => reviewSummary(otto, EN_FORMAT, counts)),
  ...[0, 1, 24].map((count) => fixIssues(EN.studioEditor.otto, EN_FORMAT, count)),
  ...[
    [0, 0, 0, 0],
    [0, 0, 2, 5],
    [1, 1, 0, 3],
    [8, 8, 1, 6],
    [0, 6, 0, 2],
    [5, 8, 3, 6],
    [7, 8, 3, 6],
  ].map(([mp = 0, mt = 0, np = 0, nt = 0]) =>
    screenerLine(screener, EN_FORMAT, { proven: mp, total: mt }, { proven: np, total: nt }),
  ),
  ...[
    [0, 0],
    [1, 0],
    [12, 3],
    [2, 2],
  ].map(([before = 0, after = 0]) =>
    downloadChecked(EN.studioDownload.otto, EN_FORMAT, before, after),
  ),
];

describe("studio Otto lines", () => {
  it.each(SAMPLES)("stay short, plain and complete: %s", (text) => {
    expect(text.trim()).toBe(text);
    expect(text).not.toMatch(/\s{2,}|undefined|NaN|null/);
    expect(text).toMatch(/[.!?]$/);
    expect(text.split(/\s+/).length).toBeLessThanOrEqual(18);
  });

  it("names what a recruiter would notice once the file reads cleanly", () => {
    expect(reviewOverall(otto, EN_FORMAT, { fail: 0, warn: 0, pass: 13 }, 3)).toBe(
      "Hiring software can read it all. A recruiter would notice 3 things in your words first.",
    );
    expect(reviewOverall(otto, EN_FORMAT, { fail: 0, warn: 2, pass: 11 }, 1)).toBe(
      "Software can read it, with small snags. A recruiter would notice 1 thing in your words first.",
    );
    expect(reviewOverall(otto, EN_FORMAT, { fail: 1, warn: 0, pass: 12 }, 4)).toBe(
      reviewSummary(otto, EN_FORMAT, { fail: 1, warn: 0, pass: 12 }),
    );
    expect(reviewOverall(otto, EN_FORMAT, { fail: 0, warn: 0, pass: 13 }, 0)).toBe(
      otto.review.allGood,
    );
  });

  it("summarizes checks with correct grammar", () => {
    expect(reviewSummary(otto, EN_FORMAT, { fail: 2, warn: 1, pass: 8 })).toBe(
      "2 checks need fixing and 1 could be better. 8 already look good.",
    );
    expect(reviewSummary(otto, EN_FORMAT, { fail: 1, warn: 0, pass: 1 })).toBe(
      "1 check needs fixing. 1 already looks good.",
    );
    expect(reviewSummary(otto, EN_FORMAT, { fail: 0, warn: 2, pass: 5 })).toBe(
      "Nothing's broken. 2 small things could be better.",
    );
    expect(reviewSummary(otto, EN_FORMAT, { fail: 0, warn: 0, pass: 9 })).toBe(otto.review.allGood);
  });

  it("leads the screener line with must-haves and never overstates the count", () => {
    const line = (mp: number, mt: number, np: number, nt: number) =>
      screenerLine(screener, EN_FORMAT, { proven: mp, total: mt }, { proven: np, total: nt });
    expect(line(5, 8, 3, 6)).toBe(
      "Your resume proves 5 of 8 must-haves. Let's look at the other 3.",
    );
    expect(line(7, 8, 0, 0)).toContain("the one left");
    expect(line(12, 8, 0, 0)).toContain("all 8");
    expect(line(Number.NaN, 4, 0, 0)).toContain("the 4 must-haves");
  });

  it("reports the before and after PDF check", () => {
    expect(downloadChecked(EN.studioDownload.otto, EN_FORMAT, 4, 0)).toBe(
      "Before: 4 problems. After: none. Hiring software can read every line.",
    );
    expect(downloadChecked(EN.studioDownload.otto, EN_FORMAT, 1, 0)).toMatch(
      /^Before: 1 problem\./,
    );
  });

  it("turns a failure reason into a full sentence", () => {
    expect(uploadFailed(otto, "No text found")).toBe("Hmm, I couldn't read that. No text found.");
    expect(uploadFailed(otto, "")).toBe("Hmm, I couldn't read that. Want to try another file?");
  });

  it("keeps English counts as plain digits", () => {
    expect(reviewSummary(otto, EN_FORMAT, { fail: 1200, warn: 0, pass: 0 })).toBe(
      "1200 checks need fixing.",
    );
  });
});
