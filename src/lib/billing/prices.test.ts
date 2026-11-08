import { describe, expect, it } from "vitest";
import { PAID_PLANS, PRICES_USD } from "@/config/plans";
import { perMonth, planPriceLabel, priceSentence, renewalPeriods, yearlySavingsPercent } from "./prices";

describe("plan prices", () => {
  it("are the owner's numbers", () => {
    expect(PRICES_USD).toEqual({
      pro: { month: 15, year: 120, week: 6 },
      max: { month: 29, year: 232, week: 12 },
    });
  });

  it("writes each option from the config", () => {
    for (const plan of PAID_PLANS) {
      expect(planPriceLabel(plan, "month")).toBe(`$${PRICES_USD[plan].month}/month`);
      expect(planPriceLabel(plan, "year")).toBe(`$${PRICES_USD[plan].year}/year`);
      expect(planPriceLabel(plan, "week")).toBe(`$${PRICES_USD[plan].week}/week`);
    }
  });

  it("states the yearly saving it really gives, rounded down", () => {
    for (const plan of PAID_PLANS) {
      const expected = Math.floor((1 - PRICES_USD[plan].year / (PRICES_USD[plan].month * 12)) * 100);
      expect(yearlySavingsPercent(plan)).toBe(Math.max(0, expected));
      if (expected > 0) expect(priceSentence(plan, "year")).toContain(`${expected}% less`);
      expect(priceSentence(plan, "week")).toMatch(/^\$\d+(\.\d{2})? a week/);
    }
    expect(yearlySavingsPercent("pro")).toBe(33);
    expect(perMonth("pro")).toBe("$10");
  });
});

describe("pricing page lines", () => {
  it("names every renewal period on offer", () => {
    expect(renewalPeriods(["month"])).toBe("month");
    expect(renewalPeriods(["month", "year"])).toBe("month or year");
    expect(renewalPeriods(["month", "year", "week"])).toBe("month, year or week");
  });
});
