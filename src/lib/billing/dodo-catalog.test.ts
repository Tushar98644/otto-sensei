import { afterEach, describe, expect, it, vi } from "vitest";
import { PRICES_USD, PRO_TRIAL, type BillingInterval, type PaidPlanId } from "@/config/plans";
import { resetEnvForTests } from "@/lib/env";
import {
  DEFAULT_APP_URL,
  DODO_WEBHOOK_EVENTS,
  PRODUCT_SLOTS,
  canReadCatalog,
  catalogConfig,
  endpointsFor,
  keyEnvironment,
  listDodoProducts,
  listDodoWebhooks,
  productProblems,
  productSpec,
  readDodoProduct,
  readWebhookSecret,
  runCatalogCheck,
  slotTagged,
  topupProblems,
  topupSpec,
  topupTagged,
  validateCatalog,
  webhookUrl,
  type CatalogConfig,
  type CatalogReads,
  type DodoProduct,
  type ProductLookup,
  type ProductSlot,
  type ProductVariable,
  type WebhookEndpoint,
} from "./dodo-catalog";

const dodoId = (prefix: string, name: string) => `${prefix}_${name.padEnd(21, "0")}`;

const IDS = {
  DODO_PRO_MONTHLY_PRODUCT_ID: dodoId("pdt", "ProMonthly"),
  DODO_PRO_TRIAL_PRODUCT_ID: dodoId("pdt", "ProTrial"),
  DODO_PRO_YEARLY_PRODUCT_ID: dodoId("pdt", "ProYearly"),
  DODO_MAX_MONTHLY_PRODUCT_ID: dodoId("pdt", "MaxMonthly"),
  DODO_MAX_YEARLY_PRODUCT_ID: dodoId("pdt", "MaxYearly"),
} satisfies Record<ProductVariable, string>;
type Variable = keyof typeof IDS;

const APP = "https://www.ottosensei.com";
const HOOK = `${APP}/api/billing/webhook`;
const ENDPOINT_ID = "whk_YdWqVEGKmSYKbsIyDxEab";
const API_KEY = "dodo_test_KEYSECRETvalue";
const WEBHOOK_SECRET = "whsec_V0hTRUNSRVRWQUxVRQ==";
const SIGNING_SECRET = "SIGNINGSECRET".padEnd(64, "0");

const cents = (usd: number) => Math.round(usd * 100);
const dollars = (usd: number) => `USD ${usd.toFixed(2)}`;
const TRIAL_AMOUNT = cents(PRO_TRIAL.priceUsd);

function config(overrides: Partial<CatalogConfig> = {}): CatalogConfig {
  return {
    environment: "test",
    apiKey: API_KEY,
    webhookSecret: WEBHOOK_SECRET,
    signingSecret: SIGNING_SECRET,
    productIds: { ...IDS },
    appUrl: APP,
    ...overrides,
  };
}

function recurring(
  id: string,
  plan: PaidPlanId,
  interval: BillingInterval,
  name: string,
): DodoProduct {
  return {
    product_id: id,
    name,
    tax_category: "saas",
    metadata: {},
    addons: [],
    pricing_mode: null,
    price: {
      type: "recurring_price",
      currency: "USD",
      price: cents(PRICES_USD[plan][interval]),
      payment_frequency_count: 1,
      payment_frequency_interval: interval === "month" ? "Month" : "Year",
      subscription_period_count: 20,
      subscription_period_interval: "Year",
      discount: null,
      discount_bps: 0,
      purchasing_power_parity: false,
      pay_what_you_want: null,
      tax_inclusive: false,
      trial_period_days: 0,
      trial_amount: null,
      trial_payment_method_optional: null,
    },
  };
}

function goodProducts(): Record<Variable, DodoProduct> {
  const trial = recurring(
    IDS.DODO_PRO_TRIAL_PRODUCT_ID,
    "pro",
    "month",
    `Otto Sensei Pro (monthly, ${PRO_TRIAL.days}-day trial)`,
  );
  return {
    DODO_PRO_MONTHLY_PRODUCT_ID: recurring(
      IDS.DODO_PRO_MONTHLY_PRODUCT_ID,
      "pro",
      "month",
      "Otto Sensei Pro (monthly)",
    ),
    DODO_PRO_TRIAL_PRODUCT_ID: {
      ...trial,
      price: { ...trial.price, trial_period_days: PRO_TRIAL.days, trial_amount: TRIAL_AMOUNT },
    },
    DODO_PRO_YEARLY_PRODUCT_ID: recurring(
      IDS.DODO_PRO_YEARLY_PRODUCT_ID,
      "pro",
      "year",
      "Otto Sensei Pro (yearly)",
    ),
    DODO_MAX_MONTHLY_PRODUCT_ID: recurring(
      IDS.DODO_MAX_MONTHLY_PRODUCT_ID,
      "max",
      "month",
      "Otto Sensei Max (monthly)",
    ),
    DODO_MAX_YEARLY_PRODUCT_ID: recurring(
      IDS.DODO_MAX_YEARLY_PRODUCT_ID,
      "max",
      "year",
      "Otto Sensei Max (yearly)",
    ),
  };
}

function endpoint(overrides: Partial<WebhookEndpoint> = {}): WebhookEndpoint {
  return {
    id: ENDPOINT_ID,
    url: HOOK,
    disabled: false,
    filter_types: [...DODO_WEBHOOK_EVENTS],
    ...overrides,
  };
}

type Change = Partial<Omit<DodoProduct, "price">> & { price?: Partial<DodoProduct["price"]> };

function reads(
  changes: Partial<Record<Variable, Change>> = {},
  extra: Partial<CatalogReads> = {},
): CatalogReads {
  const products = goodProducts();
  const lookups = (Object.keys(products) as Variable[]).map((variable) => {
    const base = products[variable];
    const change = changes[variable] ?? {};
    const product = { ...base, ...change, price: { ...base.price, ...change.price } };
    return [base.product_id, { found: true, product }] as const;
  });
  return {
    products: new Map<string, ProductLookup>(lookups),
    archived: { found: true, items: [] },
    webhooks: { found: true, items: [endpoint()] },
    secretMatches: true,
    ...extra,
  };
}

const problems = (checks: { ok: boolean; message: string }[]) =>
  checks.filter((check) => !check.ok).map((check) => check.message);

const notes = (checks: { ok: boolean; message: string }[]) =>
  checks.filter((check) => check.ok).map((check) => check.message);

