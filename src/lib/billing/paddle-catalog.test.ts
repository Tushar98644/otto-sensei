import { afterEach, describe, expect, it, vi } from "vitest";
import { PRICES_USD, PRO_TRIAL } from "@/config/plans";
import { resetEnvForTests } from "@/lib/env";
import {
  canReadPrices,
  catalogConfig,
  checkCatalog,
  readPaddlePrice,
  runCatalogCheck,
  type CatalogConfig,
  type CatalogPrice,
  type PriceLookup,
} from "./paddle-catalog";

const paddleId = (prefix: string, name: string) => `${prefix}_${name.padEnd(26, "0")}`;

const IDS = {
  PADDLE_PRO_MONTHLY_PRICE_ID: paddleId("pri", "promonthly"),
  PADDLE_PRO_TRIAL_PRICE_ID: paddleId("pri", "protrial"),
  PADDLE_PRO_YEARLY_PRICE_ID: paddleId("pri", "proyearly"),
  PADDLE_MAX_MONTHLY_PRICE_ID: paddleId("pri", "maxmonthly"),
  PADDLE_MAX_YEARLY_PRICE_ID: paddleId("pri", "maxyearly"),
};
const PRO_PRODUCT = paddleId("pro", "pro");
const MAX_PRODUCT = paddleId("pro", "max");

const cents = (usd: number) => String(Math.round(usd * 100));
const dollars = (usd: number) => `USD ${usd.toFixed(2)}`;

function config(overrides: Partial<CatalogConfig> = {}): CatalogConfig {
  return {
    environment: "sandbox",
    apiKey: "pdl_sdbx_apikey_secretvalue",
    clientToken: "test_clienttoken",
    priceIds: { ...IDS },
    ...overrides,
  };
}

const PRODUCT_NAMES: Record<string, string> = {
  [PRO_PRODUCT]: "Otto Sensei Pro",
  [MAX_PRODUCT]: "Otto Sensei Max",
};

function recurring(
  id: string,
  product: string,
  interval: "month" | "year",
  usd: number,
): CatalogPrice {
  return {
    id,
    product_id: product,
    status: "active",
    billing_cycle: { interval, frequency: 1 },
    trial_period: null,
    unit_price: { amount: cents(usd), currency_code: "USD" },
    unit_price_overrides: [],
    tax_mode: "external",
    product: { name: PRODUCT_NAMES[product] ?? "Other", status: "active", tax_category: "saas" },
  };
}

const TRIAL_CHARGE = String(Math.round(PRO_TRIAL.priceUsd * 100));

function goodPrices(): Record<keyof typeof IDS, CatalogPrice> {
  return {
    PADDLE_PRO_MONTHLY_PRICE_ID: recurring(
      IDS.PADDLE_PRO_MONTHLY_PRICE_ID,
      PRO_PRODUCT,
      "month",
      PRICES_USD.pro.month,
    ),
    PADDLE_PRO_TRIAL_PRICE_ID: {
      ...recurring(IDS.PADDLE_PRO_TRIAL_PRICE_ID, PRO_PRODUCT, "month", PRICES_USD.pro.month),
      trial_period: {
        interval: "day",
        frequency: PRO_TRIAL.days,
        requires_payment_method: true,
        unit_price: { amount: TRIAL_CHARGE, currency_code: "USD" },
      },
    },
    PADDLE_PRO_YEARLY_PRICE_ID: recurring(
      IDS.PADDLE_PRO_YEARLY_PRICE_ID,
      PRO_PRODUCT,
      "year",
      PRICES_USD.pro.year,
    ),
    PADDLE_MAX_MONTHLY_PRICE_ID: recurring(
      IDS.PADDLE_MAX_MONTHLY_PRICE_ID,
      MAX_PRODUCT,
      "month",
      PRICES_USD.max.month,
    ),
    PADDLE_MAX_YEARLY_PRICE_ID: recurring(
      IDS.PADDLE_MAX_YEARLY_PRICE_ID,
      MAX_PRODUCT,
      "year",
      PRICES_USD.max.year,
    ),
  };
}

function lookups(
  changes: Partial<Record<keyof typeof IDS, Partial<CatalogPrice>>> = {},
): Map<string, PriceLookup> {
  const prices = goodPrices();
  return new Map(
    Object.entries(prices).map(([variable, price]) => [
      price.id,
      { found: true, price: { ...price, ...changes[variable as keyof typeof IDS] } },
    ]),
  );
}

