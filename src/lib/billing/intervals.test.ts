import { afterEach, describe, expect, it, vi } from "vitest";
import { BILLING_INTERVALS } from "@/config/plans";
import { resetEnvForTests } from "@/lib/env";
import {
  billingOffer,
  offeredIntervals,
  paidProductIds,
  planForProduct,
  productId,
  trialOffered,
  trialProductId,
} from "./intervals";

function useEnv(values: Record<string, string | undefined>) {
  for (const [name, value] of Object.entries(values)) vi.stubEnv(name, value);
  resetEnvForTests();
}

const LIVE = {
  DODO_API_KEY: "dodo_test_apikey",
  DODO_WEBHOOK_SECRET: "whsec_dGVzdA==",
  BILLING_SIGNING_SECRET: "billing_signing_secret_for_tests",
};

const NONE = {
  DODO_API_KEY: undefined,
  DODO_WEBHOOK_SECRET: undefined,
  DODO_ENVIRONMENT: undefined,
  BILLING_SIGNING_SECRET: undefined,
  DODO_PRO_MONTHLY_PRODUCT_ID: undefined,
  DODO_PRO_YEARLY_PRODUCT_ID: "",
  DODO_MAX_MONTHLY_PRODUCT_ID: undefined,
  DODO_MAX_YEARLY_PRODUCT_ID: undefined,
  DODO_PRO_TRIAL_PRODUCT_ID: undefined,
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("billing intervals", () => {
  it("in development without payment keys, offers every plan and option (mock checkout)", () => {
    useEnv(NONE);
    expect(billingOffer()).toEqual({ pro: [...BILLING_INTERVALS], max: [...BILLING_INTERVALS] });
    expect(paidProductIds()).toEqual([]);
  });

  it("with real checkout, offers Pro monthly alone, and no Max, until more products are set", () => {
    useEnv({ ...NONE, ...LIVE, DODO_PRO_MONTHLY_PRODUCT_ID: "pdt_month" });
    expect(offeredIntervals("pro")).toEqual(["month"]);
    expect(offeredIntervals("max")).toEqual([]);
    expect(billingOffer()).toEqual({ pro: ["month"], max: [] });
    expect(paidProductIds()).toEqual(["pdt_month"]);
  });

  it("adds yearly once its product is set", () => {
    useEnv({
      ...NONE,
      ...LIVE,
      DODO_PRO_MONTHLY_PRODUCT_ID: "pdt_month",
      DODO_PRO_YEARLY_PRODUCT_ID: "pdt_year",
    });
    expect(offeredIntervals()).toEqual(["month", "year"]);
    expect(productId("pro", "year")).toBe("pdt_year");
    expect(paidProductIds()).toEqual(["pdt_month", "pdt_year"]);

    useEnv({ DODO_PRO_YEARLY_PRODUCT_ID: undefined });
    expect(offeredIntervals()).toEqual(["month"]);
  });

  it("offers each Max option only once its product is set, and maps products to plans", () => {
    useEnv({
      ...NONE,
      ...LIVE,
      DODO_PRO_MONTHLY_PRODUCT_ID: "pdt_pro",
      DODO_MAX_YEARLY_PRODUCT_ID: "pdt_max_year",
    });
    expect(offeredIntervals("max")).toEqual(["year"]);
    useEnv({ DODO_MAX_MONTHLY_PRODUCT_ID: "pdt_max" });
    expect(offeredIntervals("max")).toEqual(["month", "year"]);
    expect(planForProduct("pdt_pro")).toEqual({ plan: "pro", interval: "month" });
    expect(planForProduct("pdt_max_year")).toEqual({ plan: "max", interval: "year" });
    expect(planForProduct("pdt_someone_else")).toBeNull();
    expect(planForProduct(null)).toBeNull();
    expect(planForProduct("")).toBeNull();
    expect(paidProductIds()).toEqual(["pdt_pro", "pdt_max", "pdt_max_year"]);
  });

  it("maps every product to exactly one plan and billing interval", () => {
    useEnv({
      ...NONE,
      ...LIVE,
      DODO_PRO_MONTHLY_PRODUCT_ID: "pdt_pro_month",
      DODO_PRO_YEARLY_PRODUCT_ID: "pdt_pro_year",
      DODO_MAX_MONTHLY_PRODUCT_ID: "pdt_max_month",
      DODO_MAX_YEARLY_PRODUCT_ID: "pdt_max_year",
    });
    expect(paidProductIds().map((id) => [id, planForProduct(id)])).toEqual([
      ["pdt_pro_month", { plan: "pro", interval: "month" }],
      ["pdt_pro_year", { plan: "pro", interval: "year" }],
      ["pdt_max_month", { plan: "max", interval: "month" }],
      ["pdt_max_year", { plan: "max", interval: "year" }],
    ]);
  });

  it("offers the trial only once its product is set, and maps it to Pro monthly", () => {
    useEnv({ ...NONE, ...LIVE, DODO_PRO_MONTHLY_PRODUCT_ID: "pdt_pro_month" });
    expect(trialOffered()).toBe(false);
    useEnv({ DODO_PRO_TRIAL_PRODUCT_ID: "pdt_pro_trial" });
    expect(trialOffered()).toBe(true);
    expect(trialProductId()).toBe("pdt_pro_trial");
    expect(planForProduct("pdt_pro_trial")).toEqual({ plan: "pro", interval: "month" });
    expect(paidProductIds()).toEqual(["pdt_pro_month", "pdt_pro_trial"]);
    expect(billingOffer()).toEqual({ pro: ["month"], max: [] });
  });

  it("offers no trial while payments are switched off in production", () => {
    useEnv({ ...NONE, NODE_ENV: "production", DODO_PRO_TRIAL_PRODUCT_ID: "pdt_pro_trial" });
    expect(trialOffered()).toBe(false);
  });

  it("offers no trial, and only Pro monthly, when the key belongs to the other Dodo mode in production", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    useEnv({
      ...NONE,
      ...LIVE,
      NODE_ENV: "production",
      DODO_ENVIRONMENT: "live",
      DODO_PRO_MONTHLY_PRODUCT_ID: "pdt_pro_month",
      DODO_MAX_MONTHLY_PRODUCT_ID: "pdt_max_month",
      DODO_PRO_TRIAL_PRODUCT_ID: "pdt_pro_trial",
    });
    expect(trialOffered()).toBe(false);
    expect(billingOffer()).toEqual({ pro: ["month"], max: ["month"] });
  });

  it("offers the trial in mock checkout, with no products at all", () => {
    useEnv(NONE);
    expect(trialOffered()).toBe(true);
  });
});
