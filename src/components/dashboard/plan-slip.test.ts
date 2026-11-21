import { describe, expect, it } from "vitest";
import { offerLabel, planSlip } from "./plan-slip";

const NOW = Date.UTC(2026, 10, 21, 12);
const DAY = 24 * 60 * 60 * 1000;
const ON_SALE = { offer: { pro: ["month"] } };

describe("planSlip", () => {
  it("offers the $1 trial on Free, and the upgrade once the trial is used", () => {
    expect(planSlip({ plan: "free" }, { ...ON_SALE, trial: true }, NOW)).toEqual({
      kind: "offer",
      label: "Try Pro for $1",
    });
    expect(planSlip({ plan: "free" }, { ...ON_SALE, trial: false }, NOW)).toEqual({
      kind: "offer",
      label: "Upgrade to Pro",
    });
  });

  it("counts the trial's days left, rounding a part day up", () => {
    const trial = (left: number) =>
      planSlip({ plan: "pro", trialEndsAt: NOW + left }, ON_SALE, NOW)?.label;
    expect(trial(3 * DAY)).toBe("3 days left");
    expect(trial(DAY + 1)).toBe("2 days left");
    expect(trial(5 * 60 * 1000)).toBe("1 day left");
    expect(trial(-1000)).toBe("Trial ends today");
  });

  it("puts a payment problem ahead of everything else", () => {
    expect(
      planSlip({ plan: "pro", trialEndsAt: NOW + DAY }, { ...ON_SALE, paymentIssue: true }, NOW),
    ).toEqual({ kind: "payment", label: "Fix payment" });
    expect(planSlip({ plan: "free" }, { ...ON_SALE, trial: true, paymentIssue: true }, NOW)).toEqual(
      { kind: "payment", label: "Fix payment" },
    );
  });

  it("shows nothing for paid accounts in good standing, without billing, or before the plan loads", () => {
    expect(planSlip({ plan: "pro", trialEndsAt: null }, ON_SALE, NOW)).toBeNull();
    expect(planSlip({ plan: "max" }, ON_SALE, NOW)).toBeNull();
    expect(planSlip({ plan: "free" }, { offer: { pro: [] }, trial: true }, NOW)).toBeNull();
    expect(planSlip({ plan: "free" }, null, NOW)).toBeNull();
    expect(planSlip({ plan: "pro", trialEndsAt: NOW + DAY }, ON_SALE, 0)).toBeNull();
  });
});

describe("offerLabel", () => {
  it("leads with the trial price while the trial is on offer", () => {
    expect(offerLabel(true)).toBe("Try Pro for $1");
    expect(offerLabel(false)).toBe("Upgrade to Pro");
  });
});