const problems = (checks: { ok: boolean; message: string }[]) =>
  checks.filter((check) => !check.ok).map((check) => check.message);

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("checkCatalog", () => {
  it("passes a catalog that matches the app, one line per price", () => {
    const checks = checkCatalog(config(), lookups());
    expect(problems(checks)).toEqual([]);
    expect(checks.map((check) => check.message)).toEqual([
      "Environment: sandbox (PADDLE_ENVIRONMENT, the API key and the client token agree).",
      `Pro monthly (${IDS.PADDLE_PRO_MONTHLY_PRICE_ID}): active, ${dollars(PRICES_USD.pro.month)} every month plus tax, no trial.`,
      `Pro trial (${IDS.PADDLE_PRO_TRIAL_PRICE_ID}): active, ${dollars(PRICES_USD.pro.month)} every month plus tax, after a ${PRO_TRIAL.days}-day trial charging ${dollars(PRO_TRIAL.priceUsd)}, card required.`,
      `Pro yearly (${IDS.PADDLE_PRO_YEARLY_PRICE_ID}): active, ${dollars(PRICES_USD.pro.year)} every year plus tax, no trial.`,
      `Max monthly (${IDS.PADDLE_MAX_MONTHLY_PRICE_ID}): active, ${dollars(PRICES_USD.max.month)} every month plus tax, no trial.`,
      `Max yearly (${IDS.PADDLE_MAX_YEARLY_PRICE_ID}): active, ${dollars(PRICES_USD.max.year)} every year plus tax, no trial.`,
      `Products: Pro on ${PRO_PRODUCT} and Max on ${MAX_PRODUCT}, active, tax category SaaS.`,
    ]);
  });

  it("passes a live setup whose key, token and environment are all live", () => {
    const checks = checkCatalog(
      config({ environment: "live", apiKey: "pdl_live_apikey_x", clientToken: "live_x" }),
      lookups(),
    );
    expect(problems(checks)).toEqual([]);
    expect(checks[0]?.message).toMatch(/^Environment: live /);
  });

  it("never prints the key or the client token", () => {
    const text = [
      ...checkCatalog(config(), lookups()),
      ...checkCatalog(config({ environment: "live" }), null),
      ...checkCatalog(
        config({ apiKey: "pdl_sdbx_secretvalue ", clientToken: "x_clienttoken" }),
        null,
      ),
    ]
      .map((check) => check.message)
      .join("\n");
    expect(text).not.toContain("secretvalue");
    expect(text).not.toContain("clienttoken");
  });

  it("reports an archived price", () => {
    const checks = checkCatalog(
      config(),
      lookups({ PADDLE_PRO_YEARLY_PRICE_ID: { status: "archived" } }),
    );
    expect(problems(checks)).toEqual([
      `Pro yearly (${IDS.PADDLE_PRO_YEARLY_PRICE_ID}): it is archived, not active.`,
    ]);
  });

  it("reports a one-time price and a price that bills on the wrong cycle", () => {
    const checks = checkCatalog(
      config(),
      lookups({
        PADDLE_MAX_MONTHLY_PRICE_ID: { billing_cycle: null },
        PADDLE_MAX_YEARLY_PRICE_ID: { billing_cycle: { interval: "month", frequency: 12 } },
        PADDLE_PRO_YEARLY_PRICE_ID: { billing_cycle: { interval: "month", frequency: 1 } },
      }),
    );
    expect(problems(checks)).toEqual([
      `Pro yearly (${IDS.PADDLE_PRO_YEARLY_PRICE_ID}): it bills every month, not every year.`,
      `Max monthly (${IDS.PADDLE_MAX_MONTHLY_PRICE_ID}): it is a one-time price, not a subscription.`,
      `Max yearly (${IDS.PADDLE_MAX_YEARLY_PRICE_ID}): it bills every 12 months, not every year.`,
    ]);
  });

  it("reports a price in another currency or for another amount", () => {
    const checks = checkCatalog(
      config(),
      lookups({
        PADDLE_PRO_MONTHLY_PRICE_ID: {
          unit_price: { amount: cents(PRICES_USD.pro.month), currency_code: "EUR" },
        },
        PADDLE_MAX_YEARLY_PRICE_ID: { unit_price: { amount: "100", currency_code: "USD" } },
      }),
    );
    expect(problems(checks)).toEqual([
      `Pro monthly (${IDS.PADDLE_PRO_MONTHLY_PRICE_ID}): it is in EUR, not USD.`,
      `Max yearly (${IDS.PADDLE_MAX_YEARLY_PRICE_ID}): it costs USD 1.00, but the app shows ${dollars(PRICES_USD.max.year)} (PRICES_USD in src/config/plans.ts).`,
    ]);
  });

  it("wants the trial price to cost what Pro monthly costs", () => {
    const checks = checkCatalog(
      config(),
      lookups({
        PADDLE_PRO_TRIAL_PRICE_ID: {
          unit_price: { amount: cents(PRICES_USD.pro.year), currency_code: "USD" },
        },
      }),
    );
    expect(problems(checks)).toEqual([
      `Pro trial (${IDS.PADDLE_PRO_TRIAL_PRICE_ID}): it costs ${dollars(PRICES_USD.pro.year)}, but the app shows ${dollars(PRICES_USD.pro.month)} (PRICES_USD in src/config/plans.ts).`,
    ]);
  });

  it("reports a trial price without a trial", () => {
    const checks = checkCatalog(
      config(),
      lookups({ PADDLE_PRO_TRIAL_PRICE_ID: { trial_period: null } }),
    );
    expect(problems(checks)).toEqual([
      `Pro trial (${IDS.PADDLE_PRO_TRIAL_PRICE_ID}): it has no trial; it needs a ${PRO_TRIAL.days}-day trial.`,
    ]);
  });

  it("reports a trial of the wrong length, one without a card, and one that charges the wrong amount", () => {
    const checks = checkCatalog(
      config(),
      lookups({
        PADDLE_PRO_TRIAL_PRICE_ID: {
          trial_period: {
            interval: "week",
            frequency: 1,
            requires_payment_method: false,
            unit_price: { amount: "250", currency_code: "USD" },
          },
        },
      }),
    );
    const where = `Pro trial (${IDS.PADDLE_PRO_TRIAL_PRICE_ID})`;
    expect(problems(checks)).toEqual([
      `${where}: its trial is 1 week, not ${PRO_TRIAL.days} days (PRO_TRIAL in src/config/plans.ts).`,
      `${where}: its trial doesn't ask for a card; it must (payment method required).`,
      `${where}: it charges USD 2.50 during the trial, not ${dollars(PRO_TRIAL.priceUsd)}.`,
    ]);
  });

  it("accepts a trial that leaves the card rule to Paddle's default", () => {
    const checks = checkCatalog(
      config(),
      lookups({
        PADDLE_PRO_TRIAL_PRICE_ID: {
          trial_period: {
            interval: "day",
            frequency: PRO_TRIAL.days,
            requires_payment_method: null,
            unit_price: { amount: TRIAL_CHARGE, currency_code: "USD" },
          },
        },
      }),
    );
    expect(problems(checks)).toEqual([]);
  });

  it("reports a free trial now that the trial costs money", () => {
    const checks = checkCatalog(
      config(),
      lookups({
        PADDLE_PRO_TRIAL_PRICE_ID: {
          trial_period: {
            interval: "day",
            frequency: PRO_TRIAL.days,
            requires_payment_method: true,
            unit_price: null,
          },
        },
      }),
    );
    expect(problems(checks)).toEqual([
      `Pro trial (${IDS.PADDLE_PRO_TRIAL_PRICE_ID}): it charges USD 0.00 during the trial, not ${dollars(PRO_TRIAL.priceUsd)}.`,
    ]);
  });

  it("reports a trial on a price that isn't the trial price", () => {
    const checks = checkCatalog(
      config(),
      lookups({
        PADDLE_MAX_MONTHLY_PRICE_ID: {
          trial_period: {
            interval: "day",
            frequency: 7,
            requires_payment_method: true,
            unit_price: null,
          },
        },
      }),
    );
    expect(problems(checks)).toEqual([
      `Max monthly (${IDS.PADDLE_MAX_MONTHLY_PRICE_ID}): it has a 7-day trial; only PADDLE_PRO_TRIAL_PRICE_ID should.`,
    ]);
  });

  it("reports two variables holding the same price id", () => {
    const checks = checkCatalog(
      config({
        priceIds: { ...IDS, PADDLE_PRO_TRIAL_PRICE_ID: IDS.PADDLE_PRO_MONTHLY_PRICE_ID },
      }),
      lookups(),
    );
    expect(problems(checks)).toEqual([
      `Pro trial (${IDS.PADDLE_PRO_MONTHLY_PRICE_ID}): it has no trial; it needs a ${PRO_TRIAL.days}-day trial.`,
      "PADDLE_PRO_MONTHLY_PRICE_ID and PADDLE_PRO_TRIAL_PRICE_ID hold the same price id: each needs its own price.",
    ]);
  });

  it("reports a plan whose prices sit on different products", () => {
    const other = paddleId("pro", "other");
    const checks = checkCatalog(
      config(),
      lookups({ PADDLE_PRO_YEARLY_PRICE_ID: { product_id: other } }),
    );
    expect(problems(checks)).toEqual([
      `Pro prices are on different products (${PRO_PRODUCT} and ${other}): put every Pro price on one product.`,
    ]);
  });

  it("reports Pro and Max prices on one product", () => {
    const onPro = {
      product_id: PRO_PRODUCT,
      product: goodPrices().PADDLE_PRO_MONTHLY_PRICE_ID.product,
    };
    const checks = checkCatalog(
      config(),
      lookups({ PADDLE_MAX_MONTHLY_PRICE_ID: onPro, PADDLE_MAX_YEARLY_PRICE_ID: onPro }),
    );
    expect(problems(checks)).toEqual([
      `Pro and Max prices share a product (${PRO_PRODUCT}): each plan needs its own product.`,
    ]);
  });

  it("wants every price to add tax on top", () => {
    const checks = checkCatalog(
      config(),
      lookups({
        PADDLE_PRO_MONTHLY_PRICE_ID: { tax_mode: "account_setting" },
        PADDLE_PRO_TRIAL_PRICE_ID: { tax_mode: "internal" },
        PADDLE_PRO_YEARLY_PRICE_ID: { tax_mode: "location" },
        PADDLE_MAX_MONTHLY_PRICE_ID: { tax_mode: "something_new" },
      }),
    );
    const fix =
      "set the price's tax to excluding tax: the pricing page and the terms add tax on top.";
    expect(problems(checks)).toEqual([
      `Pro monthly (${IDS.PADDLE_PRO_MONTHLY_PRICE_ID}): it uses the account's tax setting; ${fix}`,
      `Pro trial (${IDS.PADDLE_PRO_TRIAL_PRICE_ID}): its price includes tax; ${fix}`,
      `Pro yearly (${IDS.PADDLE_PRO_YEARLY_PRICE_ID}): its price includes tax in some countries; ${fix}`,
      `Max monthly (${IDS.PADDLE_MAX_MONTHLY_PRICE_ID}): its tax mode is something_new; ${fix}`,
    ]);
  });

  it("reports country prices, which the app's one USD price doesn't show", () => {
    const checks = checkCatalog(
      config(),
      lookups({
        PADDLE_PRO_MONTHLY_PRICE_ID: {
          unit_price_overrides: [
            { country_codes: ["DE", "FR"], unit_price: { amount: "1500", currency_code: "EUR" } },
            { country_codes: ["FR"], unit_price: { amount: "1400", currency_code: "EUR" } },
          ],
        },
        PADDLE_MAX_YEARLY_PRICE_ID: {
          unit_price_overrides: [
            { country_codes: ["IN"], unit_price: { amount: "1000", currency_code: "USD" } },
          ],
        },
      }),
    );
    expect(problems(checks)).toEqual([
      `Pro monthly (${IDS.PADDLE_PRO_MONTHLY_PRICE_ID}): it has its own price in 2 countries, but the app shows one USD price everywhere: remove the country prices.`,
      `Max yearly (${IDS.PADDLE_MAX_YEARLY_PRICE_ID}): it has its own price in 1 country, but the app shows one USD price everywhere: remove the country prices.`,
    ]);
  });

  it("reports an archived product, a tax category other than SaaS, and products named for the wrong plan", () => {
    const pro = goodPrices().PADDLE_PRO_MONTHLY_PRICE_ID.product;
    const max = goodPrices().PADDLE_MAX_MONTHLY_PRICE_ID.product;
    const swapped = {
      pro: { ...max, status: "archived" },
      max: { ...pro, tax_category: "standard" },
    };
    const checks = checkCatalog(
      config(),
      lookups({
        PADDLE_PRO_MONTHLY_PRICE_ID: { product: swapped.pro },
        PADDLE_PRO_TRIAL_PRICE_ID: { product: swapped.pro },
        PADDLE_PRO_YEARLY_PRICE_ID: { product: swapped.pro },
        PADDLE_MAX_MONTHLY_PRICE_ID: { product: swapped.max },
        PADDLE_MAX_YEARLY_PRICE_ID: { product: swapped.max },
      }),
    );
    expect(problems(checks)).toEqual([
      `Product ${PRO_PRODUCT} is archived, so its prices can't be bought: make it active.`,
      `Product ${PRO_PRODUCT} holds the Pro prices but is called "Otto Sensei Max": buyers see that name, so name it for Pro.`,
      `Product ${MAX_PRODUCT} has tax category standard: set it to SaaS.`,
      `Product ${MAX_PRODUCT} holds the Max prices but is called "Otto Sensei Pro": buyers see that name, so name it for Max.`,
    ]);
  });

  it("wants a product name that names its plan and no other", () => {
    const named = (name: string) => ({
      product: { ...goodPrices().PADDLE_PRO_MONTHLY_PRICE_ID.product, name },
    });
    const pro = (name: string) =>
      problems(
        checkCatalog(
          config(),
          lookups({
            PADDLE_PRO_MONTHLY_PRICE_ID: named(name),
            PADDLE_PRO_TRIAL_PRICE_ID: named(name),
            PADDLE_PRO_YEARLY_PRICE_ID: named(name),
          }),
        ),
      );
    expect(pro("PRO plan (Otto Sensei)")).toEqual([]);
    expect(pro("Otto Sensei")).toHaveLength(1);
    expect(pro("Otto Sensei Pro and Max")).toHaveLength(1);
    expect(pro("Otto Sensei Professional")).toHaveLength(1);
  });

  it("needs Pro monthly, notes the optional prices that aren't set, and wants one Max price", () => {
    const checks = checkCatalog(
      config({ priceIds: { PADDLE_PRO_YEARLY_PRICE_ID: IDS.PADDLE_PRO_YEARLY_PRICE_ID } }),
      lookups(),
    );
    expect(problems(checks)).toEqual([
      "Pro monthly: PADDLE_PRO_MONTHLY_PRICE_ID is not set: checkout stays off without it.",
      "Max: neither PADDLE_MAX_MONTHLY_PRICE_ID nor PADDLE_MAX_YEARLY_PRICE_ID is set, so Max isn't offered.",
    ]);
    const notes = checks.filter((check) => check.ok).map((check) => check.message);
    expect(notes).toContain(
      "Pro trial: PADDLE_PRO_TRIAL_PRICE_ID is not set, so there is no trial.",
    );
    expect(notes).toContain(
      "Max yearly: PADDLE_MAX_YEARLY_PRICE_ID is not set, so Max yearly isn't offered.",
    );
  });

  it("reports ids that can't be Paddle price ids without echoing them", () => {
    const checks = checkCatalog(
      config({
        priceIds: {
          ...IDS,
          PADDLE_PRO_MONTHLY_PRICE_ID: `${IDS.PADDLE_PRO_MONTHLY_PRICE_ID}\n`,
          PADDLE_PRO_YEARLY_PRICE_ID: PRO_PRODUCT,
          PADDLE_MAX_YEARLY_PRICE_ID: "not-a-price-id",
        },
      }),
      lookups(),
    );
    expect(problems(checks)).toEqual([
      "Pro monthly: PADDLE_PRO_MONTHLY_PRICE_ID has a space or line break around the id: remove it.",
      "Pro yearly: PADDLE_PRO_YEARLY_PRICE_ID holds a product id (pro_...): copy the price id (pri_...).",
      "Max yearly: PADDLE_MAX_YEARLY_PRICE_ID isn't a Paddle price id: it should be pri_ followed by 26 letters and digits.",
    ]);
    expect(problems(checks).join("\n")).not.toContain("not-a-price-id");
  });

  it("explains each way reading a price can fail, once per cause", () => {
    const failures = new Map<string, PriceLookup>([
      [IDS.PADDLE_PRO_MONTHLY_PRICE_ID, { found: false, reason: "not_found" }],
      [IDS.PADDLE_PRO_TRIAL_PRICE_ID, { found: false, reason: "timeout" }],
      [IDS.PADDLE_PRO_YEARLY_PRICE_ID, { found: false, reason: "network" }],
      [IDS.PADDLE_MAX_MONTHLY_PRICE_ID, { found: false, reason: "http", status: 500 }],
      [IDS.PADDLE_MAX_YEARLY_PRICE_ID, { found: false, reason: "unexpected" }],
    ]);
    expect(problems(checkCatalog(config(), failures))).toEqual([
      `Pro monthly (${IDS.PADDLE_PRO_MONTHLY_PRICE_ID}): not in the sandbox catalog. Copy it from the sandbox account; sandbox and live ids differ.`,
      `Pro trial (${IDS.PADDLE_PRO_TRIAL_PRICE_ID}): Paddle didn't answer within 8 seconds. Try again.`,
      `Pro yearly (${IDS.PADDLE_PRO_YEARLY_PRICE_ID}): Paddle couldn't be reached. Check the connection and try again.`,
      `Max monthly (${IDS.PADDLE_MAX_MONTHLY_PRICE_ID}): Paddle answered HTTP 500. Try again.`,
      `Max yearly (${IDS.PADDLE_MAX_YEARLY_PRICE_ID}): Paddle's answer wasn't a price this check can read.`,
    ]);

    const refused = (reason: "unauthorized" | "forbidden") =>
      new Map<string, PriceLookup>(Object.values(IDS).map((id) => [id, { found: false, reason }]));
    expect(problems(checkCatalog(config(), refused("unauthorized")))).toEqual([
      "Paddle refused the API key (HTTP 401): it may have expired or been revoked.",
    ]);
    expect(problems(checkCatalog(config(), refused("forbidden")))).toEqual([
      "The API key can't read the catalog (HTTP 403): give it Prices read and Products read.",
    ]);
  });

  it("says the prices weren't read when the key can't read them", () => {
    expect(problems(checkCatalog(config({ apiKey: undefined }), null))).toEqual([
      "PADDLE_API_KEY is not set: no price can be read without it.",
      "Prices weren't read from Paddle: fix the API key and environment first.",
    ]);
  });
});

