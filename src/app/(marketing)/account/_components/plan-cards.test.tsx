import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  PAYMENT_ISSUE_NOTICE,
  trialUpgradeButton,
  trialUpgradeCharge,
} from "@/components/account/trial-upgrade";
import { PRICES_USD, type PlanId } from "@/config/plans";
import { endsTrialSentence } from "@/lib/billing/prices";
import { BillingCard, UpgradeCard } from "./plan-cards";
import { UpgradeStatus } from "./upgrade-status";

const mocks = vi.hoisted(() => ({
  user: null as { plan: PlanId; trialEndsAt: number | null } | null,
}));

vi.mock("@/components/account/use-me", () => ({
  useMe: () => ({ user: mocks.user, me: null, loading: false }),
  refreshMe: async () => {},
}));

const ALL = { pro: ["month", "year"], max: ["month", "year"] } as const;
const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ");

function card(plan: PlanId, trialEndsAt: number | null, cancelScheduled = false) {
  mocks.user = { plan, trialEndsAt };
  return text(
    renderToStaticMarkup(
      <UpgradeCard
        plan={plan}
        interval="month"
        mode="dodo"
        offer={{ pro: [...ALL.pro], max: [...ALL.max] }}
        cancelScheduled={cancelScheduled}
      />,
    ),
  );
}

const TRIAL_END = Date.UTC(2026, 10, 23, 12);

describe("UpgradeCard", () => {
  it("on the Pro trial, names the full charge to the card on file and the amount on the button", () => {
    const body = card("pro", TRIAL_END);
    expect(body).toContain(
      `${endsTrialSentence("max", "month")} ${trialUpgradeCharge("max", "month")}`,
    );
    expect(body).toContain(trialUpgradeButton("max", "month"));
    expect(body).toContain(`Pay $${PRICES_USD.max.month} and start Max`);
    expect(body).not.toContain("Start Max now");
  });

  it("on paid Pro, keeps the in-place upgrade copy", () => {
    const body = card("pro", null);
    expect(body).toContain("Your subscription changes in place.");
    expect(body).toContain("Upgrade to Max");
    expect(body).not.toContain("card on file");
  });

  it("on a Pro trial set to end, asks to resume it in Manage billing instead of promising a charge", () => {
    const body = card("pro", TRIAL_END, true);
    expect(body).toContain(
      "Your trial is set to end. Resume it in Manage billing, then start Max.",
    );
    expect(body).toContain("Manage billing");
    expect(body).not.toContain(trialUpgradeButton("max", "month"));
    expect(body).not.toMatch(/right away|card on file|Pay \$/);
  });

  it("on a paid plan set to end, asks to resume it before changing plans", () => {
    const body = card("pro", null, true);
    expect(body).toContain("Your plan is set to end. Resume it in Manage billing to change plans.");
    expect(body).toContain("Manage billing");
    expect(body).not.toContain("Upgrade to Max");
    expect(body).not.toContain("changes in place");
  });

  it("ignores a scheduled cancel on Free, where there's no plan to resume", () => {
    const body = card("free", null, true);
    expect(body).toContain("Upgrade to Pro");
    expect(body).not.toContain("Manage billing");
  });
});

describe("BillingCard", () => {
  const billing = (props: Partial<Parameters<typeof BillingCard>[0]> = {}) =>
    text(renderToStaticMarkup(<BillingCard mode="dodo" {...props} />));

  it("after a failed payment, says the account is on Free until the card is updated in Manage billing", () => {
    const body = billing({ paymentIssue: true });
    expect(body).toContain(PAYMENT_ISSUE_NOTICE);
    expect(body).toContain("Manage billing");
  });

  it("on a trial set to end, says when it ends instead of asking to cancel", () => {
    const body = billing({ trialEndsAt: TRIAL_END, cancelScheduled: true });
    expect(body).toContain("Your trial ends on");
    expect(body).toContain("Pro won't start");
    expect(body).not.toContain("Cancel before");
    expect(billing({ trialEndsAt: TRIAL_END })).toContain("Cancel before");
  });
});

describe("UpgradeStatus when the plan hasn't arrived", () => {
  const watch = { state: "gave-up", retry: () => {} } as const;

  it("on a paid plan, says a declined card leaves the plan as it was and points to Manage billing", () => {
    const body = text(
      renderToStaticMarkup(<UpgradeStatus plan="pro" target="max" watch={watch} />),
    );
    expect(body).toContain("Still showing Pro?");
    expect(body).toContain(
      "If your card was declined, you stay on Pro: update your card in Manage billing below and try again, or email",
    );
  });

  it("on Free, just asks to check again or email us", () => {
    const body = text(
      renderToStaticMarkup(<UpgradeStatus plan="free" target="pro" watch={watch} />),
    );
    expect(body).toContain(
      "Payments can take a few minutes to reach us. Check again soon, or email",
    );
    expect(body).not.toContain("Manage billing");
  });
});
