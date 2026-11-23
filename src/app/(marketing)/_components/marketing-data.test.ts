import { describe, expect, it } from "vitest";
import { BILLING_INTERVALS, FEATURES, PLANS, PRICES_USD, PRO_TRIAL } from "@/config/plans";
import {
  formatUsd,
  limitLine,
  planCopy,
  PLAN_ORDER,
  plansOnSale,
  proTools,
  quotaLine,
} from "./plan-features";
import { DEMO_CHECKS, DEMO_PERSON, PARSED_LINES } from "./recruiter-demo-data";

describe("plan copy", () => {
  it("lists Free, then Pro, then Max", () => {
    expect(PLAN_ORDER).toEqual(["free", "pro", "max"]);
  });

  it("gives every card 5 or 6 outcomes, with the numbers in one quota line", () => {
    for (const plan of PLAN_ORDER) {
      const { features } = planCopy(plan);
      expect(features.length).toBeGreaterThanOrEqual(5);
      expect(features.length).toBeLessThanOrEqual(6);
      expect(features.join(" ")).not.toMatch(
        /AI reads of an uploaded resume|Build with Otto drafts|GitHub project drafts/,
      );
    }
  });

  it("lists what Free has and puts the rest on Pro", () => {
    expect(planCopy("free").features).toEqual([
      "Upload a resume and see what hiring software reads",
      "Fix every line by hand, or with Otto",
      "Download a clean PDF in Classic or Compact",
      "Your 5 closest job matches",
      "Track 1 application, with a follow-up reminder",
    ]);
    expect(planCopy("free").quota).toBe("1 resume · 3 line fixes a month from Otto");
    expect(planCopy("free").features.join(" ")).not.toMatch(/tracker|share|word|AI help/i);
    expect(planCopy("pro").features).toEqual([
      "Otto tailors your resume to each job",
      "Cover letters, outreach and interview prep from Otto",
      ...proTools(),
    ]);
    expect(proTools().join(" ")).toMatch(/All 6 formats, up to 25 resumes and Word downloads/);
    expect(proTools().join(" ")).toMatch(/Every match from [0-9,]+\+ open jobs/);
    expect(proTools().join(" ")).toMatch(
      /Track up to 1,500 applications, with follow-up reminders/,
    );
    expect(proTools().join(" ")).not.toMatch(/every application/i);
    expect(proTools().join(" ")).toMatch(/Share links, and a portfolio site in all \d+ designs/);
    expect(planCopy("pro", "month").lead).toBe("Everything in Free, plus:");
  });

  it("writes Pro's and Max's quota lines from PLANS", () => {
    expect(planCopy("pro").quota).toBe(
      `${PLANS.pro.limits.tailor} tailored versions · ${PLANS.pro.limits.letter} letters and prep · ${PLANS.pro.limits.fix} line fixes a month`,
    );
    expect(planCopy("max").quota).toBe(
      "300 tailored versions · 300 letters and prep · 2,000 line fixes a month",
    );
    expect(planCopy("max").quota).not.toMatch(/week/);
  });

  it("says how much more Max gives, worked out from PLANS", () => {
    expect(planCopy("max", "month").lead).toBe("Everything in Pro, with more:");
    expect(planCopy("max").features).toEqual([
      "Twice the tailored versions",
      "Twice the cover letters, outreach and interview prep",
      "Over twice the line fixes",
      "3 times the uploads read by AI",
      "3 times the drafts from your notes and GitHub",
      "Up to 50 resumes and 3,000 tracked applications",
    ]);
  });

  it("writes the trial's allowance for the whole trial", () => {
    expect(quotaLine("pro", "trial")).toBe(
      `${PRO_TRIAL.limits.tailor} tailored versions · ${PRO_TRIAL.limits.letter} letters and prep · ${PRO_TRIAL.limits.fix} line fixes during the trial`,
    );
    expect(PRO_TRIAL).toMatchObject({ plan: "pro", interval: "month", days: 3, priceUsd: 1 });
    expect(planCopy("free", "trial")).toEqual(planCopy("free", "month"));
    expect(limitLine("free", "fix", "trial")).toBe("3 line fixes a month");
    expect(limitLine("pro", "tailor")).toBe("150 tailored versions a month");
  });

  it("shows Free plus each paid plan that is on sale", () => {
    expect(plansOnSale({ pro: ["month"], max: ["month", "year"] })).toEqual(["free", "pro", "max"]);
    expect(plansOnSale({ pro: ["month"], max: [] })).toEqual(["free", "pro"]);
  });

  it("has no weekly plans or prices", () => {
    expect(BILLING_INTERVALS).toEqual(["month", "year"]);
    for (const plan of PLAN_ORDER) expect(Object.keys(PLANS[plan])).not.toContain("weeklyLimits");
    expect(Object.keys(PRICES_USD.pro)).toEqual(["month", "year"]);
    expect(Object.keys(PRICES_USD.max)).toEqual(["month", "year"]);
  });

  it("never claims unlimited use or fair use", () => {
    for (const plan of PLAN_ORDER) {
      for (const period of ["month", "trial"] as const) {
        const copy = planCopy(plan, period);
        for (const line of [copy.summary, copy.lead ?? "", copy.quota, ...copy.features]) {
          expect(line).not.toMatch(/unlimited|fair use/i);
        }
      }
    }
  });

  it("gives each plan more than the one below it, and Free only a taste of line fixes", () => {
    expect(PLANS.free.limits).toEqual({
      tailor: 0,
      letter: 0,
      fix: 3,
      import: 0,
      draft: 0,
      github: 0,
    });
    for (const feature of FEATURES) {
      expect(PRO_TRIAL.limits[feature]).toBeGreaterThan(PLANS.free.limits[feature]);
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