function slotFor(variable: ProductVariable): ProductSlot {
  const found = PRODUCT_SLOTS.find((entry) => entry.variable === variable);
  if (!found) throw new Error(`no slot for ${variable}`);
  return found;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("validateCatalog", () => {
  it("passes a catalog that matches the app, one line per product and one for the webhook", () => {
    const checks = validateCatalog(config(), reads());
    expect(problems(checks)).toEqual([]);
    expect(checks.map((check) => check.message)).toEqual([
      "Environment: test mode (DODO_ENVIRONMENT and the API key agree).",
      `Pro monthly (${IDS.DODO_PRO_MONTHLY_PRODUCT_ID}): ${dollars(PRICES_USD.pro.month)} every month plus tax, no trial.`,
      `Pro trial (${IDS.DODO_PRO_TRIAL_PRODUCT_ID}): ${dollars(PRICES_USD.pro.month)} every month plus tax, after a ${PRO_TRIAL.days}-day trial charging ${dollars(PRO_TRIAL.priceUsd)}, card required.`,
      `Pro yearly (${IDS.DODO_PRO_YEARLY_PRODUCT_ID}): ${dollars(PRICES_USD.pro.year)} every year plus tax, no trial.`,
      `Max monthly (${IDS.DODO_MAX_MONTHLY_PRODUCT_ID}): ${dollars(PRICES_USD.max.month)} every month plus tax, no trial.`,
      `Max yearly (${IDS.DODO_MAX_YEARLY_PRODUCT_ID}): ${dollars(PRICES_USD.max.year)} every year plus tax, no trial.`,
      `Webhook endpoint ${ENDPOINT_ID}: sends ${DODO_WEBHOOK_EVENTS.length} event types to ${HOOK}, signed with DODO_WEBHOOK_SECRET.`,
    ]);
  });

  it("passes live mode with a live key", () => {
    const checks = validateCatalog(config({ environment: "live", apiKey: "dodo_live_x" }), reads());
    expect(problems(checks)).toEqual([]);
    expect(checks[0]?.message).toBe(
      "Environment: live mode (DODO_ENVIRONMENT and the API key agree).",
    );
  });

  it("never prints the API key, the webhook secret or the signing secret", () => {
    const text = [
      ...validateCatalog(config(), reads()),
      ...validateCatalog(config(), reads({}, { secretMatches: false })),
      ...validateCatalog(config({ environment: "live" }), null),
      ...validateCatalog(
        config({
          apiKey: "KEYSECRETvalue",
          webhookSecret: "V0hTRUNSRVQ",
          signingSecret: "SIGNINGSECRET",
        }),
        null,
      ),
      ...validateCatalog(
        config({
          apiKey: ` ${API_KEY}`,
          webhookSecret: `${WEBHOOK_SECRET}\n`,
          signingSecret: ` ${SIGNING_SECRET}`,
        }),
        null,
      ),
    ]
      .map((check) => check.message)
      .join("\n");
    expect(text).not.toContain("KEYSECRET");
    expect(text).not.toContain("V0hTRUNSRVQ");
    expect(text).not.toContain("SIGNINGSECRET");
  });

  it("reports a product in another currency or for another amount", () => {
    const checks = validateCatalog(
      config(),
      reads({
        DODO_PRO_MONTHLY_PRODUCT_ID: { price: { currency: "EUR" } },
        DODO_MAX_YEARLY_PRODUCT_ID: { price: { price: 100 } },
        DODO_MAX_MONTHLY_PRODUCT_ID: { price: { price: null } },
      }),
    );
    expect(problems(checks)).toEqual([
      `Pro monthly (${IDS.DODO_PRO_MONTHLY_PRODUCT_ID}): it is in EUR, not USD.`,
      `Max monthly (${IDS.DODO_MAX_MONTHLY_PRODUCT_ID}): it has no price.`,
      `Max yearly (${IDS.DODO_MAX_YEARLY_PRODUCT_ID}): it costs USD 1.00, but the app shows ${dollars(PRICES_USD.max.year)} (PRICES_USD in src/config/plans.ts).`,
    ]);
  });

  it("wants the trial product to cost what Pro monthly costs", () => {
    const checks = validateCatalog(
      config(),
      reads({ DODO_PRO_TRIAL_PRODUCT_ID: { price: { price: cents(PRICES_USD.max.month) } } }),
    );
    expect(problems(checks)).toEqual([
      `Pro trial (${IDS.DODO_PRO_TRIAL_PRODUCT_ID}): it costs ${dollars(PRICES_USD.max.month)}, but the app shows ${dollars(PRICES_USD.pro.month)} (PRICES_USD in src/config/plans.ts).`,
    ]);
  });

  it("reports a one-time price, a usage-based price and a price type it doesn't know", () => {
    const checks = validateCatalog(
      config(),
      reads({
        DODO_PRO_YEARLY_PRODUCT_ID: { price: { type: "one_time_price" } },
        DODO_MAX_MONTHLY_PRODUCT_ID: { price: { type: "usage_based_price" } },
        DODO_MAX_YEARLY_PRODUCT_ID: { price: { type: "something_new" } },
      }),
    );
    expect(problems(checks)).toEqual([
      `Pro yearly (${IDS.DODO_PRO_YEARLY_PRODUCT_ID}): it is a one-time price, not a subscription.`,
      `Max monthly (${IDS.DODO_MAX_MONTHLY_PRODUCT_ID}): it is usage-based, not a fixed price.`,
      `Max yearly (${IDS.DODO_MAX_YEARLY_PRODUCT_ID}): its price type is something_new, not a subscription.`,
    ]);
  });

  it("reports a product that bills on the wrong cycle or on none", () => {
    const checks = validateCatalog(
      config(),
      reads({
        DODO_PRO_YEARLY_PRODUCT_ID: { price: { payment_frequency_interval: "Month" } },
        DODO_MAX_MONTHLY_PRODUCT_ID: { price: { payment_frequency_count: 3 } },
        DODO_MAX_YEARLY_PRODUCT_ID: { price: { payment_frequency_interval: null } },
      }),
    );
    expect(problems(checks)).toEqual([
      `Pro yearly (${IDS.DODO_PRO_YEARLY_PRODUCT_ID}): it bills every month, not every year.`,
      `Max monthly (${IDS.DODO_MAX_MONTHLY_PRODUCT_ID}): it bills every 3 months, not every month.`,
      `Max yearly (${IDS.DODO_MAX_YEARLY_PRODUCT_ID}): it has no billing cycle.`,
    ]);
  });

  it("reports a subscription period that ends after one charge or before 20 years", () => {
    const checks = validateCatalog(
      config(),
      reads({
        DODO_PRO_MONTHLY_PRODUCT_ID: {
          price: { subscription_period_count: 1, subscription_period_interval: "Month" },
        },
        DODO_PRO_TRIAL_PRODUCT_ID: {
          price: { subscription_period_count: 240, subscription_period_interval: "Month" },
        },
        DODO_PRO_YEARLY_PRODUCT_ID: { price: { subscription_period_count: 1 } },
        DODO_MAX_MONTHLY_PRODUCT_ID: {
          price: { subscription_period_count: 2, subscription_period_interval: "Week" },
        },
        DODO_MAX_YEARLY_PRODUCT_ID: { price: { subscription_period_count: 5 } },
      }),
    );
    const set = "set the subscription period to 20 years";
    expect(problems(checks)).toEqual([
      `Pro monthly (${IDS.DODO_PRO_MONTHLY_PRODUCT_ID}): its subscription period (1 month) is no longer than its billing cycle, so it ends after one charge: ${set}.`,
      `Pro yearly (${IDS.DODO_PRO_YEARLY_PRODUCT_ID}): its subscription period (1 year) is no longer than its billing cycle, so it ends after one charge: ${set}.`,
      `Max monthly (${IDS.DODO_MAX_MONTHLY_PRODUCT_ID}): its subscription period (2 weeks) is no longer than its billing cycle, so it ends after one charge: ${set}.`,
      `Max yearly (${IDS.DODO_MAX_YEARLY_PRODUCT_ID}): its subscription period is 5 years, so it stops renewing then: ${set}, the longest Dodo allows.`,
    ]);
  });

  it("reports a subscription period it can't read", () => {
    const checks = validateCatalog(
      config(),
      reads({
        DODO_PRO_MONTHLY_PRODUCT_ID: { price: { subscription_period_count: null } },
        DODO_PRO_YEARLY_PRODUCT_ID: { price: { subscription_period_interval: "Decade" } },
      }),
    );
    expect(problems(checks)).toEqual([
      `Pro monthly (${IDS.DODO_PRO_MONTHLY_PRODUCT_ID}): its subscription period can't be read: set the subscription period to 20 years.`,
      `Pro yearly (${IDS.DODO_PRO_YEARLY_PRODUCT_ID}): its subscription period can't be read: set the subscription period to 20 years.`,
    ]);
  });

  it("wants tax added on top, Dodo's default, and the SaaS tax category", () => {
    const checks = validateCatalog(
      config(),
      reads({
        DODO_PRO_MONTHLY_PRODUCT_ID: { price: { tax_inclusive: true } },
        DODO_PRO_YEARLY_PRODUCT_ID: { price: { tax_inclusive: null } },
        DODO_MAX_MONTHLY_PRODUCT_ID: { tax_category: "digital_products" },
        DODO_MAX_YEARLY_PRODUCT_ID: { tax_category: null },
      }),
    );
    expect(problems(checks)).toEqual([
      `Pro monthly (${IDS.DODO_PRO_MONTHLY_PRODUCT_ID}): its price includes tax; turn tax inclusive off: the pricing page and the terms add tax on top.`,
      `Max monthly (${IDS.DODO_MAX_MONTHLY_PRODUCT_ID}): its tax category is digital_products: set it to SaaS.`,
      `Max yearly (${IDS.DODO_MAX_YEARLY_PRODUCT_ID}): it has no tax category: set it to SaaS.`,
    ]);
  });

  it("reports purchasing power parity, localized prices, discounts and add-ons", () => {
    const checks = validateCatalog(
      config(),
      reads({
        DODO_PRO_MONTHLY_PRODUCT_ID: { price: { purchasing_power_parity: true } },
        DODO_PRO_TRIAL_PRODUCT_ID: { addons: ["adn_Q2c8mJ3vX1aB0cD4eF5gH"] },
        DODO_PRO_YEARLY_PRODUCT_ID: { pricing_mode: "by_country" },
        DODO_MAX_MONTHLY_PRODUCT_ID: { price: { discount_bps: 1250 } },
        DODO_MAX_YEARLY_PRODUCT_ID: { price: { discount: 10, discount_bps: null } },
      }),
    );
    const one = "but the app shows one USD price everywhere";
    expect(problems(checks)).toEqual([
      `Pro monthly (${IDS.DODO_PRO_MONTHLY_PRODUCT_ID}): it has purchasing power parity on, ${one}: turn it off.`,
      `Pro trial (${IDS.DODO_PRO_TRIAL_PRODUCT_ID}): it offers 1 add-on, which the app doesn't sell: remove it.`,
      `Pro yearly (${IDS.DODO_PRO_YEARLY_PRODUCT_ID}): it has localized prices (by_country), ${one}: remove them.`,
      `Max monthly (${IDS.DODO_MAX_MONTHLY_PRODUCT_ID}): it has a 12.5% discount, but the app shows the full price: remove it.`,
      `Max yearly (${IDS.DODO_MAX_YEARLY_PRODUCT_ID}): it has a 10% discount, but the app shows the full price: remove it.`,
    ]);
  });

  it("accepts a discount of zero in either field and no add-on list", () => {
    const checks = validateCatalog(
      config(),
      reads({
        DODO_PRO_MONTHLY_PRODUCT_ID: { price: { discount: 0, discount_bps: null } },
        DODO_MAX_MONTHLY_PRODUCT_ID: { price: { discount: 0, discount_bps: 0 } },
      }),
    );
    expect(problems(checks)).toEqual([]);
  });

  it("reports trial fields on a product that isn't the trial product", () => {
    const checks = validateCatalog(
      config(),
      reads({
        DODO_PRO_MONTHLY_PRODUCT_ID: { price: { trial_period_days: null, trial_amount: null } },
        DODO_PRO_YEARLY_PRODUCT_ID: { price: { trial_amount: TRIAL_AMOUNT } },
        DODO_MAX_MONTHLY_PRODUCT_ID: { price: { trial_period_days: 7 } },
        DODO_MAX_YEARLY_PRODUCT_ID: { price: { trial_amount: 0 } },
      }),
    );
    expect(problems(checks)).toEqual([
      `Pro yearly (${IDS.DODO_PRO_YEARLY_PRODUCT_ID}): it has a trial charge of ${dollars(PRO_TRIAL.priceUsd)}; only DODO_PRO_TRIAL_PRODUCT_ID should.`,
      `Max monthly (${IDS.DODO_MAX_MONTHLY_PRODUCT_ID}): it has a 7-day trial; only DODO_PRO_TRIAL_PRODUCT_ID should.`,
    ]);
  });

  it("reports a trial product without a trial", () => {
    const without = (days: number | null) =>
      problems(
        validateCatalog(
          config(),
          reads({ DODO_PRO_TRIAL_PRODUCT_ID: { price: { trial_period_days: days } } }),
        ),
      );
    const message = `Pro trial (${IDS.DODO_PRO_TRIAL_PRODUCT_ID}): it has no trial; it needs a ${PRO_TRIAL.days}-day trial.`;
    expect(without(0)).toEqual([message]);
    expect(without(null)).toEqual([message]);
  });

  it("reports a trial of the wrong length, the wrong charge, and one without a card", () => {
    const checks = validateCatalog(
      config(),
      reads({
        DODO_PRO_TRIAL_PRODUCT_ID: {
          price: { trial_period_days: 3, trial_amount: 250, trial_payment_method_optional: true },
        },
      }),
    );
    const where = `Pro trial (${IDS.DODO_PRO_TRIAL_PRODUCT_ID})`;
    expect(problems(checks)).toEqual([
      `${where}: its trial is 3 days, not ${PRO_TRIAL.days} days (PRO_TRIAL in src/config/plans.ts).`,
      `${where}: it charges USD 2.50 for the trial, not ${dollars(PRO_TRIAL.priceUsd)} (PRO_TRIAL in src/config/plans.ts).`,
      `${where}: its trial doesn't ask for a card; it must (turn off payment method optional).`,
    ]);
    expect(
      problems(
        validateCatalog(
          config(),
          reads({ DODO_PRO_TRIAL_PRODUCT_ID: { price: { trial_period_days: 1 } } }),
        ),
      ),
    ).toEqual([
      `${where}: its trial is 1 day, not ${PRO_TRIAL.days} days (PRO_TRIAL in src/config/plans.ts).`,
    ]);
  });

  it("reports a free trial now that the trial costs money", () => {
    for (const amount of [null, 0]) {
      const checks = validateCatalog(
        config(),
        reads({ DODO_PRO_TRIAL_PRODUCT_ID: { price: { trial_amount: amount } } }),
      );
      expect(problems(checks)).toEqual([
        `Pro trial (${IDS.DODO_PRO_TRIAL_PRODUCT_ID}): its trial is free; it must charge ${dollars(PRO_TRIAL.priceUsd)} (PRO_TRIAL in src/config/plans.ts).`,
      ]);
    }
  });

  it("accepts a trial that leaves the card rule to Dodo's default", () => {
    const checks = validateCatalog(
      config(),
      reads({ DODO_PRO_TRIAL_PRODUCT_ID: { price: { trial_payment_method_optional: false } } }),
    );
    expect(problems(checks)).toEqual([]);
  });

  it("reports an archived product", () => {
    const checks = validateCatalog(
      config(),
      reads(
        {},
        {
          archived: {
            found: true,
            items: [
              { product_id: IDS.DODO_PRO_YEARLY_PRODUCT_ID, name: null, metadata: {} },
              { product_id: dodoId("pdt", "SomethingElse"), name: null, metadata: {} },
            ],
          },
        },
      ),
    );
    expect(problems(checks)).toEqual([
      `Pro yearly (${IDS.DODO_PRO_YEARLY_PRODUCT_ID}): it is archived, so it can't be bought: unarchive it, or set DODO_PRO_YEARLY_PRODUCT_ID to an active product.`,
    ]);
  });

  it("reports archived products it couldn't list", () => {
    const checks = validateCatalog(
      config(),
      reads({}, { archived: { found: false, reason: "http", status: 503 } }),
    );
    expect(problems(checks)).toEqual(["Archived products: Dodo answered HTTP 503. Try again."]);
  });

  it("wants a product name that names its plan and no other", () => {
    const checks = validateCatalog(
      config(),
      reads({
        DODO_PRO_MONTHLY_PRODUCT_ID: { name: "Otto Sensei Max (monthly)" },
        DODO_PRO_YEARLY_PRODUCT_ID: { name: "PRO plan, yearly (Otto Sensei)" },
        DODO_MAX_MONTHLY_PRODUCT_ID: { name: "  " },
        DODO_MAX_YEARLY_PRODUCT_ID: { name: null },
      }),
    );
    expect(problems(checks)).toEqual([
      `Pro monthly (${IDS.DODO_PRO_MONTHLY_PRODUCT_ID}): it holds the Pro price but is called "Otto Sensei Max (monthly)": buyers see that name, so name it for Pro.`,
      `Max monthly (${IDS.DODO_MAX_MONTHLY_PRODUCT_ID}): it has no name: buyers see it at checkout and on receipts, so name it for Max.`,
      `Max yearly (${IDS.DODO_MAX_YEARLY_PRODUCT_ID}): it has no name: buyers see it at checkout and on receipts, so name it for Max.`,
    ]);
    const pro = (name: string) =>
      problems(validateCatalog(config(), reads({ DODO_PRO_MONTHLY_PRODUCT_ID: { name } })));
    expect(pro("Otto Sensei")).toHaveLength(1);
    expect(pro("Otto Sensei Pro and Max")).toHaveLength(1);
    expect(pro("Otto Sensei Professional")).toHaveLength(1);
  });

  it("needs Pro monthly, notes the optional products that aren't set, and wants one Max product", () => {
    const checks = validateCatalog(
      config({ productIds: { DODO_PRO_YEARLY_PRODUCT_ID: IDS.DODO_PRO_YEARLY_PRODUCT_ID } }),
      reads(),
    );
    expect(problems(checks)).toEqual([
      "Pro monthly: DODO_PRO_MONTHLY_PRODUCT_ID is not set: billing stays off without it.",
      "Max: neither DODO_MAX_MONTHLY_PRODUCT_ID nor DODO_MAX_YEARLY_PRODUCT_ID is set, so Max isn't offered.",
    ]);
    expect(notes(checks)).toContain(
      "Pro trial: DODO_PRO_TRIAL_PRODUCT_ID is not set, so there is no trial.",
    );
    expect(notes(checks)).toContain(
      "Max yearly: DODO_MAX_YEARLY_PRODUCT_ID is not set, so Max yearly isn't offered.",
    );
  });

  it("reports two variables holding the same product id", () => {
    const checks = validateCatalog(
      config({
        productIds: { ...IDS, DODO_PRO_TRIAL_PRODUCT_ID: IDS.DODO_PRO_MONTHLY_PRODUCT_ID },
      }),
      reads(),
    );
    expect(problems(checks)).toEqual([
      `Pro trial (${IDS.DODO_PRO_MONTHLY_PRODUCT_ID}): it has no trial; it needs a ${PRO_TRIAL.days}-day trial.`,
      "DODO_PRO_MONTHLY_PRODUCT_ID and DODO_PRO_TRIAL_PRODUCT_ID hold the same product id: each needs its own product.",
    ]);
  });

  it("reports ids that can't be Dodo product ids without echoing them", () => {
    const checks = validateCatalog(
      config({
        productIds: {
          ...IDS,
          DODO_PRO_MONTHLY_PRODUCT_ID: `${IDS.DODO_PRO_MONTHLY_PRODUCT_ID}\n`,
          DODO_PRO_YEARLY_PRODUCT_ID: `pri_${"a1".repeat(13)}`,
          DODO_MAX_MONTHLY_PRODUCT_ID: dodoId("sub", "Iuaq622bbmmfOGrVTqdXv"),
          DODO_MAX_YEARLY_PRODUCT_ID: "not-a-product-id",
        },
      }),
      reads(),
    );
    expect(problems(checks)).toEqual([
      "Pro monthly: DODO_PRO_MONTHLY_PRODUCT_ID has a space or line break around the id: remove it.",
      "Pro yearly: DODO_PRO_YEARLY_PRODUCT_ID holds a Paddle price id: set it to the Dodo product id (pdt_...).",
      "Max monthly: DODO_MAX_MONTHLY_PRODUCT_ID isn't a Dodo product id: it should be pdt_ followed by letters and digits.",
      "Max yearly: DODO_MAX_YEARLY_PRODUCT_ID isn't a Dodo product id: it should be pdt_ followed by letters and digits.",
    ]);
    const text = problems(checks).join("\n");
    expect(text).not.toContain("not-a-product-id");
    expect(text).not.toContain("a1a1");
  });

  it("explains each way reading a product can fail, once per cause", () => {
    const failing = (failures: Record<Variable, ProductLookup>): CatalogReads => ({
      ...reads(),
      products: new Map<string, ProductLookup>(
        (Object.keys(failures) as Variable[]).map((variable) => [
          IDS[variable],
          failures[variable],
        ]),
      ),
    });
    expect(
      problems(
        validateCatalog(
          config(),
          failing({
            DODO_PRO_MONTHLY_PRODUCT_ID: { found: false, reason: "not_found" },
            DODO_PRO_TRIAL_PRODUCT_ID: { found: false, reason: "timeout" },
            DODO_PRO_YEARLY_PRODUCT_ID: { found: false, reason: "network" },
            DODO_MAX_MONTHLY_PRODUCT_ID: { found: false, reason: "http", status: 500 },
            DODO_MAX_YEARLY_PRODUCT_ID: { found: false, reason: "unexpected" },
          }),
        ),
      ),
    ).toEqual([
      `Pro monthly (${IDS.DODO_PRO_MONTHLY_PRODUCT_ID}): not in the test mode catalog. Copy it from test mode; test and live ids differ.`,
      `Pro trial (${IDS.DODO_PRO_TRIAL_PRODUCT_ID}): Dodo didn't answer within 8 seconds. Try again.`,
      `Pro yearly (${IDS.DODO_PRO_YEARLY_PRODUCT_ID}): Dodo couldn't be reached. Check the connection and try again.`,
      `Max monthly (${IDS.DODO_MAX_MONTHLY_PRODUCT_ID}): Dodo answered HTTP 500. Try again.`,
      `Max yearly (${IDS.DODO_MAX_YEARLY_PRODUCT_ID}): Dodo's answer wasn't something this check can read.`,
    ]);

    const refused = (reason: "unauthorized" | "forbidden"): CatalogReads => ({
      products: new Map<string, ProductLookup>(
        Object.values(IDS).map((id) => [id, { found: false, reason }]),
      ),
      archived: { found: false, reason },
      webhooks: { found: false, reason },
      secretMatches: null,
    });
    expect(problems(validateCatalog(config(), refused("unauthorized")))).toEqual([
      "Dodo refused the API key (HTTP 401): it may have been revoked, or it belongs to the other mode.",
    ]);
    expect(problems(validateCatalog(config(), refused("forbidden")))).toEqual([
      "The API key can't read products (HTTP 403): give it Products read.",
    ]);
  });

  it("says nothing was read when the key can't read this mode", () => {
    expect(problems(validateCatalog(config({ apiKey: undefined }), null))).toEqual([
      "DODO_API_KEY is not set: nothing can be read from Dodo without it.",
      "Products and the webhook endpoint weren't read from Dodo: fix the API key and environment first.",
    ]);
  });
});

describe("environment checks", () => {
  it("reports a key from the other mode, either way round", () => {
    const liveWithTestKey = config({ environment: "live" });
    expect(canReadCatalog(liveWithTestKey)).toBe(false);
    expect(problems(validateCatalog(liveWithTestKey, null))).toEqual([
      "Environments disagree: DODO_ENVIRONMENT is live and the API key is a test mode key. Billing stays off until they agree; only live, live_mode or production in DODO_ENVIRONMENT selects live mode.",
      "Products and the webhook endpoint weren't read from Dodo: fix the API key and environment first.",
    ]);
    const testWithLiveKey = config({ apiKey: "dodo_live_x" });
    expect(canReadCatalog(testWithLiveKey)).toBe(false);
    expect(problems(validateCatalog(testWithLiveKey, null))[0]).toBe(
      "Environments disagree: DODO_ENVIRONMENT is test and the API key is a live mode key. Billing stays off until they agree; only live, live_mode or production in DODO_ENVIRONMENT selects live mode.",
    );
    expect(canReadCatalog(config())).toBe(true);
  });

  it("reports a missing, padded or unrecognised API key", () => {
    const keyChecks = (apiKey: string | undefined) =>
      validateCatalog(config({ apiKey }), null).map((check) => check.message);
    expect(keyChecks(undefined).slice(0, 2)).toEqual([
      "DODO_API_KEY is not set: nothing can be read from Dodo without it.",
      "Environment: test mode.",
    ]);
    expect(keyChecks(` ${API_KEY}`)[0]).toBe(
      "DODO_API_KEY has a space or line break around it: remove it.",
    );
    for (const key of ["sk_test_x", "dodo_test_", "dodo_sandbox_x", "DODO_TEST_x"]) {
      expect(keyChecks(key)[0]).toBe(
        "DODO_API_KEY doesn't look right: it should start with dodo_test_ (test mode) or dodo_live_ (live mode).",
      );
    }
  });

  it("tells the key's mode from its prefix", () => {
    expect(keyEnvironment("dodo_test_abc")).toBe("test");
    expect(keyEnvironment("dodo_live_abc")).toBe("live");
    for (const key of [undefined, "", "dodo_live_", " dodo_live_abc", "dodo_test_abc\n", "abc"]) {
      expect(keyEnvironment(key)).toBeNull();
    }
  });

  it("reports a missing, padded or malformed webhook secret", () => {
    const secretProblems = (webhookSecret: string | undefined) =>
      problems(validateCatalog(config({ webhookSecret }), reads()));
    expect(secretProblems(undefined)).toEqual([
      "DODO_WEBHOOK_SECRET is not set: billing stays off without it.",
    ]);
    expect(secretProblems(`${WEBHOOK_SECRET}\n`)).toEqual([
      "DODO_WEBHOOK_SECRET has a space or line break around it: remove it.",
    ]);
    for (const secret of ["V0hTRUNSRVQ=", "whsec_", "whsec_not base64", "pdl_ntfset_x"]) {
      expect(secretProblems(secret)).toEqual([
        "DODO_WEBHOOK_SECRET doesn't look right: it should start with whsec_. Copy it from the webhook endpoint, or run scripts/dodo-setup.ts.",
      ]);
    }
  });

  it("reports a missing, padded or short signing secret", () => {
    const signingProblems = (signingSecret: string | undefined) =>
      problems(validateCatalog(config({ signingSecret }), reads()));
    expect(signingProblems(undefined)).toEqual([
      "BILLING_SIGNING_SECRET is not set: billing stays off without it. Make one with openssl rand -hex 32.",
    ]);
    expect(signingProblems(` ${SIGNING_SECRET}`)).toEqual([
      "BILLING_SIGNING_SECRET has a space or line break around it: remove it.",
    ]);
    expect(signingProblems("a".repeat(31))).toEqual([
      "BILLING_SIGNING_SECRET is too short: make a new one with openssl rand -hex 32.",
    ]);
    expect(signingProblems("a".repeat(32))).toEqual([]);
  });
});

describe("webhook checks", () => {
  const webhookProblems = (extra: Partial<CatalogReads>, overrides: Partial<CatalogConfig> = {}) =>
    problems(validateCatalog(config(overrides), reads({}, extra)));

  it("reports no endpoint for the app's webhook URL, naming the ones it found", () => {
    expect(webhookProblems({ webhooks: { found: true, items: [] } })).toEqual([
      `No webhook endpoint sends to ${HOOK}: run scripts/dodo-setup.ts.`,
    ]);
    const others = [
      endpoint({ url: "https://ottosensei.com/api/billing/webhook" }),
      endpoint({
        id: "whk_Other000000000000000",
        url: "http://www.ottosensei.com/api/billing/webhook",
      }),
    ];
    expect(webhookProblems({ webhooks: { found: true, items: others } })).toEqual([
      `No webhook endpoint sends to ${HOOK}: run scripts/dodo-setup.ts. Endpoints found: https://ottosensei.com/api/billing/webhook and http://www.ottosensei.com/api/billing/webhook.`,
    ]);
  });

  it("matches the endpoint whatever the host's case or a trailing slash", () => {
    const items = [endpoint({ url: "https://WWW.OttoSensei.com/api/billing/webhook/" })];
    expect(webhookProblems({ webhooks: { found: true, items } })).toEqual([]);
    expect(webhookProblems({ webhooks: { found: true, items } }, { appUrl: `${APP}/` })).toEqual(
      [],
    );
  });

  it("reports an endpoint with no event list, which Dodo treats as every event", () => {
    const message = `Webhook endpoint ${ENDPOINT_ID}: it has no event list, so it sends every event type: run scripts/dodo-setup.ts to set one.`;
    for (const filter_types of [[], null]) {
      expect(
        webhookProblems({ webhooks: { found: true, items: [endpoint({ filter_types })] } }),
      ).toEqual([message]);
    }
  });

  it("reports the events an endpoint doesn't send, and accepts extra ones", () => {
    const filter_types = DODO_WEBHOOK_EVENTS.filter(
      (event) => event !== "payment.succeeded" && event !== "dispute.lost",
    );
    expect(
      webhookProblems({ webhooks: { found: true, items: [endpoint({ filter_types })] } }),
    ).toEqual([
      `Webhook endpoint ${ENDPOINT_ID}: it doesn't send payment.succeeded and dispute.lost: run scripts/dodo-setup.ts to add them.`,
    ]);
    const extra = [...DODO_WEBHOOK_EVENTS, "payout.success"];
    expect(
      webhookProblems({ webhooks: { found: true, items: [endpoint({ filter_types: extra })] } }),
    ).toEqual([]);
  });

  it("reports a disabled endpoint and two endpoints for one URL", () => {
    expect(
      webhookProblems({ webhooks: { found: true, items: [endpoint({ disabled: true })] } }),
    ).toEqual([
      `Webhook endpoint ${ENDPOINT_ID}: it is disabled, so no event reaches the app: enable it.`,
    ]);
    const second = "whk_Second0000000000000";
    expect(
      webhookProblems({
        webhooks: { found: true, items: [endpoint(), endpoint({ id: second })] },
      }),
    ).toEqual([
      `2 webhook endpoints send to ${HOOK} (${ENDPOINT_ID} and ${second}): delete all but one.`,
    ]);
  });

  it("reports a webhook secret that isn't the endpoint's, and says nothing when it wasn't read", () => {
    expect(webhookProblems({ secretMatches: false })).toEqual([
      `DODO_WEBHOOK_SECRET isn't the signing secret of webhook endpoint ${ENDPOINT_ID}: copy it from the endpoint, or run scripts/dodo-setup.ts. Test and live mode endpoints have different secrets.`,
    ]);
    const unread = validateCatalog(config(), reads({}, { secretMatches: null }));
    expect(problems(unread)).toEqual([]);
    expect(unread.at(-1)?.message).toBe(
      `Webhook endpoint ${ENDPOINT_ID}: sends ${DODO_WEBHOOK_EVENTS.length} event types to ${HOOK}.`,
    );
  });

  it("notes a key that can't read webhooks, and reports other failures", () => {
    const forbidden = validateCatalog(
      config(),
      reads({}, { webhooks: { found: false, reason: "forbidden" }, secretMatches: null }),
    );
    expect(problems(forbidden)).toEqual([]);
    expect(forbidden.at(-1)?.message).toBe(
      "Webhook endpoint not checked: the API key can't read webhooks (HTTP 403). Give it Webhooks read, or check the endpoint in the Dodo dashboard.",
    );
    expect(webhookProblems({ webhooks: { found: false, reason: "http", status: 502 } })).toEqual([
      "Webhook endpoints: Dodo answered HTTP 502. Try again.",
    ]);
  });

  it("finds the endpoint for an app URL", () => {
    expect(webhookUrl("www.ottosensei.com/")).toBe(HOOK);
    const items = [endpoint({ url: "not a url" }), endpoint({ id: "whk_x", url: HOOK })];
    expect(endpointsFor(items, APP).map((item) => item.id)).toEqual(["whk_x"]);
  });
});

describe("productSpec", () => {
  it("builds the trial product as Pro monthly with the paid trial", () => {
    expect(productSpec(slotFor("DODO_PRO_TRIAL_PRODUCT_ID"))).toEqual({
      name: `Otto Sensei Pro (monthly, ${PRO_TRIAL.days}-day trial)`,
      description: `Otto Sensei Pro with a ${PRO_TRIAL.days}-day trial, then billed every month until you cancel.`,
      tax_category: "saas",
      price: {
        type: "recurring_price",
        currency: "USD",
        price: cents(PRICES_USD.pro.month),
        discount_bps: 0,
        purchasing_power_parity: false,
        tax_inclusive: false,
        payment_frequency_count: 1,
        payment_frequency_interval: "Month",
        subscription_period_count: 20,
        subscription_period_interval: "Year",
        trial_period_days: PRO_TRIAL.days,
        trial_amount: TRIAL_AMOUNT,
      },
      metadata: { otto_plan: "pro", otto_interval: "month", otto_trial: "true" },
    });
  });

  it("gives the other products no trial and a name each", () => {
    const spec = productSpec(slotFor("DODO_MAX_YEARLY_PRODUCT_ID"));
    expect(spec.name).toBe("Otto Sensei Max (yearly)");
    expect(spec.price).toMatchObject({
      price: cents(PRICES_USD.max.year),
      payment_frequency_interval: "Year",
      trial_period_days: 0,
    });
    expect(spec.price).not.toHaveProperty("trial_amount");
    const names = PRODUCT_SLOTS.map((entry) => productSpec(entry).name);
    expect(new Set(names).size).toBe(PRODUCT_SLOTS.length);
  });

  it("makes products the check passes once Dodo echoes them back", async () => {
    for (const entry of PRODUCT_SLOTS) {
      const id = IDS[entry.variable];
      stubFetch(() => json({ product_id: id, ...productSpec(entry) }));
      const lookup = await readDodoProduct(id, { apiKey: API_KEY, environment: "test" });
      if (!lookup.found) throw new Error(`${entry.variable} wasn't read`);
      expect(productProblems(entry, lookup.product)).toEqual([]);
    }
  });

  it("tags each product so a rerun finds it and no other", () => {
    for (const entry of PRODUCT_SLOTS) {
      const metadata = productSpec(entry).metadata;
      expect(PRODUCT_SLOTS.filter((other) => slotTagged(metadata, other))).toEqual([entry]);
    }
    const trial = slotFor("DODO_PRO_TRIAL_PRODUCT_ID");
    expect(slotTagged({ otto_plan: "pro", otto_interval: "month", otto_trial: true }, trial)).toBe(
      true,
    );
    expect(slotTagged({ otto_plan: "pro", otto_interval: "month" }, trial)).toBe(false);
    expect(slotTagged({}, slotFor("DODO_PRO_MONTHLY_PRODUCT_ID"))).toBe(false);
  });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function stubFetch(answer: (url: URL, init: RequestInit) => Response | Promise<Response>) {
  const fetchStub = vi.fn(async (input: string | URL | Request, init: RequestInit = {}) =>
    answer(new URL(input instanceof Request ? input.url : input), init),
  );
  vi.stubGlobal("fetch", fetchStub);
  return fetchStub;
}

// The documented GET /products/{id} answer (dodopayments 2.63.0); the test-mode spike swaps in a captured one.
const DOCUMENTED_TRIAL_PRODUCT = {
  brand_id: "bus_P6BEy0FsmYnzGZ8SMFfRx",
  business_id: "bus_P6BEy0FsmYnzGZ8SMFfRx",
  created_at: "2026-11-20T09:30:15.123456Z",
  updated_at: "2026-11-20T09:30:15.123456Z",
  credit_entitlements: [],
  entitlements: [],
  is_recurring: true,
  license_key_enabled: false,
  license_key_activation_message: null,
  license_key_activations_limit: null,
  license_key_duration: null,
  digital_product_delivery: null,
  image: null,
  product_collection_id: null,
  addons: null,
  description: "Otto Sensei Pro with a 7-day trial, then billed every month until you cancel.",
  metadata: { otto_plan: "pro", otto_interval: "month", otto_trial: "true" },
  name: "Otto Sensei Pro (monthly, 7-day trial)",
  pricing_mode: null,
  product_id: IDS.DODO_PRO_TRIAL_PRODUCT_ID,
  tax_category: "saas",
  price: {
    type: "recurring_price",
    currency: "USD",
    price: 1500,
    discount: 0,
    discount_bps: 0,
    payment_frequency_count: 1,
    payment_frequency_interval: "Month",
    subscription_period_count: 20,
    subscription_period_interval: "Year",
    purchasing_power_parity: false,
    tax_inclusive: false,
    trial_period_days: 7,
    trial_amount: 100,
    trial_apply_discounts: false,
    trial_payment_method_optional: false,
    zero_amount_payment_method_optional: false,
  },
};

describe("readDodoProduct", () => {
  const access = { apiKey: API_KEY, environment: "test" as const };

  it("reads a product with a GET to the mode's API, keeping only what the check needs", async () => {
    const fetchStub = stubFetch(() => json(DOCUMENTED_TRIAL_PRODUCT));
    expect(await readDodoProduct(IDS.DODO_PRO_TRIAL_PRODUCT_ID, access)).toEqual({
      found: true,
      product: {
        product_id: IDS.DODO_PRO_TRIAL_PRODUCT_ID,
        name: "Otto Sensei Pro (monthly, 7-day trial)",
        tax_category: "saas",
        metadata: { otto_plan: "pro", otto_interval: "month", otto_trial: "true" },
        addons: [],
        pricing_mode: null,
        price: {
          type: "recurring_price",
          currency: "USD",
          price: 1500,
          payment_frequency_count: 1,
          payment_frequency_interval: "Month",
          subscription_period_count: 20,
          subscription_period_interval: "Year",
          discount: 0,
          discount_bps: 0,
          purchasing_power_parity: false,
          pay_what_you_want: null,
          tax_inclusive: false,
          trial_period_days: 7,
          trial_amount: 100,
          trial_payment_method_optional: false,
        },
      },
    });
    expect(fetchStub).toHaveBeenCalledTimes(1);
    const [url, init] = fetchStub.mock.calls[0] ?? [];
    expect(String(url)).toBe(
      `https://test.dodopayments.com/products/${IDS.DODO_PRO_TRIAL_PRODUCT_ID}`,
    );
    expect(init?.method).toBe("GET");
    expect(init?.body).toBeUndefined();
    expect(new Headers(init?.headers).get("authorization")).toBe(`Bearer ${API_KEY}`);
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("passes the documented trial product", async () => {
    stubFetch(() => json(DOCUMENTED_TRIAL_PRODUCT));
    const lookup = await readDodoProduct(IDS.DODO_PRO_TRIAL_PRODUCT_ID, access);
    if (!lookup.found) throw new Error("not read");
    expect(productProblems(slotFor("DODO_PRO_TRIAL_PRODUCT_ID"), lookup.product)).toEqual([]);
  });

  it("uses the live API for live mode, and fills in what Dodo leaves out", async () => {
    const fetchStub = stubFetch(() =>
      json({
        product_id: IDS.DODO_PRO_MONTHLY_PRODUCT_ID,
        tax_category: "saas",
        price: { type: "recurring_price", currency: "USD", price: 1500 },
      }),
    );
    const lookup = await readDodoProduct(IDS.DODO_PRO_MONTHLY_PRODUCT_ID, {
      apiKey: "dodo_live_x",
      environment: "live",
    });
    expect(String(fetchStub.mock.calls[0]?.[0])).toBe(
      `https://live.dodopayments.com/products/${IDS.DODO_PRO_MONTHLY_PRODUCT_ID}`,
    );
    expect(lookup).toEqual({
      found: true,
      product: expect.objectContaining({
        name: null,
        metadata: {},
        addons: [],
        pricing_mode: null,
        price: expect.objectContaining({
          payment_frequency_interval: null,
          tax_inclusive: null,
          trial_period_days: null,
          trial_amount: null,
        }),
      }),
    });
  });

  it("turns Dodo's refusals into reasons", async () => {
    for (const [status, expected] of [
      [404, { found: false, reason: "not_found" }],
      [401, { found: false, reason: "unauthorized" }],
      [403, { found: false, reason: "forbidden" }],
      [429, { found: false, reason: "http", status: 429 }],
      [500, { found: false, reason: "http", status: 500 }],
    ] as const) {
      stubFetch(() => json({ code: "NOT_FOUND", message: "x" }, status));
      expect(await readDodoProduct(IDS.DODO_PRO_MONTHLY_PRODUCT_ID, access)).toEqual(expected);
    }
  });

  it("reports an answer it can't read, a network failure and a timeout", async () => {
    const unexpected = { found: false, reason: "unexpected" };
    stubFetch(() => json({ product_id: IDS.DODO_PRO_MONTHLY_PRODUCT_ID }));
    expect(await readDodoProduct(IDS.DODO_PRO_MONTHLY_PRODUCT_ID, access)).toEqual(unexpected);
    stubFetch(() => new Response("not json"));
    expect(await readDodoProduct(IDS.DODO_PRO_MONTHLY_PRODUCT_ID, access)).toEqual(unexpected);
    stubFetch(() => Promise.reject(new TypeError("fetch failed")));
    expect(await readDodoProduct(IDS.DODO_PRO_MONTHLY_PRODUCT_ID, access)).toEqual({
      found: false,
      reason: "network",
    });
    stubFetch(() => Promise.reject(new DOMException("timed out", "TimeoutError")));
    expect(await readDodoProduct(IDS.DODO_PRO_MONTHLY_PRODUCT_ID, access)).toEqual({
      found: false,
      reason: "timeout",
    });
  });

  it("reports a timeout that hits while the answer is still arriving", async () => {
    stubFetch(
      () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode('{"product_id":'));
              controller.error(new DOMException("timed out", "TimeoutError"));
            },
          }),
        ),
    );
    expect(await readDodoProduct(IDS.DODO_PRO_MONTHLY_PRODUCT_ID, access)).toEqual({
      found: false,
      reason: "timeout",
    });
  });
});