describe("environment checks", () => {
  it("reports a key, a token and PADDLE_ENVIRONMENT that disagree", () => {
    const mixed = config({
      environment: "live",
      apiKey: "pdl_sdbx_apikey_x",
      clientToken: "live_x",
    });
    expect(canReadPrices(mixed)).toBe(false);
    expect(problems(checkCatalog(mixed, null))).toEqual([
      "Environments disagree: PADDLE_ENVIRONMENT is live, the API key is sandbox and the client token is live. Use one account's values; only live or production in PADDLE_ENVIRONMENT selects live.",
      "Prices weren't read from Paddle: fix the API key and environment first.",
    ]);
  });

  it("reports a client token from the other environment, though the prices can still be read", () => {
    const mixed = config({ clientToken: "live_x" });
    expect(canReadPrices(mixed)).toBe(true);
    expect(problems(checkCatalog(mixed, lookups()))).toEqual([
      "Environments disagree: PADDLE_ENVIRONMENT is sandbox, the API key is sandbox and the client token is live. Use one account's values; only live or production in PADDLE_ENVIRONMENT selects live.",
    ]);
  });

  it("reports missing, padded and unrecognised credentials", () => {
    expect(
      problems(checkCatalog(config({ apiKey: "legacykey", clientToken: undefined }), null)),
    ).toEqual([
      "PADDLE_API_KEY doesn't look right: it should start with pdl_sdbx_ (sandbox) or pdl_live_ (live).",
      "NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is not set: checkout stays off without it.",
      "Prices weren't read from Paddle: fix the API key and environment first.",
    ]);
    expect(
      problems(checkCatalog(config({ apiKey: " pdl_sdbx_apikey_x", clientToken: "pk_x" }), null)),
    ).toEqual([
      "PADDLE_API_KEY has a space or line break around it: remove it.",
      "NEXT_PUBLIC_PADDLE_CLIENT_TOKEN doesn't look right: it should start with test_ (sandbox) or live_ (live).",
      "Prices weren't read from Paddle: fix the API key and environment first.",
    ]);
  });
});

