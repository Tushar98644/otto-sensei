import { describe, expect, it } from "vitest";
import {
  PAID_PLANS,
  PRICES_USD,
  REFERENCE_MONTHLY_USD,
  referenceDiscountPercent,
} from "@/config/plans";
import {
  perMonth,
  planPriceLabel,
  priceSentence,
  proComparison,
  renewalPeriods,
  yearlySavingsPercent,
} from "./prices";

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

describe("reference prices and savings", () => {
  it("works the monthly discounts out from the reference prices", () => {
    expect(REFERENCE_MONTHLY_USD).toEqual({ pro: 30, max: 60 });
    expect(referenceDiscountPercent("pro")).toBe(50);
    // $29 against $60 is 51.7%, rounded.
    expect(referenceDiscountPercent("max")).toBe(52);
  });

  it("works the yearly saving out from the real prices", () => {
    // $120 against 12 x $15 = $180; $232 against 12 x $29 = $348.
    expect(yearlySavingsPercent("pro")).toBe(33);
    expect(yearlySavingsPercent("max")).toBe(33);
  });

  it("compares Pro with Rezi Pro only while it's about half the price", () => {
    expect(proComparison()).toBe("About half the price of Rezi Pro ($29/mo)");
  });
});