describe("listing products and webhooks", () => {
  const access = { apiKey: API_KEY, environment: "test" as const };
  const summary = (n: number) => ({
    product_id: `pdt_Listed${String(n).padStart(15, "0")}`,
    name: `P${n}`,
  });

  it("pages through the archived products until a short page", async () => {
    const all = Array.from({ length: 150 }, (_, n) => summary(n));
    const fetchStub = stubFetch((url) => {
      const page = Number(url.searchParams.get("page_number"));
      return json({ items: [...all.slice(page * 100, page * 100 + 100), { name: "no id" }] });
    });
    const listed = await listDodoProducts(access, { archived: true });
    expect(listed.found && listed.items.map((item) => item.product_id)).toEqual(
      all.map((item) => item.product_id),
    );
    expect(fetchStub.mock.calls.map(([url]) => String(url))).toEqual([
      "https://test.dodopayments.com/products?page_size=100&page_number=0&archived=true",
      "https://test.dodopayments.com/products?page_size=100&page_number=1&archived=true",
    ]);
    expect(fetchStub.mock.calls.every(([, init]) => init?.method === "GET")).toBe(true);
  });

  it("lists active products without the archived flag, and stops when a page repeats", async () => {
    const page = Array.from({ length: 100 }, (_, n) => summary(n));
    const fetchStub = stubFetch(() => json({ items: page }));
    const listed = await listDodoProducts(access, { archived: false });
    expect(listed.found && listed.items).toHaveLength(100);
    expect(fetchStub).toHaveBeenCalledTimes(2);
    expect(new URL(String(fetchStub.mock.calls[0]?.[0])).searchParams.has("archived")).toBe(false);
  });

  it("passes on a failure or an answer it can't read", async () => {
    stubFetch(() => json({}, 403));
    expect(await listDodoProducts(access, { archived: true })).toEqual({
      found: false,
      reason: "forbidden",
    });
    stubFetch(() => json({ data: [] }));
    expect(await listDodoProducts(access, { archived: true })).toEqual({
      found: false,
      reason: "unexpected",
    });
  });

  it("follows the webhook list's iterator until it is done", async () => {
    const second = endpoint({ id: "whk_Second0000000000000", filter_types: null });
    const fetchStub = stubFetch((url) =>
      url.searchParams.get("iterator") === "next"
        ? json({ data: [second], done: true, iterator: null })
        : json({ data: [endpoint(), { url: "no id" }], done: false, iterator: "next" }),
    );
    const listed = await listDodoWebhooks(access);
    expect(listed).toEqual({ found: true, items: [endpoint(), second] });
    expect(fetchStub.mock.calls.map(([url]) => String(url))).toEqual([
      "https://test.dodopayments.com/webhooks?limit=100",
      "https://test.dodopayments.com/webhooks?limit=100&iterator=next",
    ]);
  });

  it("reads a webhook endpoint's secret", async () => {
    const fetchStub = stubFetch(() => json({ secret: WEBHOOK_SECRET }));
    expect(await readWebhookSecret(ENDPOINT_ID, access)).toEqual({
      found: true,
      secret: WEBHOOK_SECRET,
    });
    expect(String(fetchStub.mock.calls[0]?.[0])).toBe(
      `https://test.dodopayments.com/webhooks/${ENDPOINT_ID}/secret`,
    );
    stubFetch(() => json({ secret: "" }));
    expect(await readWebhookSecret(ENDPOINT_ID, access)).toEqual({
      found: false,
      reason: "unexpected",
    });
  });
});

