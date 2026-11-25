import { describe, expect, it } from "vitest";
import { OTTO } from "@/components/mascot/lines";
import { formatFor } from "@/i18n/intl";
import { englishMessages } from "@/i18n/messages";
import { pricingPage } from "@/lib/seo-pages/pages";
import { pricingMeta } from "./pricing-meta";

const EN = englishMessages().pricing;

describe("the pricing page's words", () => {
  it("title and describe the page in English as src/lib/seo-pages/pages.ts does", () => {
    for (const trial of [true, false]) {
      const { title, description } = pricingPage(trial);
      expect(pricingMeta(EN, formatFor("en"), trial)).toEqual({ title, description });
    }
  });

  it("give Otto the same note as his English lines", () => {
    expect(EN.page.otto).toBe(OTTO.pricing.samePrinciples);
  });
});
