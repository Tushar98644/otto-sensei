import { describe, expect, it } from "vitest";
import {
  PAID_PLANS,
  PRICES_USD,
  REFERENCE_MONTHLY_USD,
  referenceDiscountPercent,
} from "@/config/plans";
import {
  endsTrialSentence,
  perMonth,
  planPriceLabel,
  priceSentence,
  renewalPeriods,
  trialHeadline,
  trialOffer,
  trialSentence,
  yearlySavingsPercent,
} from "./prices";

describe("plan prices", () => {
  it("are the owner's numbers", () => {
    expect(PRICES_USD).toEqual({
      pro: { month: 15, year: 120 },
      max: { month: 29, year: 232 },
    });
  });

  it("writes each option from the config", () => {
    for (const plan of PAID_PLANS) {
      expect(planPriceLabel(plan, "month")).toBe(`$${PRICES_USD[plan].month}/month`);
      expect(planPriceLabel(plan, "year")).toBe(`$${PRICES_USD[plan].year}/year`);
    }
  });

  it("states the yearly saving it really gives, rounded down", () => {
    for (const plan of PAID_PLANS) {
      const expected = Math.floor(
        (1 - PRICES_USD[plan].year / (PRICES_USD[plan].month * 12)) * 100,
      );
      expect(yearlySavingsPercent(plan)).toBe(Math.max(0, expected));
      if (expected > 0) expect(priceSentence(plan, "year")).toContain(`${expected}% less`);
      expect(priceSentence(plan, "month")).toBe(
        `$${PRICES_USD[plan].month} a month. Cancel anytime.`,
      );
    }
    expect(yearlySavingsPercent("pro")).toBe(33);
    expect(perMonth("pro")).toBe("$10");
  });
});

describe("pricing page lines", () => {
  it("names every renewal period on offer", () => {
    expect(renewalPeriods(["month"])).toBe("month");
    expect(renewalPeriods(["month", "year"])).toBe("month or year");
    expect(renewalPeriods([])).toBe("month");
  });
});

describe("reference prices and savings", () => {
  it("works the monthly discounts out from the reference prices", () => {
    expect(REFERENCE_MONTHLY_USD).toEqual({ pro: 30, max: 60 });
    expect(referenceDiscountPercent("pro")).toBe(50);
    expect(referenceDiscountPercent("max")).toBe(52);
  });

  it("works the yearly saving out from the real prices", () => {
    expect(yearlySavingsPercent("pro")).toBe(33);
    expect(yearlySavingsPercent("max")).toBe(33);
  });

  it("says what buying Max on the Pro trial does, priced for the picked option", () => {
    expect(endsTrialSentence("max", "month")).toBe(
      "Ends your Pro trial today and starts Max at $29/month.",
    );
    expect(endsTrialSentence("max", "year")).toBe(
      "Ends your Pro trial today and starts Max at $232/year.",
    );
  });

  it("offers the trial as the way to start Pro, never as another free plan", () => {
    expect(trialOffer()).toBe("Pro for 7 days");
    expect(trialHeadline()).toBe("Try Pro for 7 days");
    expect(trialSentence()).toBe(
      "$1 for 7 days, then $15 a month. Cancel anytime before the trial ends.",
    );
    for (const line of [trialHeadline(), trialSentence(), endsTrialSentence("max", "month")]) {
      expect(line).not.toMatch(/free/i);
    }
  });
});
