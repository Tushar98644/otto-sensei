import { describe, expect, it } from "vitest";
import { FEATURES, PLANS } from "./plans";
import {
  buysSentence,
  centsText,
  creditBuys,
  creditCents,
  creditPriceList,
  creditPricingLine,
  isTopupAmount,
  TOPUP_LIMITS,
} from "./topup";

describe("credit prices", () => {
  it("are what a fifteenth of Pro buys per dollar, from the plan's own numbers", () => {
    for (const feature of FEATURES) {
      const included = PLANS.pro.limits[feature];
      expect(creditCents(feature)).toBe(Math.round((PLANS.pro.priceUsd * 100) / included));
    }
  });

  it("come to today's prices with today's Pro", () => {
    expect(Object.fromEntries(FEATURES.map((feature) => [feature, creditCents(feature)]))).toEqual(
      { tailor: 10, letter: 10, fix: 2, import: 15, draft: 30, github: 30 },
    );
  });

  it("keep a plan the better deal: Pro's price never buys more as credit", () => {
    for (const feature of FEATURES) {
      expect(creditBuys(PLANS.pro.priceUsd * 100, feature)).toBeLessThanOrEqual(
        PLANS.pro.limits[feature] * 1.05,
      );
    }
  });

  it("say what a dollar and an amount buy", () => {
    expect(buysSentence(1)).toBe("$1 = 10 tailored versions, 10 letters or 50 line fixes");
    expect(buysSentence(20)).toBe("$20 = 200 tailored versions, 200 letters or 1,000 line fixes");
    expect(creditBuys(430, "tailor")).toBe(43);
    expect(creditBuys(-5, "fix")).toBe(0);
    expect(creditPricingLine()).toBe(
      "Run out? Add credit from $5: $1 = 10 tailored versions, 10 letters or 50 line fixes.",
    );
    expect(creditPriceList()).toContain("2¢ per line fix");
  });

  it("write cents and dollars the way the app shows them", () => {
    expect(centsText(10)).toBe("10¢");
    expect(centsText(100)).toBe("$1");
    expect(centsText(420)).toBe("$4.20");
  });
});

describe("top-up amounts", () => {
  it("take whole dollars from the minimum to the maximum", () => {
    expect(TOPUP_LIMITS.minUsd).toBe(5);
    expect(isTopupAmount(TOPUP_LIMITS.minUsd)).toBe(true);
    expect(isTopupAmount(TOPUP_LIMITS.maxUsd)).toBe(true);
    expect(isTopupAmount(TOPUP_LIMITS.minUsd - 1)).toBe(false);
    expect(isTopupAmount(TOPUP_LIMITS.maxUsd + 1)).toBe(false);
    expect(isTopupAmount(5.5)).toBe(false);
    expect(isTopupAmount(Number.NaN)).toBe(false);
    for (const preset of TOPUP_LIMITS.presetsUsd) expect(isTopupAmount(preset)).toBe(true);
  });
});
