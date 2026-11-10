import { describe, expect, it } from "vitest";
import { PLANS, type UsagePeriod } from "@/config/plans";
import { OTTO } from "./lines";

// Noon UTC, so it's Nov 14 or 15 in every time zone the tests might run in.
const WEEK: UsagePeriod = { kind: "week", resetsAt: Date.UTC(2026, 10, 14, 12) };
const TRIAL: UsagePeriod = { kind: "trial", resetsAt: Date.UTC(2026, 10, 11, 12) };

// Representative arguments for every line that is a function, keyed by path. A new function line
// without samples fails the walk below, so nothing ships unchecked.
const SAMPLES: Record<string, unknown[][]> = {
  "upload.failed": [["That file isn't a PDF or Word document."], ["No text found"], ["  "]],
  "review.summary": [
    [{ fail: 2, warn: 1, pass: 8 }],
    [{ fail: 1, warn: 0, pass: 1 }],
    [{ fail: 13, warn: 0, pass: 0 }],
    [{ fail: 0, warn: 3, pass: 9 }],
    [{ fail: 0, warn: 0, pass: 12 }],
  ],
  "fix.manyIssues": [[0], [1], [24]],
  "tailor.screener": [
    [
      { proven: 0, total: 0 },
      { proven: 0, total: 0 },
    ],
    [
      { proven: 0, total: 0 },
      { proven: 2, total: 5 },
    ],
    [
      { proven: 1, total: 1 },
      { proven: 0, total: 3 },
    ],
    [
      { proven: 8, total: 8 },
      { proven: 1, total: 6 },
    ],
    [
      { proven: 0, total: 6 },
      { proven: 0, total: 2 },
    ],
    [
      { proven: 5, total: 8 },
      { proven: 3, total: 6 },
    ],
    [
      { proven: 7, total: 8 },
      { proven: 3, total: 6 },
    ],
  ],
  "download.checked": [
    [{ before: 0, after: 0 }],
    [{ before: 1, after: 0 }],
    [{ before: 12, after: 3 }],
    [{ before: 2, after: 2 }],
  ],
  "signIn.reason": [["fix"], ["tailor"], ["letter"]],
  "limit.reached": [
    ["fix"],
    ["tailor"],
    ["letter"],
    ["import"],
    ["draft"],
    ["github"],
    ["fix", 1000],
    ["letter", 1000, WEEK],
    ["fix", 0],
    ["tailor", 10, TRIAL],
  ],
  "limit.none": [
    ["fix"],
    ["tailor"],
    ["letter"],
    ["import"],
    ["draft"],
    ["github"],
    ["fix", false],
  ],
  "limit.tool": [
    ["resumes"],
    ["formats"],
    ["word"],
    ["tracker"],
    ["jobs"],
    ["share"],
    ["eligibility"],
    ["resumes", false],
  ],
  "upgrade.trialStarted": [["Nov 11"]],
  "limit.near": [
    ["tailor", 8, 10],
    ["letter", 27, 30],
    ["import", 1000, 1000],
    ["fix", Number.NaN, 5],
    ["letter", 70, 75, WEEK],
    ["fix", 45, 50, TRIAL],
  ],
  "upgrade.done": [["Pro"], ["Max"]],
  "jobs.found": [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [23, 23, 5, 2],
    [1234, 300, 0, 7],
    [27_833, 300, 300, 300],
    [Number.NaN, 2, 2, 0],
  ],
  "jobs.saved": [[0], [1], [12]],
};

function everyLine() {
  const lines: { path: string; text: string }[] = [];
  for (const [group, value] of Object.entries(OTTO)) {
    if (typeof value === "string") {
      lines.push({ path: group, text: value });
      continue;
    }
    for (const [key, line] of Object.entries(value)) {
      const path = `${group}.${key}`;
      if (typeof line === "string") {
        lines.push({ path, text: line });
        continue;
      }
      const samples = SAMPLES[path];
      if (!samples) throw new Error(`Add sample arguments for ${path} to SAMPLES`);
      const say = line as (...args: unknown[]) => string;
      for (const args of samples) lines.push({ path, text: say(...args) });
    }
  }
  return lines;
}

