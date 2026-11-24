import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Me } from "@/components/account/use-me";
import type { SessionUser } from "@/lib/auth/types";
import { AccountView } from "./account-view";

const mocks = vi.hoisted(() => ({
  me: null as Me | null,
  search: "",
  back: { next: null as string | null, message: null as string | null },
}));

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
vi.mock("./use-upgrade-return", () => ({
  useUpgradeReturn: (next: string | null, message: string | null) => {
    mocks.back = { next, message };
  },
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
  LazyUpgradeDialog: ({
    open,
    startAtSignIn,
    next,
  }: {
    open: boolean;
    startAtSignIn?: boolean;
    next?: string | null;
  }) =>
    open
      ? `[upgrade dialog] ${startAtSignIn ? "[at sign-in]" : "[at plans]"} [back to ${next ?? "nothing"}]`
      : null,
}));

const OFFER = { pro: ["month", "year"], max: ["month", "year"] } satisfies Me["billing"]["offer"];
const TRIAL_END = Date.UTC(2026, 10, 23, 12);

function page(
  user: Partial<SessionUser> | null,
  billing: Partial<Me["billing"]> = {},
  search = "",
) {
  mocks.search = search;
  mocks.me = {
    user: user && {
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

describe("AccountView signed out", () => {
  it("sent to start the trial, opens the dialog on its sign-in step under a page that says why", () => {
    const body = page(null, { trial: true }, "upgrade=1&plan=pro&interval=month");
    expect(body).toContain("Sign in to start your trial");
    expect(body).toContain("[upgrade dialog] [at sign-in]");
  });

  it("without a trial on offer, says the sign-in is for the upgrade", () => {
    const body = page(null, { trial: false }, "upgrade=1&plan=max&interval=year");
    expect(body).toContain("Sign in to upgrade");
    expect(body).toContain("[upgrade dialog] [at sign-in]");
  });

  it("sent to upgrade without a plan, shows the plans first", () => {
    const body = page(null, { trial: true }, "upgrade=1");
    expect(body).toContain("Sign in to start your trial");
    expect(body).toContain("[upgrade dialog] [at plans]");
  });

  it("hands the page to go back to on to the dialog, and only a page on this site", () => {
    expect(page(null, { trial: true }, "upgrade=1&plan=pro&next=%2Fstudio")).toContain(
      "[back to /studio]",
    );
    expect(
      page(null, { trial: true }, "upgrade=1&plan=pro&next=https%3A%2F%2Fevil.example"),
    ).toContain("[back to nothing]");
  });

  it("on a plain visit, is a sign-in like /login with no dialog", () => {
    const body = page(null);
    expect(body).toContain("Sign in");
    expect(body).toContain("Sign in to see your plan and what you've used this month.");
    expect(body).toContain("Continue with Google");
    expect(body).not.toContain("[upgrade dialog]");
    expect(body).not.toContain("Sign in to start your trial");
  });
});

describe("AccountView back from checkout", () => {
  it("once the plan shows, offers the dashboard when the upgrade didn't start on a page", () => {
    const body = page({ plan: "pro", planInterval: "month" }, {}, "checkout=success&plan=pro");
    expect(body).toContain("You're on Pro now.");
    expect(body).toContain("Go to your dashboard");
  });

  it("once the plan shows, links back to the page the upgrade started on", () => {
    const body = page(
      { plan: "pro", planInterval: "month" },
      {},
      "checkout=success&plan=pro&next=%2Fdashboard%2Fjobs",
    );
    expect(body).toContain("Pick up where you left off");
    expect(body).not.toContain("Go to your dashboard");
  });

  it("while the plan is still on its way, waits on Account instead of going back", () => {
    const body = page({ plan: "free" }, {}, "checkout=success&plan=pro&next=%2Fstudio");
    expect(body).toContain("Finishing your upgrade");
    expect(body).not.toContain("Pick up where you left off");
    expect(mocks.back).toEqual({ next: "/studio", message: null });
  });

  it("once the plan shows, goes back to the page the upgrade started on and says so", () => {
    page({ plan: "pro", planInterval: "month" }, {}, "checkout=success&plan=pro&next=%2Fstudio");
    expect(mocks.back).toEqual({
      next: "/studio",
      message: "You're on Pro. Let's pick up where you left off.",
    });
    page({ plan: "max", planInterval: "year" }, {}, "checkout=success&plan=max&next=%2Fstudio");
    expect(mocks.back.message).toBe("You're on Max. Let's pick up where you left off.");
  });

  it("counts a bigger plan than the one bought as arrived, and a smaller one as not yet", () => {
    page({ plan: "max", planInterval: "month" }, {}, "checkout=success&plan=pro&next=%2Fstudio");
    expect(mocks.back.message).toBe("You're on Max. Let's pick up where you left off.");
    page({ plan: "pro", planInterval: "month" }, {}, "checkout=success&plan=max&next=%2Fstudio");
    expect(mocks.back.message).toBeNull();
  });

  it("never goes back to a page off this site", () => {
    page(
      { plan: "pro", planInterval: "month" },
      {},
      "checkout=success&plan=pro&next=https%3A%2F%2Fevil.example",
    );
    expect(mocks.back.next).toBeNull();
  });
});

describe("AccountView sent to upgrade", () => {
  it("signed in on a plan already, goes straight back to the page and says so", () => {
    page({ plan: "pro", planInterval: "month" }, {}, "upgrade=1&plan=pro&next=%2Fdashboard%2Fjobs");
    expect(mocks.back).toEqual({ next: "/dashboard/jobs", message: "You're already on Pro." });
  });

  it("with a bigger plan to buy, stays to confirm it on a priced card", () => {
    const body = page(
      { plan: "pro", planInterval: "month", trialEndsAt: TRIAL_END },
      {},
      "upgrade=1&plan=max&next=%2Fstudio",
    );
    expect(body).toContain("[upgrade dialog] [at plans] [back to /studio]");
    expect(mocks.back.message).toBeNull();
  });

  it("signed out, waits for the sign-in before going anywhere", () => {
    page(null, { trial: true }, "upgrade=1&plan=pro&next=%2Fstudio");
    expect(mocks.back).toEqual({ next: "/studio", message: null });
  });
});

describe("AccountView plan section", () => {
  it("on hold after a failed payment, says why with Update card, and no plan change", () => {
    const body = page({ plan: "free" }, { paymentIssue: true });
    expect(body).toContain("Payment failed");
    expect(body).toContain(
      "Your last payment didn't go through You're on Free for now. Update your card to get your plan back.",
    );
    expect(body).toContain("Update card");
    expect(body).not.toContain("Change plan");
    expect(body).not.toContain("Upgrade to");
    expect(body).not.toContain("Try Pro");
  });

  it("on plain Free, offers the upgrade and no card or cancel", () => {
    const body = page({ plan: "free" });
    expect(body).toContain("Current plan");
    expect(body).toContain("Upgrade to Pro");
    expect(body).toContain("Compare plans");
    expect(body).not.toContain("Update card");
    expect(body).not.toContain("Cancel");
  });

  it("on Free with the trial on offer, starts it from the plan card", () => {
    const body = page({ plan: "free" }, { trial: true });
    expect(body).toContain("Try Pro for $1");
    expect(body).not.toContain("Upgrade to Pro");
  });

  it("on a Pro trial set to end, offers to resume it and promises no charge", () => {
    const body = page(
      { plan: "pro", planInterval: "month", trialEndsAt: TRIAL_END },
      { cancelScheduled: true },
    );
    expect(body).toContain("Ends Nov 23");
    expect(body).toContain(
      "Your trial ends on Nov 23 and Pro won't start, so you won't pay anything more.",
    );
    expect(body).toContain("Resume trial");
    expect(body).not.toMatch(/Cancel trial|Change plan|Pay yearly instead|Need more\?/);
  });

  it("on a Pro trial that will convert, says what it costs after and how to stop it", () => {
    const body = page({ plan: "pro", planInterval: "month", trialEndsAt: TRIAL_END });
    expect(body).toContain("Trial");
    expect(body).toContain("$15 /month from Nov 23");
    expect(body).toContain(
      "You paid $1 for the trial. On Nov 23 Pro starts at $15 a month. We remind you the day before.",
    );
    expect(body).toContain("Change plan");
    expect(body).toContain("Cancel trial");
    expect(body).toContain("Pay yearly instead: $144 a year");
    expect(body).toContain("Need more? Max has at least double every Pro limit, for $29 a month.");
    expect(body).toContain("Billed by Dodo Payments, our merchant of record.");
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
