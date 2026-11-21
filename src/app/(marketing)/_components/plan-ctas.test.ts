import { describe, expect, it } from "vitest";
import { ROUTES, upgradeHref } from "@/components/site/routes";
import type { BillingInterval, PaidPlanId, PlanId } from "@/config/plans";
import { trialEndDay } from "@/lib/usage-copy";
import { closingCta, planCards, TRIAL_EMAIL_NOTE, type PlanViewer } from "./plan-ctas";

const OFFER: Record<PaidPlanId, readonly BillingInterval[]> = {
  pro: ["month", "year"],
  max: ["month", "year"],
};
const PLANS_SHOWN: readonly PlanId[] = ["free", "pro", "max"];
const TRIAL_ENDS = Date.UTC(2026, 10, 24, 12);

function cardsFor(
  viewer: PlanViewer | null,
  { trial = false, picked = "month" as BillingInterval, offer = OFFER } = {},
) {
  const result = planCards({ plans: PLANS_SHOWN, offer, picked, trial, viewer });
  const byPlan = Object.fromEntries(result.cards.map((card) => [card.plan, card]));
  return { ...result, free: byPlan.free!, pro: byPlan.pro!, max: byPlan.max! };
}

describe("plan cards for a visitor", () => {
  it("recommends Pro with the one primary button, and puts it first on phones", () => {
    const { free, pro, max, first, intervals } = cardsFor(null);
    expect(first).toBe("pro");
    expect(intervals).toEqual(["month", "year"]);
    expect(free.cta).toEqual({
      href: ROUTES.studio,
      label: "Check my resume, free",
      primary: false,
    });
    expect(free.notes).toEqual(["No card needed"]);
    expect(pro.badge).toEqual({ label: "Recommended", tone: "ink" });
    expect(pro.cta).toEqual({ href: upgradeHref("pro", "month"), label: "Get Pro", primary: true });
    expect(max.cta).toEqual({
      href: upgradeHref("max", "month"),
      label: "Get Max",
      primary: false,
    });
    expect(max.badge).toBeNull();
  });

  it("offers the trial with its price, the reminder email and its own allowance", () => {
    const { pro } = cardsFor(null, { trial: true });
    expect(pro.cta?.label).toBe("Try Pro for 3 days");
    expect(pro.notes).toEqual([
      "$1 for 3 days, then $15 a month. Cancel anytime before the trial ends.",
      TRIAL_EMAIL_NOTE,
      "10 tailored versions · 15 letters and prep · 50 line fixes during the trial",
    ]);
    expect(TRIAL_EMAIL_NOTE).toBe("We'll email you the day before it renews.");
  });

  it("drops the trial on yearly and says what a year works out to", () => {
    const { pro, max } = cardsFor(null, { trial: true, picked: "year" });
    expect(pro.interval).toBe("year");
    expect(pro.cta).toMatchObject({ href: upgradeHref("pro", "year"), label: "Get Pro" });
    expect(pro.notes).toContain("About $10 a month, instead of $180 a year paid monthly.");
    expect(max.notes).toContain("About $19.33 a month, instead of $348 a year paid monthly.");
  });

  it("says when a plan is sold monthly only", () => {
    const { max } = cardsFor(null, {
      picked: "year",
      offer: { pro: ["month", "year"], max: ["month"] },
    });
    expect(max.interval).toBe("month");
    expect(max.notes).toContain("Sold monthly only, for now.");
  });
});