describe("runCatalogCheck", () => {
  function serve(
    options: { products?: DodoProduct[]; endpoints?: WebhookEndpoint[]; secret?: string } = {},
  ) {
    const products = options.products ?? Object.values(goodProducts());
    return stubFetch((url) => {
      if (url.pathname === "/products") return json({ items: [] });
      const product = products.find((item) => url.pathname === `/products/${item.product_id}`);
      if (product) return json(product);
      if (url.pathname === "/webhooks") {
        return json({ data: options.endpoints ?? [endpoint()], done: true, iterator: null });
      }
      if (url.pathname === `/webhooks/${ENDPOINT_ID}/secret`) {
        return json({ secret: options.secret ?? WEBHOOK_SECRET });
      }
      return json({ code: "NOT_FOUND" }, 404);
    });
  }

  it("reads each product, the archived list, the webhooks and the secret with GETs, and passes", async () => {
    const fetchStub = serve();
    const checks = await runCatalogCheck(config());
    expect(problems(checks)).toEqual([]);
    expect(checks.at(-1)?.message).toContain("signed with DODO_WEBHOOK_SECRET");
    expect(fetchStub.mock.calls.every(([, init]) => init?.method === "GET")).toBe(true);
    const paths = fetchStub.mock.calls.map(([url]) => {
      const parsed = new URL(String(url));
      return `${parsed.pathname}${parsed.search}`;
    });
    expect(paths.sort()).toEqual(
      [
        ...Object.values(IDS).map((id) => `/products/${id}`),
        "/products?page_size=100&page_number=0&archived=true",
        "/webhooks?limit=100",
        `/webhooks/${ENDPOINT_ID}/secret`,
      ].sort(),
    );
  });

  it("reports a webhook secret that isn't the endpoint's", async () => {
    serve({ secret: "whsec_T3RoZXJTZWNyZXQ=" });
    expect(problems(await runCatalogCheck(config()))).toEqual([
      `DODO_WEBHOOK_SECRET isn't the signing secret of webhook endpoint ${ENDPOINT_ID}: copy it from the endpoint, or run scripts/dodo-setup.ts. Test and live mode endpoints have different secrets.`,
    ]);
  });

  it("asks once for an id two variables share, and skips ids that aren't product ids", async () => {
    const fetchStub = serve();
    await runCatalogCheck(
      config({
        productIds: {
          ...IDS,
          DODO_PRO_TRIAL_PRODUCT_ID: IDS.DODO_PRO_MONTHLY_PRODUCT_ID,
          DODO_MAX_YEARLY_PRODUCT_ID: "not-a-product-id",
        },
      }),
    );
    const productReads = fetchStub.mock.calls.filter(([url]) =>
      new URL(String(url)).pathname.startsWith("/products/"),
    );
    expect(productReads).toHaveLength(3);
  });

  it("reports a product the mode's catalog doesn't have", async () => {
    serve({
      products: Object.values(goodProducts()).filter(
        (product) => product.product_id !== IDS.DODO_MAX_YEARLY_PRODUCT_ID,
      ),
    });
    expect(problems(await runCatalogCheck(config()))).toEqual([
      `Max yearly (${IDS.DODO_MAX_YEARLY_PRODUCT_ID}): not in the test mode catalog. Copy it from test mode; test and live ids differ.`,
    ]);
  });

  it("doesn't read the secret without an endpoint or a secret to compare", async () => {
    const secretReads = (stub: ReturnType<typeof serve>) =>
      stub.mock.calls.filter(([url]) => String(url).endsWith("/secret"));
    const noEndpoint = serve({ endpoints: [] });
    await runCatalogCheck(config());
    expect(secretReads(noEndpoint)).toHaveLength(0);
    const noSecret = serve();
    const withoutSecret = await runCatalogCheck(config({ webhookSecret: undefined }));
    expect(secretReads(noSecret)).toHaveLength(0);
    expect(problems(withoutSecret)).toEqual([
      "DODO_WEBHOOK_SECRET is not set: billing stays off without it.",
    ]);
  });

  it("sends nothing when the key is missing or belongs to the other mode", async () => {
    const fetchStub = serve();
    await runCatalogCheck(config({ apiKey: undefined }));
    await runCatalogCheck(config({ environment: "live" }));
    await runCatalogCheck(config({ apiKey: "sk_live_x" }));
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it("checks the env the app runs with", async () => {
    vi.stubEnv("DODO_ENVIRONMENT", " Live_Mode ");
    vi.stubEnv("DODO_API_KEY", "dodo_live_x");
    vi.stubEnv("DODO_WEBHOOK_SECRET", WEBHOOK_SECRET);
    vi.stubEnv("BILLING_SIGNING_SECRET", SIGNING_SECRET);
    for (const [name, id] of Object.entries(IDS)) vi.stubEnv(name, id);
    vi.stubEnv("DODO_MAX_YEARLY_PRODUCT_ID", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://www.ottosensei.com/");
    resetEnvForTests();
    expect(catalogConfig()).toEqual({
      environment: "live",
      apiKey: "dodo_live_x",
      webhookSecret: WEBHOOK_SECRET,
      signingSecret: SIGNING_SECRET,
      productIds: { ...IDS, DODO_MAX_YEARLY_PRODUCT_ID: undefined },
      appUrl: APP,
    });
    const fetchStub = serve();
    expect(problems(await runCatalogCheck())).toEqual([]);
    expect(String(fetchStub.mock.calls[0]?.[0])).toMatch(/^https:\/\/live\.dodopayments\.com\//);
  });

  it("checks the webhook URL the setup used, then the app's, then the default", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    resetEnvForTests();
    expect(catalogConfig().appUrl).toBe(DEFAULT_APP_URL);
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "staging.example.com/");
    resetEnvForTests();
    expect(catalogConfig().appUrl).toBe("https://staging.example.com");
    expect(catalogConfig({ appUrl: "  " }).appUrl).toBe("https://staging.example.com");
    expect(catalogConfig({ appUrl: " https://preview.example.com// " }).appUrl).toBe(
      "https://preview.example.com",
    );
  });
});

describe("the credit product", () => {
  const TOPUP_ID = dodoId("pdt", "Topup");
  const topup = (change: Change = {}): DodoProduct => {
    const spec = topupSpec();
    const base: DodoProduct = {
      product_id: TOPUP_ID,
      name: spec.name,
      tax_category: spec.tax_category,
      metadata: spec.metadata,
      addons: [],
      pricing_mode: null,
      price: {
        type: spec.price.type,
        currency: spec.price.currency,
        price: spec.price.price,
        payment_frequency_count: null,
        payment_frequency_interval: null,
        subscription_period_count: null,
        subscription_period_interval: null,
        discount: null,
        discount_bps: 0,
        purchasing_power_parity: false,
        pay_what_you_want: false,
        tax_inclusive: false,
        trial_period_days: null,
        trial_amount: null,
        trial_payment_method_optional: null,
      },
    };
    return { ...base, ...change, price: { ...base.price, ...change.price } };
  };
  const withTopup = (product: DodoProduct): CatalogReads => {
    const all = reads();
    return { ...all, products: new Map([...all.products, [TOPUP_ID, { found: true, product }]]) };
  };

  it("is a plain one-time $1.00 the setup script makes and finds again by its tag", () => {
    expect(topupSpec().price).toMatchObject({
      type: "one_time_price",
      price: 100,
      currency: "USD",
    });
    expect(topupTagged(topupSpec().metadata)).toBe(true);
    expect(topupTagged(productSpec(slotFor("DODO_PRO_MONTHLY_PRODUCT_ID")).metadata)).toBe(false);
    expect(topupProblems(topup())).toEqual([]);
  });

  it("names what would make the quantity buy the wrong amount", () => {
    expect(topupProblems(topup({ price: { price: 500 } }))).toEqual([
      "it costs USD 5.00, but the app sells credit as USD 1.00 times the dollars chosen",
    ]);
    expect(topupProblems(topup({ price: { pay_what_you_want: true } }))).toEqual([
      "it lets the buyer pick the amount: turn pay what you want off, the app sets it",
    ]);
    expect(topupProblems(topup({ price: { type: "recurring_price" } }))).toEqual([
      "it is a subscription, not a one-time price",
    ]);
    expect(topupProblems(topup({ price: { tax_inclusive: true } }))).toHaveLength(1);
  });

  it("is checked only once its id is set, and never shares a plan's product", () => {
    expect(validateCatalog(config(), reads())).toEqual(validateCatalog(config(), reads()));
    const checks = validateCatalog(config({ topupProductId: TOPUP_ID }), withTopup(topup()));
    expect(problems(checks)).toEqual([]);
    expect(notes(checks)).toContain(
      `Credit (${TOPUP_ID}): USD 1.00 once, plus tax, bought once per dollar.`,
    );
    const shared = validateCatalog(
      config({ topupProductId: IDS.DODO_PRO_MONTHLY_PRODUCT_ID }),
      reads(),
    );
    expect(problems(shared)).toContain(
      "DODO_PRO_MONTHLY_PRODUCT_ID and DODO_TOPUP_PRODUCT_ID hold the same product id: each needs its own product.",
    );
    const bad = validateCatalog(
      config({ topupProductId: TOPUP_ID }),
      withTopup(topup({ price: { pay_what_you_want: true } })),
    );
    expect(problems(bad)).toEqual([
      `Credit (${TOPUP_ID}): it lets the buyer pick the amount: turn pay what you want off, the app sets it.`,
    ]);
  });
});
