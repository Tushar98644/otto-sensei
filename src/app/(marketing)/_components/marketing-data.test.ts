import { describe, expect, it } from "vitest";
import { FEATURES, PLANS, PRO_TRIAL } from "@/config/plans";
import {
  FREE_BASICS,
  formatUsd,
  limitLine,
  planCopy,
  PLAN_ORDER,
  PRO_TOOLS,
  trialLines,
} from "./plan-features";
import { DEMO_CHECKS, DEMO_PERSON, PARSED_LINES } from "./recruiter-demo-data";

describe("plan copy", () => {
  it("lists Free, then Pro, then Max", () => {
    expect(PLAN_ORDER).toEqual(["free", "pro", "max"]);
  });

  it("lists exactly what Free has, and puts the rest on Pro", () => {
    expect(planCopy("free").features).toEqual([
      "Upload a resume, read by the basic reader (no AI)",
      "The recruiter view: what hiring software reads",
      "Edit and fix every line by hand",
      "1 resume",
      "Classic and Compact formats",
      "PDF download",
      "Your 5 closest job matches",
      "1 tracked application, with a follow-up reminder",
    ]);
    expect(planCopy("free").features.join(" ")).not.toMatch(/tracker|jobs|share|word|AI help/i);
    expect(planCopy("pro").features).toEqual(expect.arrayContaining([...PRO_TOOLS]));
    expect(PRO_TOOLS.join(" ")).toMatch(/All 6 formats and up to 50 resumes/);
    expect(PRO_TOOLS.join(" ")).toMatch(/Word \(\.docx\) downloads/);
    expect(PRO_TOOLS.join(" ")).toMatch(/Track every application/);
    expect(PRO_TOOLS.join(" ")).toMatch(/Every match from [0-9,]+\+ open jobs/);
    expect(PRO_TOOLS.join(" ")).toMatch(/Share links/);
  });

  it("lists Free's basics and Pro's and Max's real numbers from PLANS", () => {
    expect(planCopy("free").features).toEqual(FREE_BASICS);
    expect(planCopy("free").features.join(" ")).toMatch(/recruiter view/);
    expect(planCopy("pro").features).toContain(
      `${PLANS.pro.limits.tailor} tailored versions a month`,
    );
    expect(planCopy("pro", "month").lead).toBe("Everything in Free, plus:");
    expect(planCopy("pro").features.join(" ")).toMatch(/portfolio site/i);
    expect(planCopy("max").features).toContain(
      `${PLANS.max.limits.fix.toLocaleString("en-US")} line fixes a month`,
    );
    expect(planCopy("pro").features.length).toBeGreaterThanOrEqual(FEATURES.length);
    expect(planCopy("pro").features).toContain("AI reads of an uploaded resume");
    expect(planCopy("max").features).toHaveLength(3);
  });

  it("writes the trial's allowance for the whole trial", () => {
    expect(trialLines()).toContain(`${PRO_TRIAL.limits.tailor} tailored versions during the trial`);
    expect(trialLines()).toContain(`${PRO_TRIAL.limits.fix} line fixes during the trial`);
    expect(PRO_TRIAL).toMatchObject({ plan: "pro", interval: "month", days: 3, priceUsd: 0 });
  });

  it("lists the weekly numbers a week for weekly Pro and Max, and keeps Free monthly", () => {
    expect(planCopy("pro", "week").features).toEqual([
      "38 tailored versions a week",
      "38 cover letters, answers and interview prep a week",
      "188 line fixes a week",
      "AI reads of an uploaded resume",
      "Build with Otto drafts",
      "GitHub project drafts",
      ...PRO_TOOLS,
      "A hosted portfolio site made from your resume, in all 8 designs",
    ]);
    expect(planCopy("pro", "week").lead).toBe("Everything in Free, plus:");
    expect(planCopy("max", "week").features).toContain("75 tailored versions a week");
    expect(planCopy("max", "week").features).toContain("500 line fixes a week");
    expect(planCopy("max", "week").features.join(" ")).not.toMatch(/a month/);
    expect(planCopy("free", "week")).toEqual(planCopy("free", "month"));
    expect(limitLine("free", "tailor", "week")).toBe("0 tailored versions a month");
  });

  it("gives weekly plans a quarter of the monthly limit, rounded up", () => {
    for (const plan of ["pro", "max"] as const) {
      for (const feature of FEATURES) {
        expect(PLANS[plan].weeklyLimits[feature]).toBe(Math.ceil(PLANS[plan].limits[feature] / 4));
      }
    }
  });

  it("never claims unlimited use or fair use", () => {
    for (const plan of PLAN_ORDER) {
      for (const period of ["month", "week", "trial"] as const) {
        const copy = planCopy(plan, period);
        for (const line of [copy.summary, copy.lead ?? "", ...copy.features, ...trialLines()]) {
          expect(line).not.toMatch(/unlimited|fair use/i);
        }
      }
    }
  });

  it("gives each plan more than the one below it", () => {
    for (const feature of FEATURES) {
      expect(PLANS.free.limits[feature]).toBe(0);
      expect(PRO_TRIAL.limits[feature]).toBeGreaterThan(0);
      expect(PLANS.pro.limits[feature]).toBeGreaterThan(PRO_TRIAL.limits[feature]);
      expect(PLANS.max.limits[feature]).toBeGreaterThan(PLANS.pro.limits[feature]);
    }
  });

  it("formats USD without stray cents", () => {
    expect(formatUsd(12)).toBe("$12");
    expect(formatUsd(0)).toBe("$0");
    expect(formatUsd(12.5)).toBe("$12.50");
    expect(formatUsd(PLANS.pro.priceUsd)).toBe(`$${PLANS.pro.priceUsd}`);
  });
});

describe("recruiter demo", () => {
  const lines = PARSED_LINES.map((line) => line.map((segment) => segment.text).join(""));

  it("starts with the header the way the resume shows it", () => {
    expect(lines.slice(0, 2)).toEqual([DEMO_PERSON.name, DEMO_PERSON.role]);
    expect(lines[2]).toContain(DEMO_PERSON.email);
    expect(lines[2]).toContain(DEMO_PERSON.phone);
  });

  it("reads straight across both columns, side column first on each line", () => {
    expect(lines.slice(3)).toEqual([
      "SKILLS EXPERIENCE",
      "Figma Senior Product Designer",
      "User research Pinewood Apps · 2021 – now",
      "Prototyping • Redesigned checkout. Orders up 18%.",
      "LANGUAGES Product Designer",
      "English Tidewater Studio · 2018 – 2021",
      "Spanish • Built the team's design system.",
    ]);
  });

  it("marks every side-column word and every broken icon", () => {
    const marked = PARSED_LINES.flat().filter((segment) => segment.kind);
    const columns = marked.filter((segment) => segment.kind === "column").map((s) => s.text);
    expect(columns).toEqual([
      "SKILLS",
      ...DEMO_PERSON.skills,
      "LANGUAGES",
      ...DEMO_PERSON.languages,
    ]);
    expect(marked.filter((segment) => segment.kind === "symbol")).toHaveLength(2);
  });

  it("orders checks like a real report: fail, warn, pass", () => {
    expect(DEMO_CHECKS.map((check) => check.status)).toEqual(["fail", "warn", "pass"]);
  });
});
