import { describe, expect, it } from "vitest";
import { PLANS, type UsagePeriod } from "@/config/plans";
import { OTTO_ERRORS } from "./error-lines";
import { OTTO } from "./lines";

const CALENDAR: UsagePeriod = { kind: "month", resetsAt: Date.UTC(2026, 10, 14, 12) };
const TRIAL: UsagePeriod = { kind: "trial", resetsAt: Date.UTC(2026, 10, 11, 12) };
const MONTH: UsagePeriod = { kind: "month", resetsAt: Date.UTC(2026, 11, 17, 12), renews: true };

const SAMPLES: Record<string, unknown[][]> = {
  "signIn.reason": [["fix"], ["tailor"], ["letter"]],
  "limit.reached": [
    ["fix"],
    ["tailor"],
    ["letter"],
    ["import"],
    ["draft"],
    ["github"],
    ["fix", 1000],
    ["letter", 1000, CALENDAR],
    ["letter", 1000, MONTH],
    ["fix", 0],
    ["tailor", 10, TRIAL],
  ],
  "limit.freeUsed": [["fix"]],
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
    ["portfolio"],
    ["resumes", false],
  ],
  "limit.full": [
    ["resumes", "pro"],
    ["resumes", "max"],
    ["resumes", "pro", 40],
    ["resumes", "pro", 25, false],
    ["tracker", "pro"],
    ["tracker", "max"],
    ["tracker", "pro", 1_800],
  ],
  "upgrade.trialStarted": [["Nov 11"]],
  "limit.near": [
    ["tailor", 8, 10],
    ["letter", 27, 30],
    ["import", 1000, 1000],
    ["fix", Number.NaN, 5],
    ["letter", 70, 75, CALENDAR],
    ["letter", 270, 300, MONTH],
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

  it("uses Pro's limit unless told otherwise, and pitches the trial on a plan without the feature", () => {
    expect(OTTO.limit.reached("tailor")).toContain(
      `this month's ${PLANS.pro.limits.tailor} tailored versions`,
    );
    expect(OTTO.limit.reached("fix", 1000)).toContain("this month's 1000 line fixes");
    expect(OTTO.limit.reached("tailor", PLANS.free.limits.tailor)).toBe(
      "Tailoring comes with Pro. Try Pro for 7 days.",
    );
    expect(OTTO.limit.none("tailor")).toBe("Tailoring comes with Pro. Try Pro for 7 days.");
  });

  it("lets Free fix lines after sign-in, and points to Pro once its 3 are used", () => {
    expect(OTTO.signIn.reason("fix")).toBe(
      "Sign in to fix lines with me. On Free you get 3 a month.",
    );
    expect(OTTO.limit.freeUsed("fix")).toBe(
      `You've used this month's 3 line fixes. Pro has ${PLANS.pro.limits.fix} a month.`,
    );
    expect(OTTO.signIn.reason("tailor")).toBe(
      "Sign in, then try Pro for 7 days to tailor with me.",
    );
    expect(OTTO.upgrade.trial).not.toMatch(/free/i);
  });

  it("says when a trial's allowance gives way to the full one", () => {
    expect(OTTO.limit.reached("tailor", 10, TRIAL)).toMatch(
      /^You've used this trial's 10 tailored versions\. Your full allowance starts on Nov 1[12]\.$/,
    );
  });

  it("names the reset: the renewal for a billing month, the day for a calendar month", () => {
    expect(OTTO.limit.reached("tailor", 15)).toBe(
      "You've used this month's 15 tailored versions. They reset when your plan renews.",
    );
    expect(OTTO.limit.reached("tailor", 60, MONTH)).toMatch(
      /^You've used this month's 60 tailored versions\. They reset on Dec 1[78], when your plan renews\.$/,
    );
    expect(OTTO.limit.reached("tailor", 15, CALENDAR)).toMatch(
      /^You've used this month's 15 tailored versions\. They reset on Nov 1[45]\.$/,
    );
    expect(OTTO.limit.near("fix", 70, 75, CALENDAR)).toMatch(/used\. They reset on Nov 1[45]\.$/);
  });

  it("gives Free both paid plans' numbers of resumes and applications, never every one", () => {
    expect(OTTO.limit.tool("resumes", false)).toBe("Free keeps 1 resume. Pro keeps 25, Max 50.");
    expect(OTTO.limit.tool("tracker", false)).toBe(
      "Free tracks 1 application. Pro tracks 1,000, Max 2,000.",
    );
    expect(OTTO.limit.tool("tracker")).not.toMatch(/every one/);
  });

  it("at a paid plan's number, says to delete one, and offers Max only from Pro", () => {
    expect(OTTO.limit.full("resumes", "pro")).toBe(
      "Pro keeps 25 resumes. Delete one to save another, or move to Max for 50.",
    );
    expect(OTTO.limit.full("resumes", "max")).toBe(
      "Max keeps 50 resumes. Delete one to save another.",
    );
    expect(OTTO.limit.full("tracker", "pro")).toBe(
      "Pro tracks 1,000 applications. Delete some old ones to add more, or move to Max for 2,000.",
    );
    expect(OTTO.limit.full("tracker", "max")).toBe(
      "Max tracks 2,000 applications. Delete some old ones to add more.",
    );
    expect(OTTO.limit.full("resumes", "pro", 25, false)).toBe(
      "Pro keeps 25 resumes. Delete one to save another.",
    );
  });

  it("tells an account kept past its plan's number how many to delete", () => {
    expect(OTTO.limit.full("resumes", "pro", 40)).toBe(
      "Pro keeps 25 resumes; you have 40. Delete 16 to save another, or move to Max for 50.",
    );
    expect(OTTO.limit.full("tracker", "pro", 1_800)).toBe(
      "Pro tracks 1,000 applications; you have 1,800. Delete 801 to add another, or move to Max for 2,000.",
    );
    expect(OTTO.limit.full("resumes", "pro", 25)).toBe(OTTO.limit.full("resumes", "pro"));
  });

  it("keeps the error lines in one place, which the root error page reads on its own", () => {
    expect(OTTO.errors).toBe(OTTO_ERRORS);
  });
});
