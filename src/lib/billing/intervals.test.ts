import { afterEach, describe, expect, it, vi } from "vitest";
import { BILLING_INTERVALS } from "@/config/plans";
import { resetEnvForTests } from "@/lib/env";
import {
  billingOffer,
  offeredIntervals,
  paidPriceIds,
  planForPrice,
  priceId,
  trialOffered,
  trialPriceId,
} from "./intervals";

function useEnv(values: Record<string, string | undefined>) {
  for (const [name, value] of Object.entries(values)) vi.stubEnv(name, value);
  resetEnvForTests();
}

const LIVE = {
  PADDLE_API_KEY: "pdl_sdbx_apikey_test",
  PADDLE_WEBHOOK_SECRET: "pdl_ntfset_test",
  NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: "test_token",
};

const NONE = {
  PADDLE_API_KEY: undefined,
  PADDLE_WEBHOOK_SECRET: undefined,
  NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: undefined,
  PADDLE_PRO_MONTHLY_PRICE_ID: undefined,
  PADDLE_PRO_YEARLY_PRICE_ID: "",
  PADDLE_MAX_MONTHLY_PRICE_ID: undefined,
  PADDLE_MAX_YEARLY_PRICE_ID: undefined,
  PADDLE_PRO_TRIAL_PRICE_ID: undefined,
};

afterEach(() => {
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("billing intervals", () => {
  it("in development without payment keys, offers every plan and option (mock checkout)", () => {
    useEnv(NONE);
    expect(billingOffer()).toEqual({ pro: [...BILLING_INTERVALS], max: [...BILLING_INTERVALS] });
    expect(paidPriceIds()).toEqual([]);
  });

  it("with real checkout, offers Pro monthly alone, and no Max, until more prices are set", () => {
    useEnv({ ...NONE, ...LIVE, PADDLE_PRO_MONTHLY_PRICE_ID: "pri_month" });
    expect(offeredIntervals("pro")).toEqual(["month"]);
    expect(offeredIntervals("max")).toEqual([]);
    expect(billingOffer()).toEqual({ pro: ["month"], max: [] });
    expect(paidPriceIds()).toEqual(["pri_month"]);
  });

  it("adds yearly once its price is set", () => {
    useEnv({
      ...NONE,
      ...LIVE,
      PADDLE_PRO_MONTHLY_PRICE_ID: "pri_month",
      PADDLE_PRO_YEARLY_PRICE_ID: "pri_year",
    });
    expect(offeredIntervals()).toEqual(["month", "year"]);
    expect(priceId("pro", "year")).toBe("pri_year");
    expect(paidPriceIds()).toEqual(["pri_month", "pri_year"]);

    useEnv({ PADDLE_PRO_YEARLY_PRICE_ID: undefined });
    expect(offeredIntervals()).toEqual(["month"]);
  });

  it("offers each Max option only once its price is set, and maps prices to plans", () => {
    useEnv({
      ...NONE,
      ...LIVE,
      PADDLE_PRO_MONTHLY_PRICE_ID: "pri_pro",
      PADDLE_MAX_YEARLY_PRICE_ID: "pri_max_year",
    });
    expect(offeredIntervals("max")).toEqual(["year"]);
    useEnv({ PADDLE_MAX_MONTHLY_PRICE_ID: "pri_max" });
    expect(offeredIntervals("max")).toEqual(["month", "year"]);
    expect(planForPrice("pri_pro")).toEqual({ plan: "pro", interval: "month" });
    expect(planForPrice("pri_max_year")).toEqual({ plan: "max", interval: "year" });
    expect(planForPrice("pri_someone_else")).toBeNull();
    expect(planForPrice(null)).toBeNull();
    expect(planForPrice("")).toBeNull();
    expect(paidPriceIds()).toEqual(["pri_pro", "pri_max", "pri_max_year"]);
  });

  it("maps every price to exactly one plan and billing interval", () => {
    useEnv({
      ...NONE,
      ...LIVE,
      PADDLE_PRO_MONTHLY_PRICE_ID: "pri_pro_month",
      PADDLE_PRO_YEARLY_PRICE_ID: "pri_pro_year",
      PADDLE_MAX_MONTHLY_PRICE_ID: "pri_max_month",
      PADDLE_MAX_YEARLY_PRICE_ID: "pri_max_year",
    });
    expect(paidPriceIds().map((id) => [id, planForPrice(id)])).toEqual([
      ["pri_pro_month", { plan: "pro", interval: "month" }],
      ["pri_pro_year", { plan: "pro", interval: "year" }],
      ["pri_max_month", { plan: "max", interval: "month" }],
      ["pri_max_year", { plan: "max", interval: "year" }],
    ]);
  });

  it("offers the trial only once its price is set, and maps it to Pro monthly", () => {
    useEnv({ ...NONE, ...LIVE, PADDLE_PRO_MONTHLY_PRICE_ID: "pri_pro_month" });
    expect(trialOffered()).toBe(false);
    useEnv({ PADDLE_PRO_TRIAL_PRICE_ID: "pri_pro_trial" });
    expect(trialOffered()).toBe(true);
    expect(trialPriceId()).toBe("pri_pro_trial");
    expect(planForPrice("pri_pro_trial")).toEqual({ plan: "pro", interval: "month" });
    expect(paidPriceIds()).toEqual(["pri_pro_month", "pri_pro_trial"]);
    expect(billingOffer()).toEqual({ pro: ["month"], max: [] });
  });

  it("offers no trial while payments are switched off in production", () => {
    useEnv({ ...NONE, NODE_ENV: "production", PADDLE_PRO_TRIAL_PRICE_ID: "pri_pro_trial" });
    expect(trialOffered()).toBe(false);
  });

  it("offers the trial in mock checkout, with no prices at all", () => {
    useEnv(NONE);
    expect(trialOffered()).toBe(true);
  });
});