describe("OTTO lines", () => {
  it.each(everyLine())("$path stays short, plain and complete: $text", ({ text }) => {
    expect(text.trim()).toBe(text);
    expect(text).not.toMatch(/\s{2,}|undefined|NaN|null/);
    expect(text).toMatch(/[.!?]$/);
    expect(text.split(/\s+/).length).toBeLessThanOrEqual(18);
    // Global audience: no region-specific money words.
    expect(text).not.toMatch(/₹|lakh|crore|rupee/i);
  });

  it("counts jobs found as facts, with no score", () => {
    expect(OTTO.jobs.found(23, 23, 5, 2)).toBe(
      "I found 23 jobs that match your resume. 5 look strong, 2 are new today.",
    );
    expect(OTTO.jobs.found(1, 1, 0, 0)).toBe("I found 1 job that matches your resume.");
    expect(OTTO.jobs.found(2000, 300, 3, 0)).toBe(
      "I found 2,000 matching jobs. Here are the closest 300. 3 look strong.",
    );
  });

  it("summarizes checks with correct grammar", () => {
    expect(OTTO.review.summary({ fail: 2, warn: 1, pass: 8 })).toBe(
      "2 checks need fixing and 1 could be better. 8 already look good.",
    );
    expect(OTTO.review.summary({ fail: 1, warn: 0, pass: 1 })).toBe(
      "1 check needs fixing. 1 already looks good.",
    );
    expect(OTTO.review.summary({ fail: 0, warn: 2, pass: 5 })).toBe(
      "Nothing's broken. 2 small things could be better.",
    );
    expect(OTTO.review.summary({ fail: 0, warn: 0, pass: 9 })).toBe(OTTO.review.allGood);
  });

  it("leads the screener line with must-haves and never overstates the count", () => {
    expect(OTTO.tailor.screener({ proven: 5, total: 8 }, { proven: 3, total: 6 })).toBe(
      "Your resume proves 5 of 8 must-haves. Let's look at the other 3.",
    );
    expect(OTTO.tailor.screener({ proven: 7, total: 8 }, { proven: 0, total: 0 })).toContain(
      "the one left",
    );
    expect(OTTO.tailor.screener({ proven: 12, total: 8 }, { proven: 0, total: 0 })).toContain(
      "all 8",
    );
    expect(
      OTTO.tailor.screener({ proven: Number.NaN, total: 4 }, { proven: 0, total: 0 }),
    ).toContain("the 4 must-haves");
  });

  it("reports the before and after PDF check", () => {
    expect(OTTO.download.checked({ before: 4, after: 0 })).toBe(
      "Before: 4 problems. After: none. Hiring software can read every line.",
    );
    expect(OTTO.download.checked({ before: 1, after: 0 })).toMatch(/^Before: 1 problem\./);
  });

  it("uses Pro's limit unless told otherwise, and pitches the trial on a plan without the feature", () => {
    expect(OTTO.limit.reached("tailor")).toContain(
      `all ${PLANS.pro.limits.tailor} tailored versions`,
    );
    expect(OTTO.limit.reached("fix", 1000)).toContain("all 1000 line fixes");
    expect(OTTO.limit.reached("fix", PLANS.free.limits.fix)).toBe(
      "Line fixes come with Pro. Try it free for 3 days.",
    );
    expect(OTTO.limit.none("tailor")).toBe("Tailoring comes with Pro. Try it free for 3 days.");
  });

  it("says when a trial's allowance gives way to the full one", () => {
    expect(OTTO.limit.reached("tailor", 10, TRIAL)).toMatch(
      /^You've used all 10 tailored versions for this trial\. Your full allowance starts on Nov 1[12]\.$/,
    );
  });

  it("names the week and its reset day for a weekly allowance", () => {
    expect(OTTO.limit.reached("tailor", 15)).toBe(
      "You've used all 15 tailored versions for this month. They reset on the 1st.",
    );
    expect(OTTO.limit.reached("tailor", 15, WEEK)).toMatch(
      /^You've used all 15 tailored versions for this week\. They reset on Nov 1[45]\.$/,
    );
    expect(OTTO.limit.near("fix", 70, 75, WEEK)).toMatch(/used\. They reset on Nov 1[45]\.$/);
  });

  it("turns a failure reason into a full sentence", () => {
    expect(OTTO.upload.failed("No text found")).toBe("Hmm, I couldn't read that. No text found.");
    expect(OTTO.upload.failed("")).toBe("Hmm, I couldn't read that. Want to try another file?");
  });
});
