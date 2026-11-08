import { describe, expect, it } from "vitest";
import { FEATURES, PLANS } from "@/config/plans";
import { formatUsd, limitLine, planCopy, PLAN_ORDER } from "./plan-features";
import { DEMO_CHECKS, DEMO_PERSON, PARSED_LINES } from "./recruiter-demo-data";

describe("plan copy", () => {
  it("lists Free, then Pro, then Max", () => {
    expect(PLAN_ORDER).toEqual(["free", "pro", "max"]);
  });

  it("states every plan's real monthly numbers from PLANS", () => {
    expect(planCopy("free").features).toContain(`${PLANS.free.limits.fix} line fixes a month`);
    expect(planCopy("free").features).toContain(`${PLANS.free.limits.tailor} tailored versions a month`);
    expect(planCopy("pro").features).toContain(`${PLANS.pro.limits.tailor} tailored versions a month`);
    expect(planCopy("pro", "month").lead).toBe("Everything in Free, with more each month:");
    expect(planCopy("max").features).toContain(
      `${PLANS.max.limits.fix.toLocaleString("en-US")} line fixes a month`,
    );
    for (const plan of PLAN_ORDER) {
      expect(planCopy(plan).features.length).toBeGreaterThanOrEqual(FEATURES.length);
    }
  });

  it("lists the weekly numbers a week for weekly Pro and Max, and keeps Free monthly", () => {
    expect(planCopy("pro", "week").features).toEqual([
      "15 tailored versions a week",
      "25 cover letters, answers and interview prep a week",
      "75 line fixes a week",
      "8 AI reads of an uploaded resume a week",
      "5 Build with Otto drafts a week",
      "5 GitHub project drafts a week",
    ]);
    expect(planCopy("pro", "week").lead).toBe("Everything in Free, with more each week:");
    expect(planCopy("max", "week").features).toContain("50 tailored versions a week");
    expect(planCopy("max", "week").features).toContain("250 line fixes a week");
    expect(planCopy("max", "week").features.join(" ")).not.toMatch(/a month/);
    expect(planCopy("free", "week")).toEqual(planCopy("free", "month"));
    expect(limitLine("free", "tailor", "week")).toBe(`${PLANS.free.limits.tailor} tailored versions a month`);
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
      for (const period of ["month", "week"] as const) {
        const copy = planCopy(plan, period);
        for (const line of [copy.summary, copy.lead ?? "", ...copy.features]) {
          expect(line).not.toMatch(/unlimited|fair use/i);
        }
      }
    }
  });

  it("gives each plan more than the one below it", () => {
    for (const feature of FEATURES) {
      expect(PLANS.pro.limits[feature]).toBeGreaterThan(PLANS.free.limits[feature]);
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
