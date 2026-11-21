import { describe, expect, it } from "vitest";
import { PRICES_USD, PRO_TRIAL } from "@/config/plans";
import {
  PAYMENT_ISSUE_NOTICE,
  resumeFirstNotice,
  trialUpgradeButton,
  trialUpgradeCharge,
  trialUpgradeNotice,
} from "./trial-upgrade";

const usd = (amount: number) => `$${amount}`;

describe("trial to Max copy", () => {
  it("says the full price is charged now to the card on file, with the trial fee not taken off", () => {
    expect(trialUpgradeCharge("max", "month")).toBe(
      `You pay ${usd(PRICES_USD.max.month)} (plus any tax) right away, charged to your card on file. The ${usd(PRO_TRIAL.priceUsd)} trial charge isn't taken off.`,
    );
    expect(trialUpgradeCharge("max", "year")).toContain(
      `You pay ${usd(PRICES_USD.max.year)} (plus any tax) right away`,
    );
  });

  it("says Max starts now and the trial ends, before the charge", () => {
    expect(trialUpgradeNotice("max", "month")).toBe(
      `Max starts now and your Pro trial ends. ${trialUpgradeCharge("max", "month")}`,
    );
  });

  it("puts the amount on the button", () => {
    expect(trialUpgradeButton("max", "month")).toBe(
      `Pay ${usd(PRICES_USD.max.month)} and start Max`,
    );
    expect(trialUpgradeButton("max", "year")).toBe(`Pay ${usd(PRICES_USD.max.year)} and start Max`);
  });

  it("never promises money back or calls the trial free", () => {
    for (const line of [trialUpgradeCharge("max", "month"), trialUpgradeNotice("max", "year")]) {
      expect(line).not.toMatch(/refund|credit|free|difference/i);
    }
  });
});

describe("copy when the plan can't change in place", () => {
  it("asks to resume a trial or plan that's set to end, in Manage billing", () => {
    expect(resumeFirstNotice("max", true)).toBe(
      "Your trial is set to end. Resume it in Manage billing, then start Max.",
    );
    expect(resumeFirstNotice("max", false)).toBe(
      "Your plan is set to end. Resume it in Manage billing to change plans.",
    );
  });

  it("never promises a charge or a refund", () => {
    for (const line of [
      PAYMENT_ISSUE_NOTICE,
      resumeFirstNotice("max", true),
      resumeFirstNotice("max", false),
    ]) {
      expect(line).toContain("Manage billing");
      expect(line).not.toMatch(/\$|pay |charge|refund|right away/i);
    }
  });
});