function priceBody(price: CatalogPrice & Record<string, unknown>) {
  return new Response(JSON.stringify({ data: price, meta: { request_id: "req_1" } }), {
    status: 200,
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

describe("readPaddlePrice", () => {
  const access = { apiKey: "pdl_sdbx_apikey_x", environment: "sandbox" as const };

  it("reads one price and its product with a GET to the environment's API, keeping only what the check needs", async () => {
    const good = goodPrices().PADDLE_PRO_MONTHLY_PRICE_ID;
    const product = { ...good.product, id: PRO_PRODUCT, image_url: null, custom_data: null };
    const fetchStub = stubFetch(() =>
      priceBody({
        ...good,
        description: "Pro monthly",
        quantity: { minimum: 1, maximum: 100 },
        product,
      }),
    );
    expect(await readPaddlePrice(IDS.PADDLE_PRO_MONTHLY_PRICE_ID, access)).toEqual({
      found: true,
      price: good,
    });
    expect(fetchStub).toHaveBeenCalledTimes(1);
    const [url, init] = fetchStub.mock.calls[0] ?? [];
    expect(String(url)).toBe(
      `https://sandbox-api.paddle.com/prices/${IDS.PADDLE_PRO_MONTHLY_PRICE_ID}?include=product`,
    );
    expect(init?.method).toBe("GET");
    expect(init?.body).toBeUndefined();
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer pdl_sdbx_apikey_x");
    expect(new Headers(init?.headers).get("paddle-version")).toBe("1");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("uses the live API for live, and fills in what Paddle leaves out", async () => {
    const fetchStub = stubFetch(
      () =>
        new Response(
          JSON.stringify({
            data: {
              id: IDS.PADDLE_PRO_TRIAL_PRICE_ID,
              product_id: PRO_PRODUCT,
              status: "active",
              billing_cycle: { interval: "month", frequency: 1 },
              trial_period: { interval: "day", frequency: 3 },
              unit_price: { amount: "1500", currency_code: "USD" },
              unit_price_overrides: null,
              tax_mode: "external",
              product: { name: "Otto Sensei Pro", status: "active", tax_category: "saas" },
            },
          }),
        ),
    );
    const lookup = await readPaddlePrice(IDS.PADDLE_PRO_TRIAL_PRICE_ID, {
      apiKey: "pdl_live_apikey_x",
      environment: "live",
    });
    expect(String(fetchStub.mock.calls[0]?.[0])).toBe(
      `https://api.paddle.com/prices/${IDS.PADDLE_PRO_TRIAL_PRICE_ID}?include=product`,
    );
    expect(lookup).toEqual({
      found: true,
      price: expect.objectContaining({
        trial_period: {
          interval: "day",
          frequency: 3,
          requires_payment_method: null,
          unit_price: null,
        },
        unit_price_overrides: [],
      }),
    });
  });

  it("turns Paddle's refusals into reasons", async () => {
    for (const [status, expected] of [
      [404, { found: false, reason: "not_found" }],
      [401, { found: false, reason: "unauthorized" }],
      [403, { found: false, reason: "forbidden" }],
      [429, { found: false, reason: "http", status: 429 }],
      [500, { found: false, reason: "http", status: 500 }],
    ] as const) {
      stubFetch(() => new Response(JSON.stringify({ error: { code: "x" } }), { status }));
      expect(await readPaddlePrice(IDS.PADDLE_PRO_MONTHLY_PRICE_ID, access)).toEqual(expected);
    }
  });

  it("reports an answer it can't read, a network failure and a timeout", async () => {
    const unexpected = { found: false, reason: "unexpected" };
    stubFetch(() => new Response(JSON.stringify({ data: { id: "pri_x" } })));
    expect(await readPaddlePrice(IDS.PADDLE_PRO_MONTHLY_PRICE_ID, access)).toEqual(unexpected);
    const withoutProduct: Partial<CatalogPrice> = { ...goodPrices().PADDLE_PRO_MONTHLY_PRICE_ID };
    delete withoutProduct.product;
    stubFetch(() => new Response(JSON.stringify({ data: withoutProduct })));
    expect(await readPaddlePrice(IDS.PADDLE_PRO_MONTHLY_PRICE_ID, access)).toEqual(unexpected);
    stubFetch(() => new Response("not json"));
    expect(await readPaddlePrice(IDS.PADDLE_PRO_MONTHLY_PRICE_ID, access)).toEqual(unexpected);
    stubFetch(() => Promise.reject(new TypeError("fetch failed")));
    expect(await readPaddlePrice(IDS.PADDLE_PRO_MONTHLY_PRICE_ID, access)).toEqual({
      found: false,
      reason: "network",
    });
    stubFetch(() => Promise.reject(new DOMException("timed out", "TimeoutError")));
    expect(await readPaddlePrice(IDS.PADDLE_PRO_MONTHLY_PRICE_ID, access)).toEqual({
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
              controller.enqueue(new TextEncoder().encode('{"data":'));
              controller.error(new DOMException("timed out", "TimeoutError"));
            },
          }),
        ),
    );
    expect(await readPaddlePrice(IDS.PADDLE_PRO_MONTHLY_PRICE_ID, access)).toEqual({
      found: false,
      reason: "timeout",
    });
  });
});

describe("runCatalogCheck", () => {
  function servePrices(prices: CatalogPrice[]) {
    return stubFetch((url) => {
      const price = prices.find((candidate) => url.pathname === `/prices/${candidate.id}`);
      return price ? priceBody(price) : new Response("{}", { status: 404 });
    });
  }

  it("reads each configured price once and passes a matching catalog", async () => {
    const fetchStub = servePrices(Object.values(goodPrices()));
    const checks = await runCatalogCheck(config());
    expect(problems(checks)).toEqual([]);
    expect(fetchStub.mock.calls.every(([, init]) => init?.method === "GET")).toBe(true);
    expect(
      fetchStub.mock.calls.every(([url]) => new URL(String(url)).search === "?include=product"),
    ).toBe(true);
    expect(fetchStub.mock.calls.map(([url]) => new URL(String(url)).pathname).sort()).toEqual(
      Object.values(IDS)
        .map((id) => `/prices/${id}`)
        .sort(),
    );
  });

  it("asks once for an id two variables share, and skips ids that aren't price ids", async () => {
    const fetchStub = servePrices(Object.values(goodPrices()));
    await runCatalogCheck(
      config({
        priceIds: {
          ...IDS,
          PADDLE_PRO_TRIAL_PRICE_ID: IDS.PADDLE_PRO_MONTHLY_PRICE_ID,
          PADDLE_MAX_YEARLY_PRICE_ID: MAX_PRODUCT,
        },
      }),
    );
    expect(fetchStub).toHaveBeenCalledTimes(3);
  });

  it("reports a price the environment's catalog doesn't have", async () => {
    servePrices(
      Object.values(goodPrices()).filter((price) => price.id !== IDS.PADDLE_MAX_YEARLY_PRICE_ID),
    );
    expect(problems(await runCatalogCheck(config()))).toEqual([
      `Max yearly (${IDS.PADDLE_MAX_YEARLY_PRICE_ID}): not in the sandbox catalog. Copy it from the sandbox account; sandbox and live ids differ.`,
    ]);
  });

  it("sends nothing when the key is missing or belongs to the other environment", async () => {
    const fetchStub = servePrices(Object.values(goodPrices()));
    await runCatalogCheck(config({ apiKey: undefined }));
    await runCatalogCheck(config({ environment: "live" }));
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it("checks the env the app runs with", async () => {
    vi.stubEnv("PADDLE_ENVIRONMENT", " Production ");
    vi.stubEnv("PADDLE_API_KEY", "pdl_live_apikey_x");
    vi.stubEnv("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN", "live_x");
    for (const [name, id] of Object.entries(IDS)) vi.stubEnv(name, id);
    vi.stubEnv("PADDLE_MAX_YEARLY_PRICE_ID", "");
    resetEnvForTests();
    expect(catalogConfig()).toEqual({
      environment: "live",
      apiKey: "pdl_live_apikey_x",
      clientToken: "live_x",
      priceIds: { ...IDS, PADDLE_MAX_YEARLY_PRICE_ID: undefined },
    });
    const fetchStub = servePrices(Object.values(goodPrices()));
    expect(problems(await runCatalogCheck())).toEqual([]);
    expect(String(fetchStub.mock.calls[0]?.[0])).toMatch(/^https:\/\/api\.paddle\.com\/prices\//);
  });
});
