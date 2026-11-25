import { describe, expect, it } from "vitest";
import type { Me } from "@/components/account/use-me";
import { formatFor } from "@/i18n/intl";
import en from "@/i18n/messages/en";
import { loadMessages } from "@/i18n/messages";
import { maxLine, nextStep, planPill, priceParts, yearlyOffer, type PlanView } from "./plan-copy";

const NOV_23 = Date.UTC(2026, 10, 23, 12);
const EN = formatFor("en");
const W = en.account.plan;
const OFFER: Me["billing"]["offer"] = { pro: ["month", "year"], max: ["month", "year"] };

const paid: PlanView = {
  kind: "paid",
  plan: "pro",
  interval: "month",
  renewsAt: NOV_23,
  endsAt: NOV_23,
  ending: false,
};
const trial: PlanView = {
  kind: "trial",
  plan: "pro",
  interval: "month",
  endsAt: NOV_23,
  ending: false,
};

describe("the plan card's words in English", () => {
  it("reads as it always has", () => {
    expect(nextStep(W, EN, paid)).toBe(
      "Your plan renews on Nov 23 at $15 a month. Cancel anytime before then.",
    );
    expect(nextStep(W, EN, trial)).toBe(
      "You paid $1 for the trial. On Nov 23 Pro starts at $15 a month. We remind you the day before.",
    );
    expect(nextStep(W, EN, { ...paid, ending: true })).toBe(
      "Your plan ends on Nov 23, and your account moves to Free then. You won't be charged again.",
    );
    expect(planPill(W, EN, trial, NOV_23 - 3 * 86_400_000)).toEqual({
      label: "Trial · 3 days left",
      tone: "live",
    });
    expect(priceParts(W, EN, paid)).toEqual({
      amount: "$15",
      per: "/month",
      note: "renews Nov 23",
    });
    expect(yearlyOffer(W, EN, paid, OFFER)?.how).toBe(
      "A plan can't move between monthly and yearly partway through. Cancel monthly before Nov 23, then pick yearly on the pricing page once it ends.",
    );
    expect(maxLine(W, EN)).toMatch(
      /^Need more\? Max has at least (double|triple) every Pro limit, for \$\d+ a month\.$/,
    );
  });

  it("names Free's own allowance, and the trial when it's offered", () => {
    const free = nextStep(W, EN, { kind: "free", trialOffered: true });
    expect(free).toMatch(/^Free has \d+ line fixes a month, plus the recruiter view/);
    expect(free).toContain(
      "Try Pro: $1 for 7 days, then $15 a month. Cancel anytime before the trial ends.",
    );
  });
});

describe("the plan card's words in German", () => {
  it("writes dates and USD prices the German way", async () => {
    const { plan } = await loadMessages("de", "account");
    const de = formatFor("de");
    const spaced = (text: string | undefined) => text?.replace(/\u00a0/g, " ");
    expect(spaced(nextStep(plan, de, paid))).toBe(
      "Dein Tarif verlängert sich am 23. Nov. für 15 $ pro Monat. Du kannst bis dahin jederzeit kündigen.",
    );
    const parts = priceParts(plan, de, paid);
    expect([spaced(parts?.amount), parts?.per, parts?.note]).toEqual([
      "15 $",
      "/Monat",
      "verlängert sich am 23. Nov.",
    ]);
  });
});