describe("plan cards for a signed-in account", () => {
  it("marks a Free account's own card and keeps the upgrade buttons", () => {
    const { free, pro, max } = cardsFor({ plan: "free", interval: null }, { trial: true });
    expect(free).toMatchObject({ cta: null, badge: { label: "Your plan" }, notes: [] });
    expect(pro.cta).toEqual({
      href: upgradeHref("pro", "month"),
      label: "Try Pro for 3 days",
      primary: true,
    });
    expect(pro.badge?.label).toBe("Recommended");
    expect(max.cta?.label).toBe("Upgrade to Max");
  });

  it("never offers Pro again to someone on the Pro trial, only Max, which ends the trial", () => {
    const viewer: PlanViewer = { plan: "pro", interval: "month", trialEndsAt: TRIAL_ENDS };
    const { free, pro, max, first, intervals } = cardsFor(viewer, { trial: true });
    expect(pro.cta).toBeNull();
    expect(pro.manage).toBe(true);
    expect(pro.badge).toEqual({
      label: `Current plan · trial until ${trialEndDay(TRIAL_ENDS)}`,
      tone: "neutral",
    });
    expect(pro.notes).toEqual(["Then $15/month, unless you cancel.", TRIAL_EMAIL_NOTE]);
    expect(max.cta).toEqual({
      href: upgradeHref("max", "month"),
      label: "Start Max now",
      primary: true,
    });
    expect(max.notes[0]).toBe("Ends your Pro trial today and starts Max at $29/month.");
    expect(free).toMatchObject({ cta: null, badge: null, notes: ["Included in Pro."] });
    expect(first).toBe("pro");
    expect(intervals).toEqual(["month", "year"]);
  });

  it("tells a trial set to cancel that Pro won't start", () => {
    const { pro } = cardsFor({
      plan: "pro",
      interval: "month",
      trialEndsAt: TRIAL_ENDS,
      cancelScheduled: true,
    });
    expect(pro.notes).toEqual(["Pro won't start, so you won't pay anything more."]);
  });

  it("moves paid Pro up to Max only on the billing period it already has", () => {
    const { pro, max, intervals } = cardsFor(
      { plan: "pro", interval: "year" },
      { picked: "month" },
    );
    expect(intervals).toEqual(["year"]);
    expect(pro).toMatchObject({ interval: "year", cta: null, manage: true, notes: [] });
    expect(pro.badge?.label).toBe("Current plan");
    expect(max.interval).toBe("year");
    expect(max.cta).toEqual({
      href: upgradeHref("max", "year"),
      label: "Upgrade to Max",
      primary: true,
    });
    expect(max.badge).toBeNull();
  });

  it("offers no button when Max isn't sold on the plan's billing period", () => {
    const { max, intervals } = cardsFor(
      { plan: "pro", interval: "year" },
      { offer: { pro: ["month", "year"], max: ["month"] } },
    );
    expect(intervals).toEqual([]);
    expect(max.cta).toBeNull();
    expect(max.notes).toEqual(["Not available on your billing period yet."]);
  });

  it("shows Max its own card and no buttons at all", () => {
    const { free, pro, max, first, intervals } = cardsFor({ plan: "max", interval: "month" });
    expect(intervals).toEqual([]);
    expect(first).toBe("max");
    expect([free.cta, pro.cta, max.cta]).toEqual([null, null, null]);
    expect(max.badge?.label).toBe("Current plan");
    expect(pro.notes).toEqual(["Included in Max."]);
    expect(free.notes).toEqual(["Included in Max."]);
  });
});

describe("the closing button", () => {
  it("is the trial for visitors and Free accounts that can still start it", () => {
    expect(closingCta({ offer: OFFER, trial: true, viewer: null })).toEqual({
      href: upgradeHref("pro", "month"),
      label: "Try Pro for 3 days",
      primary: true,
    });
    expect(
      closingCta({ offer: OFFER, trial: false, viewer: { plan: "free", interval: null } }),
    ).toEqual({
      href: upgradeHref("pro", "month"),
      label: "Upgrade to Pro",
      primary: true,
    });
  });

  it("goes away on a paid plan, and when Pro isn't sold", () => {
    expect(
      closingCta({ offer: OFFER, trial: true, viewer: { plan: "pro", interval: "month" } }),
    ).toBeNull();
    expect(
      closingCta({ offer: { pro: [], max: ["month"] }, trial: true, viewer: null }),
    ).toBeNull();
  });
});
