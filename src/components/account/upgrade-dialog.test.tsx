import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Feature } from "@/config/plans";
import type { SessionUser } from "@/lib/auth/types";
import { PAYMENT_ISSUE_NOTICE, trialUpgradeNotice } from "./trial-upgrade";
import { UpgradeDialog, type UpgradeDialogProps } from "./upgrade-dialog";
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
  props: Partial<UpgradeDialogProps> = {},
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
  return renderToStaticMarkup(
    <UpgradeDialog open onOpenChange={() => {}} feature={feature} {...props} />,
  )
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

  it("at Free's resume limit, offers to replace the one resume next to the trial", () => {
    const replace = { title: "Ada CV", onReplace: () => {} };
    const body = dialog({ plan: "free" }, { trial: true }, undefined, { tool: "resumes", replace });
    expect(body).toContain("Free keeps 1 resume.");
    expect(body).toContain("Or replace “Ada CV” with the new one.");
    expect(body).toContain("Recently deleted for 30 days, in this browser only.");
    expect(body).toContain("Replace it");

    expect(dialog({ plan: "free" }, {}, undefined, { tool: "resumes" })).not.toContain("Replace it");
    expect(dialog(ON_TRIAL, {}, undefined, { tool: "resumes", replace })).not.toContain("Replace it");
  });

  it("on hold at Free's resume limit, still offers the replacement beside Manage billing", () => {
    const replace = { title: "Ada CV", onReplace: () => {} };
    const body = dialog({ plan: "free" }, { paymentIssue: true }, undefined, { tool: "resumes", replace });
    expect(body).toContain("Manage billing");
    expect(body).toContain("Replace it");
  });
});

function signedOutDialog({ startAtSignIn = false, trial = true } = {}) {
  mocks.me = {
    user: null,
    usage: null,
    period: null,
    aiBudget: null,
    billing: { mode: "dodo", offer: OFFER, trial },
    auth: { mode: "supabase" },
  };
  return renderToStaticMarkup(
    <UpgradeDialog
      open
      onOpenChange={() => {}}
      plan="pro"
      interval="month"
      next="/studio"
      startAtSignIn={startAtSignIn}
    />,
  )
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ");
}

describe("UpgradeDialog signed out", () => {
  it("sent with a plan, opens straight on sign-in for the trial", () => {
    const body = signedOutDialog({ startAtSignIn: true });
    expect(body).toContain("Sign in to start your trial");
    expect(body).toContain("Use Google or a 6-digit email code. No password.");
    expect(body).toContain("Continue with Google");
    expect(body).toContain("Back");
  });

  it("without a trial on offer, calls it signing in to upgrade", () => {
    expect(signedOutDialog({ startAtSignIn: true, trial: false })).toContain("Sign in to upgrade");
  });

  it("opened from a page, shows the plans first", () => {
    const body = signedOutDialog();
    expect(body).not.toContain("Sign in to start your trial");
    expect(body).toContain("Not now");
  });
});
