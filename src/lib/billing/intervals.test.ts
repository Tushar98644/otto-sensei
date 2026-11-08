import { afterEach, describe, expect, it, vi } from "vitest";
import { resetEnvForTests } from "@/lib/env";
import {
  billingOffer,
  offeredIntervals,
  paidProductIds,
  planForProduct,
  productId,
} from "./intervals";

function useEnv(values: Record<string, string | undefined>) {
  for (const [name, value] of Object.entries(values)) vi.stubEnv(name, value);
  resetEnvForTests();
}

// Real checkout: without these, development falls back to mock checkout, which offers everything.
const LIVE = { DODO_PAYMENTS_API_KEY: "key_test", DODO_PAYMENTS_WEBHOOK_KEY: "whsec_test" };

const NONE = {
  DODO_PAYMENTS_API_KEY: undefined,
  DODO_PAYMENTS_WEBHOOK_KEY: undefined,
  DODO_PAYMENTS_PRODUCT_ID: undefined,
  DODO_PAYMENTS_PRODUCT_ID_YEARLY: undefined,
  DODO_PAYMENTS_PRODUCT_ID_WEEKLY: "",
  DODO_PAYMENTS_MAX_PRODUCT_ID: undefined,
  DODO_PAYMENTS_MAX_PRODUCT_ID_YEARLY: undefined,
  DODO_PAYMENTS_MAX_PRODUCT_ID_WEEKLY: undefined,
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
    useEnv({ ...NONE, ...LIVE, DODO_PAYMENTS_PRODUCT_ID: "pdt_month" });
    expect(offeredIntervals("pro")).toEqual(["month"]);
    expect(offeredIntervals("max")).toEqual([]);
    expect(billingOffer()).toEqual({ pro: ["month"], max: [] });
    expect(paidProductIds()).toEqual(["pdt_month"]);
  });

  it("adds yearly and weekly in a fixed order, each with its own product", () => {
    useEnv({
      ...NONE,
      ...LIVE,
      DODO_PAYMENTS_PRODUCT_ID: "pdt_month",
      DODO_PAYMENTS_PRODUCT_ID_YEARLY: "pdt_year",
      DODO_PAYMENTS_PRODUCT_ID_WEEKLY: "pdt_week",
    });
    expect(offeredIntervals()).toEqual(["month", "year", "week"]);
    expect(productId("pro", "year")).toBe("pdt_year");
    expect(paidProductIds()).toEqual(["pdt_month", "pdt_year", "pdt_week"]);

    useEnv({ DODO_PAYMENTS_PRODUCT_ID_YEARLY: undefined });
    expect(offeredIntervals()).toEqual(["month", "week"]);
  });

  it("offers each Max option only once its product is set, and maps products to plans", () => {
    useEnv({
      ...NONE,
      ...LIVE,
      DODO_PAYMENTS_PRODUCT_ID: "pdt_pro",
      DODO_PAYMENTS_MAX_PRODUCT_ID_YEARLY: "pdt_max_year",
    });
    expect(offeredIntervals("max")).toEqual(["year"]);
    useEnv({ DODO_PAYMENTS_MAX_PRODUCT_ID: "pdt_max" });
    expect(offeredIntervals("max")).toEqual(["month", "year"]);
    expect(planForProduct("pdt_pro")).toEqual({ plan: "pro", interval: "month" });
    expect(planForProduct("pdt_max_year")).toEqual({ plan: "max", interval: "year" });
    expect(planForProduct("pdt_someone_else")).toBeNull();
    expect(planForProduct(null)).toBeNull();
    expect(paidProductIds()).toEqual(["pdt_pro", "pdt_max", "pdt_max_year"]);
  });

  it("maps every product to its plan and billing interval, so weekly ones get weekly allowances", () => {
    useEnv({
      ...NONE,
      ...LIVE,
      DODO_PAYMENTS_PRODUCT_ID: "pdt_pro_month",
      DODO_PAYMENTS_PRODUCT_ID_YEARLY: "pdt_pro_year",
      DODO_PAYMENTS_PRODUCT_ID_WEEKLY: "pdt_pro_week",
      DODO_PAYMENTS_MAX_PRODUCT_ID: "pdt_max_month",
      DODO_PAYMENTS_MAX_PRODUCT_ID_YEARLY: "pdt_max_year",
      DODO_PAYMENTS_MAX_PRODUCT_ID_WEEKLY: "pdt_max_week",
    });
    expect(
      paidProductIds().map((id) => [id, planForProduct(id)]),
    ).toEqual([
      ["pdt_pro_month", { plan: "pro", interval: "month" }],
      ["pdt_pro_year", { plan: "pro", interval: "year" }],
      ["pdt_pro_week", { plan: "pro", interval: "week" }],
      ["pdt_max_month", { plan: "max", interval: "month" }],
      ["pdt_max_year", { plan: "max", interval: "year" }],
      ["pdt_max_week", { plan: "max", interval: "week" }],
    ]);
  });
});
