import { describe, expect, it } from "vitest";
import { PAID_PLANS } from "@/config/plans";
import * as topup from "@/config/topup";
import { formatFor } from "@/i18n/intl";
import { englishMessages } from "@/i18n/messages";
import * as prices from "@/lib/billing/prices";
import { trialEndDay } from "@/lib/usage-copy";
import { creditCopy, joinList, priceCopy, usd } from "./price-copy";

const en = priceCopy(englishMessages().pricing, formatFor("en"));
const credit = creditCopy(englishMessages().pricing.credit, formatFor("en"));

describe("credit words", () => {
  it("say in English exactly what src/config/topup.ts says", () => {
    expect(credit.pricingLine()).toBe(topup.creditPricingLine());
    expect(credit.priceList()).toBe(topup.creditPriceList());
    for (const amount of [1, 5, 20, 100]) {
      expect(credit.buysSentence(amount)).toBe(topup.buysSentence(amount));
    }
    for (const cents of [1, 10, 99, 100, 150, 1_000]) {
      expect(credit.centsText(cents)).toBe(topup.centsText(cents));
    }
  });
});

describe("the trial's end day", () => {
  it("reads in English as src/lib/usage-copy.ts writes it", () => {
    for (const at of [Date.UTC(2026, 10, 24, 12), Date.UTC(2027, 0, 1, 3)]) {
      expect(en.trialEndDay(at)).toBe(trialEndDay(at));
    }
  });
});

describe("price words", () => {
  it("say in English exactly what src/lib/billing/prices.ts says", () => {
    expect(en.trialOffer()).toBe(prices.trialOffer());
    expect(en.trialHeadline()).toBe(prices.trialHeadline());
    expect(en.trialPrice()).toBe(prices.trialPrice());
    expect(en.trialSentence()).toBe(prices.trialSentence());
    for (const plan of PAID_PLANS) {
      expect(en.perMonth(plan)).toBe(prices.perMonth(plan));
      for (const interval of ["month", "year"] as const) {
        expect(en.planPrice(plan, interval)).toBe(prices.planPrice(plan, interval));
        expect(en.planPriceLabel(plan, interval)).toBe(prices.planPriceLabel(plan, interval));
        expect(en.priceSentence(plan, interval)).toBe(prices.priceSentence(plan, interval));
        expect(en.endsTrialSentence(plan, interval)).toBe(prices.endsTrialSentence(plan, interval));
      }
    }
    for (const intervals of [[], ["month"], ["month", "year"]] as const) {
      expect(en.renewalPeriods(intervals)).toBe(prices.renewalPeriods(intervals));
    }
  });

  it("keeps prices in US dollars, written the way each language writes money", () => {
    expect(usd(formatFor("en"), 12)).toBe("$12");
    expect(usd(formatFor("de"), 12)).toMatch(/^12\s\$$/);
    expect(usd(formatFor("pt-BR"), 1.5)).toMatch(/^US\$\s1,50$/);
  });

  it("lists without a serial comma in English and as Intl does elsewhere", () => {
    expect(joinList(formatFor("en"), ["a", "b", "c"], "or")).toBe("a, b or c");
    expect(joinList(formatFor("en"), ["a", "b"], "and")).toBe("a and b");
    expect(joinList(formatFor("es"), ["a", "b", "c"], "and")).toBe("a, b y c");
  });
});
