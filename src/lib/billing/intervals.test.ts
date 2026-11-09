import { afterEach, describe, expect, it, vi } from "vitest";
import { resetEnvForTests } from "@/lib/env";
import {
  billingOffer,
  offeredIntervals,
  paidProductIds,
  planForProduct,
  productId,
  trialOffered,
} from "./intervals";

function useEnv(values: Record<string, string | undefined>) {
  for (const [name, value] of Object.entries(values)) vi.stubEnv(name, value);
  resetEnvForTests();
}

// Real checkout: without these, development falls back to mock checkout, which offers everything.
const LIVE = { CREEM_API_KEY: "key_test", CREEM_WEBHOOK_SECRET: "whsec_test" };

const NONE = {
  CREEM_API_KEY: undefined,
  CREEM_WEBHOOK_SECRET: undefined,
  CREEM_PRO_MONTHLY_PRODUCT_ID: undefined,
  CREEM_PRO_YEARLY_PRODUCT_ID: undefined,
  CREEM_PRO_WEEKLY_PRODUCT_ID: "",
  CREEM_MAX_MONTHLY_PRODUCT_ID: undefined,
  CREEM_MAX_YEARLY_PRODUCT_ID: undefined,
  CREEM_MAX_WEEKLY_PRODUCT_ID: undefined,
  CREEM_PRO_TRIAL_PRODUCT_ID: undefined,
};

afterEach(() => {
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("billing intervals", () => {
  it("in development without payment keys, offers every plan and option (mock checkout)", () => {
    useEnv(NONE);
    expect(billingOffer()).toEqual({
      pro: ["month", "year", "week"],
      max: ["month", "year", "week"],
    });
    expect(paidProductIds()).toEqual([]);
  });

  it("with real checkout, offers Pro monthly alone, and no Max, until more products are set", () => {
    useEnv({ ...NONE, ...LIVE, CREEM_PRO_MONTHLY_PRODUCT_ID: "prod_month" });
    expect(offeredIntervals("pro")).toEqual(["month"]);
    expect(offeredIntervals("max")).toEqual([]);
    expect(billingOffer()).toEqual({ pro: ["month"], max: [] });
    expect(paidProductIds()).toEqual(["prod_month"]);
  });

  it("adds yearly and weekly in a fixed order, each with its own product", () => {
    useEnv({
      ...NONE,
      ...LIVE,
      CREEM_PRO_MONTHLY_PRODUCT_ID: "prod_month",
      CREEM_PRO_YEARLY_PRODUCT_ID: "prod_year",
      CREEM_PRO_WEEKLY_PRODUCT_ID: "prod_week",
    });
    expect(offeredIntervals()).toEqual(["month", "year", "week"]);
    expect(productId("pro", "year")).toBe("prod_year");
    expect(paidProductIds()).toEqual(["prod_month", "prod_year", "prod_week"]);

    useEnv({ CREEM_PRO_YEARLY_PRODUCT_ID: undefined });
    expect(offeredIntervals()).toEqual(["month", "week"]);
  });

  it("offers each Max option only once its product is set, and maps products to plans", () => {
    useEnv({
      ...NONE,
      ...LIVE,
      CREEM_PRO_MONTHLY_PRODUCT_ID: "prod_pro",
      CREEM_MAX_YEARLY_PRODUCT_ID: "prod_max_year",
    });
    expect(offeredIntervals("max")).toEqual(["year"]);
    useEnv({ CREEM_MAX_MONTHLY_PRODUCT_ID: "prod_max" });
    expect(offeredIntervals("max")).toEqual(["month", "year"]);
    expect(planForProduct("prod_pro")).toEqual({ plan: "pro", interval: "month" });
    expect(planForProduct("prod_max_year")).toEqual({ plan: "max", interval: "year" });
    expect(planForProduct("prod_someone_else")).toBeNull();
    expect(planForProduct(null)).toBeNull();
    expect(paidProductIds()).toEqual(["prod_pro", "prod_max", "prod_max_year"]);
  });

  it("maps every product to its plan and billing interval, so weekly ones get weekly allowances", () => {
    useEnv({
      ...NONE,
      ...LIVE,
      CREEM_PRO_MONTHLY_PRODUCT_ID: "prod_pro_month",
      CREEM_PRO_YEARLY_PRODUCT_ID: "prod_pro_year",
      CREEM_PRO_WEEKLY_PRODUCT_ID: "prod_pro_week",
      CREEM_MAX_MONTHLY_PRODUCT_ID: "prod_max_month",
      CREEM_MAX_YEARLY_PRODUCT_ID: "prod_max_year",
      CREEM_MAX_WEEKLY_PRODUCT_ID: "prod_max_week",
    });
    expect(
      paidProductIds().map((id) => [id, planForProduct(id)]),
    ).toEqual([
      ["prod_pro_month", { plan: "pro", interval: "month" }],
      ["prod_pro_year", { plan: "pro", interval: "year" }],
      ["prod_pro_week", { plan: "pro", interval: "week" }],
      ["prod_max_month", { plan: "max", interval: "month" }],
      ["prod_max_year", { plan: "max", interval: "year" }],
      ["prod_max_week", { plan: "max", interval: "week" }],
    ]);
  });

  it("offers the trial only once its product is set, and maps it to Pro monthly", () => {
    useEnv({ ...NONE, ...LIVE, CREEM_PRO_MONTHLY_PRODUCT_ID: "prod_pro_month" });
    expect(trialOffered()).toBe(false);
    useEnv({ CREEM_PRO_TRIAL_PRODUCT_ID: "prod_pro_trial" });
    expect(trialOffered()).toBe(true);
    expect(planForProduct("prod_pro_trial")).toEqual({ plan: "pro", interval: "month" });
    expect(paidProductIds()).toEqual(["prod_pro_month", "prod_pro_trial"]);
    // The trial is a way into Pro monthly, not another billing option.
    expect(billingOffer()).toEqual({ pro: ["month"], max: [] });
  });

  it("offers the trial in mock checkout, with no products at all", () => {
    useEnv(NONE);
    expect(trialOffered()).toBe(true);
  });
});
