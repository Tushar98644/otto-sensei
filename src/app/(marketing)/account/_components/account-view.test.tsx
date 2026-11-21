import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PAYMENT_ISSUE_NOTICE } from "@/components/account/trial-upgrade";
import type { Me } from "@/components/account/use-me";
import type { SessionUser } from "@/lib/auth/types";
import { AccountView } from "./account-view";

const mocks = vi.hoisted(() => ({ me: null as Me | null, search: "" }));

vi.mock("@/components/account/use-me", () => ({
  useMe: () => ({
    me: mocks.me,
    user: mocks.me?.user ?? null,
    loading: false,
    refresh: async () => {},
  }),
  refreshMe: async () => {},
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.search),
  usePathname: () => "/account",
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
}));
vi.mock("@/components/eligibility/work-profile-card", () => ({ WorkProfileCard: () => null }));
vi.mock("@/components/setup/looking-for-settings-card", () => ({
  LookingForSettingsCard: () => null,
}));
vi.mock("@/components/notifications/reminder-settings-card", () => ({
  ReminderSettingsCard: () => null,
}));
vi.mock("@/components/referrals/invite-card", () => ({ InviteCard: () => null }));
vi.mock("@/components/settings/writing-style-card", () => ({ WritingStyleCard: () => null }));
vi.mock("@/components/account/lazy-dialogs", () => ({
  LazyUpgradeDialog: ({ open }: { open: boolean }) => (open ? "[upgrade dialog]" : null),
}));

const OFFER = { pro: ["month", "year"], max: ["month", "year"] } satisfies Me["billing"]["offer"];
const TRIAL_END = Date.UTC(2026, 10, 23, 12);

function page(user: Partial<SessionUser>, billing: Partial<Me["billing"]> = {}, search = "") {
  mocks.search = search;
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
  return renderToStaticMarkup(<AccountView />)
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ");
}

describe("AccountView plan section", () => {
  it("on hold after a failed payment, shows Manage billing with why, and no upgrade offer", () => {
    const body = page({ plan: "free" }, { paymentIssue: true });
    expect(body).toContain(PAYMENT_ISSUE_NOTICE);
    expect(body).toContain("Manage billing");
    expect(body).toContain("Plan and billing");
    expect(body).not.toContain("Upgrade to");
    expect(body).not.toContain("Go Pro");
  });

  it("on plain Free, offers the upgrade and no Manage billing", () => {
    const body = page({ plan: "free" });
    expect(body).toContain("Upgrade to Pro");
    expect(body).not.toContain("Manage billing");
    expect(body).not.toContain(PAYMENT_ISSUE_NOTICE);
  });

  it("on a Pro trial set to end, points both cards to Manage billing and promises no charge", () => {
    const body = page(
      { plan: "pro", planInterval: "month", trialEndsAt: TRIAL_END },
      { cancelScheduled: true },
    );
    expect(body).toContain(
      "Your trial is set to end. Resume it in Manage billing, then start Max.",
    );
    expect(body).toContain("Your trial ends on");
    expect(body).toContain("It's set to end then, and you won't be charged again.");
    expect(body).toContain("and your account moves to Free then.");
    expect(body).not.toMatch(/Pay \$|right away|Start Max now/);
    expect(body).not.toMatch(/unless you cancel before|full Pro allowance starts/);
  });

  it("on a Pro trial that will convert, says what it costs after", () => {
    const body = page({ plan: "pro", planInterval: "month", trialEndsAt: TRIAL_END });
    expect(body).toContain("unless you cancel before.");
    expect(body).toContain("Then the full Pro allowance starts");
    expect(body).not.toContain("you won't be charged again");
  });

  it("sent to upgrade while the plan can't change, opens the dialog instead of going to checkout", () => {
    const arrival = "upgrade=1&plan=max&interval=month";
    const trial = { plan: "pro", planInterval: "month", trialEndsAt: TRIAL_END } as const;
    expect(page(trial, { cancelScheduled: true }, arrival)).toContain("[upgrade dialog]");
    expect(page({ plan: "free" }, { paymentIssue: true }, arrival)).toContain("[upgrade dialog]");
  });

  it("sent to upgrade by a link, charges no saved card: a trial or paid plan gets the dialog, only Free goes to checkout", () => {
    const arrival = "upgrade=1&plan=max&interval=year";
    const trial = { plan: "pro", planInterval: "month", trialEndsAt: TRIAL_END } as const;
    expect(page(trial, {}, arrival)).toContain("[upgrade dialog]");
    expect(page({ plan: "pro", planInterval: "month" }, {}, arrival)).toContain("[upgrade dialog]");
    expect(page({ plan: "free" }, {}, arrival)).not.toContain("[upgrade dialog]");
  });
});
