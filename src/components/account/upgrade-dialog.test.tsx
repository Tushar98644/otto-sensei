import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Feature } from "@/config/plans";
import type { SessionUser } from "@/lib/auth/types";
import { PAYMENT_ISSUE_NOTICE, trialUpgradeNotice } from "./trial-upgrade";
import { UpgradeDialog } from "./upgrade-dialog";
import type { Me } from "./use-me";

const mocks = vi.hoisted(() => ({ me: null as Me | null }));

vi.mock("./use-me", () => ({
  useMe: () => ({ me: mocks.me, user: mocks.me?.user ?? null, loading: false }),
  refreshMe: async () => {},
}));

const OFFER = { pro: ["month", "year"], max: ["month", "year"] } satisfies Me["billing"]["offer"];
const TRIAL_END = Date.UTC(2026, 10, 23, 12);
const ON_TRIAL = { plan: "pro", planInterval: "month", trialEndsAt: TRIAL_END } as const;

function dialog(
  user: Partial<SessionUser>,
  billing: Partial<Me["billing"]> = {},
  feature?: Feature,
) {
  mocks.me = {
    user: {
      id: "ada",
      email: "ada@example.com",
      plan: "free",
      planInterval: null,
      planRenewsAt: null,
      ...user,
    },
    usage: null,
    period: null,
    aiBudget: null,
    billing: { mode: "dodo", offer: OFFER, trial: false, ...billing },
    auth: { mode: "supabase" },
  };
  return renderToStaticMarkup(<UpgradeDialog open onOpenChange={() => {}} feature={feature} />)
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ");
}

describe("UpgradeDialog", () => {
  it("on the Pro trial, says Max starts now for the full price", () => {
    const body = dialog(ON_TRIAL);
    expect(body).toContain(trialUpgradeNotice("max", "month"));
    expect(body).toContain("Start Max now");
  });

  it("on a Pro trial set to end, asks to resume it in Manage billing and charges nothing", () => {
    const body = dialog(ON_TRIAL, { cancelScheduled: true });
    expect(body).toContain("Upgrade to Max");
    expect(body).toContain(
      "Your trial is set to end. Resume it in Manage billing, then start Max.",
    );
    expect(body).toContain("Manage billing");
    expect(body).not.toMatch(/Start Max now|right away|card on file|Pay \$/);
  });

  it("on a paid plan set to end, asks to resume it before changing plans", () => {
    const body = dialog({ plan: "pro", planInterval: "month" }, { cancelScheduled: true });
    expect(body).toContain("Your plan is set to end. Resume it in Manage billing to change plans.");
    expect(body).toContain("Manage billing");
    expect(body).not.toContain("you pay only the difference");
  });

  it("on hold after a failed payment, points to Manage billing instead of selling a plan", () => {
    const body = dialog({ plan: "free" }, { paymentIssue: true });
    expect(body).toContain("Update your card");
    expect(body).toContain(PAYMENT_ISSUE_NOTICE);
    expect(body).toContain("Manage billing");
    expect(body).not.toMatch(/Upgrade to|Choose your plan/);
  });

  it("on hold at a limit, keeps the limit and still says why", () => {
    const body = dialog({ plan: "free" }, { paymentIssue: true }, "tailor");
    expect(body).toContain(PAYMENT_ISSUE_NOTICE);
    expect(body).toContain("Manage billing");
    expect(body).not.toContain("Upgrade to");
  });
});
