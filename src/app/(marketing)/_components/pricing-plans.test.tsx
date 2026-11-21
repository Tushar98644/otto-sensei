import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Me } from "@/components/account/use-me";
import { SHOW_REFERENCE_PRICES } from "@/config/plans";
import { PricingPlans } from "./pricing-plans";

const account = vi.hoisted(() => ({ me: null as Me | null }));

vi.mock("@/components/account/use-me", () => ({
  useMe: () => ({
    me: account.me,
    user: account.me?.user ?? null,
    loading: false,
    refresh: async () => {},
  }),
}));

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ");

const OFFER = { pro: ["month", "year"], max: ["month", "year"] } as const;

function signedIn(user: Partial<NonNullable<Me["user"]>>, trial = false): Me {
  return {
    user: {
      id: "user-1",
      email: "sam@example.com",
      plan: "free",
      planInterval: null,
      planRenewsAt: null,
      ...user,
    },
    usage: null,
    period: null,
    billing: { mode: "mock", offer: { pro: ["month", "year"], max: ["month", "year"] }, trial },
    auth: { mode: "dev" },
  };
}

afterEach(() => {
  account.me = null;
});

describe("PricingPlans", () => {
  it("shows monthly prices (struck-through references only when switched on) and no price comparisons", () => {
    const html = text(renderToStaticMarkup(<PricingPlans offer={OFFER} />));
    if (SHOW_REFERENCE_PRICES) {
      expect(html).toContain("Reference price $30 $15 /month");
      expect(html).toContain("50% off");
      expect(html).toContain("Reference price $60 $29 /month");
      expect(html).toContain("52% off");
    } else {
      expect(html).not.toContain("Reference price");
      expect(html).not.toMatch(/\d+% off/);
      expect(html).toContain("$15 /month");
      expect(html).toContain("$29 /month");
    }
    expect(html).not.toMatch(/Rezi|pizza|Most popular/);
    expect(html.match(/Recommended/g)).toHaveLength(1);
    expect(html).toContain("1 resume · 3 line fixes a month from Otto");
    expect(html).toContain("Classic or Compact");
    expect(html).toContain("Monthly");
    expect(html).toContain("Yearly");
    expect(html).not.toMatch(/weekly|\/week/i);
  });

  it("puts Pro first for phones, and gives desktop the plan order back", () => {
    const html = renderToStaticMarkup(<PricingPlans offer={OFFER} headingAs="h2" />);
    const order = [...html.matchAll(/<h2[^>]*>(Free|Pro|Max)<\/h2>/g)].map((match) => match[1]);
    expect(order).toEqual(["Pro", "Free", "Max"]);
    expect(html).toContain("lg:order-1");
    expect(html).toContain("lg:order-2");
  });

  it("promises the reminder email and shows the trial's allowance under the trial button", () => {
    const html = text(renderToStaticMarkup(<PricingPlans offer={OFFER} trial />));
    expect(html).toContain("Try Pro for 3 days");
    expect(html).toContain("We'll email you the day before it renews.");
    expect(html).toContain(
      "10 tailored versions · 15 letters and prep · 50 line fixes during the trial",
    );
  });

  it("shows someone on the Pro trial their plan, and only Max to buy", () => {
    account.me = signedIn({
      plan: "pro",
      planInterval: "month",
      trialEndsAt: Date.UTC(2026, 10, 24, 12),
    });
    const html = text(renderToStaticMarkup(<PricingPlans offer={OFFER} trial />));
    expect(html).toMatch(/Current plan · trial until Nov 2[45]/);
    expect(html).toContain("Manage your plan");
    expect(html).not.toMatch(/Get Pro|Try Pro|Upgrade to Pro|Recommended/);
    expect(html).toContain("Start Max now");
    expect(html).toContain("Included in Pro.");
  });

  it("marks a Free account's card as theirs, without a button", () => {
    account.me = signedIn({ plan: "free" }, true);
    const html = text(renderToStaticMarkup(<PricingPlans offer={OFFER} />));
    expect(html).toContain("Your plan");
    expect(html).not.toContain("Check my resume, free");
    expect(html).toContain("Try Pro for 3 days");
    expect(html).toContain("Upgrade to Max");
  });
});
