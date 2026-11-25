import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetEnvForTests } from "@/lib/env";
import { JOB_COUNTS_FALLBACK } from "@/lib/job-feed/counts";
import PricingPage from "./pricing/page";
import TermsPage from "./terms/page";

vi.mock("next/font/google", () => {
  const font = () => () => ({ className: "face", variable: "", style: { fontFamily: "serif" } });
  return { Inter: font(), EB_Garamond: font() };
});

vi.mock("@/lib/job-feed/live-counts", () => ({
  loadJobCounts: async () => JOB_COUNTS_FALLBACK,
}));

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .replace(/ ([.,:;])/g, "$1");

function creditOn(on: boolean) {
  vi.stubEnv("DODO_TOPUP_PRODUCT_ID", on ? "pdt_TopupCredit00000001" : "");
  resetEnvForTests();
}

afterEach(() => {
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("credit copy on the public pages", () => {
  it("says nothing about credit while it isn't on sale", async () => {
    creditOn(false);
    const terms = text(renderToStaticMarkup(await TermsPage()));
    const pricing = text(renderToStaticMarkup(await PricingPage()));
    for (const body of [terms, pricing]) expect(body).not.toMatch(/prepaid credit|add credit/i);
  });

  it("spells out credit in the terms, the pricing line and the FAQ once it is", async () => {
    creditOn(true);
    const terms = text(renderToStaticMarkup(await TermsPage()));
    expect(terms).toContain(
      "A paid Pro or Max plan past any trial can add prepaid credit, from $5 to $100 at a time in whole dollars, plus any taxes.",
    );
    expect(terms).toContain(
      "only once a month's allowance for that help, or the AI budget, runs out, at the prices shown at the time it's used.",
    );
    expect(terms).toContain("Credit is prepaid and isn't refundable once used.");
    expect(terms).toContain("is removed when your account is deleted.");
    const pricing = text(renderToStaticMarkup(await PricingPage()));
    expect(pricing).toContain(
      "Run out? Add credit from $5: $1 = 10 tailored versions, 10 letters or 50 line fixes.",
    );
    expect(pricing).toContain(
      "or once the AI budget runs out, at the prices shown at the time it's used.",
    );
  });
});
