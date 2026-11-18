import { z } from "zod";
import {
  PAID_PLANS,
  PLANS,
  PRICES_USD,
  PRO_TRIAL,
  type BillingInterval,
  type PaidPlanId,
} from "@/config/plans";
import { env, type Env } from "@/lib/env";
import { INTERVAL_NAMES } from "./prices";

type PaddleEnvironment = Env["PADDLE_ENVIRONMENT"];

// Read-only: this module only ever sends GET /prices/{id}.
const API_URL: Record<PaddleEnvironment, string> = {
  sandbox: "https://sandbox-api.paddle.com",
  live: "https://api.paddle.com",
};
const TIMEOUT_MS = 8_000;

const KEY_PREFIX: Record<PaddleEnvironment, string> = { sandbox: "pdl_sdbx_", live: "pdl_live_" };
const TOKEN_PREFIX: Record<PaddleEnvironment, string> = { sandbox: "test_", live: "live_" };
const PRICE_ID = /^pri_[a-z\d]{26}$/;
const PRODUCT_ID = /^pro_[a-z\d]{26}$/;
const CURRENCY = "USD";
// SETUP.md §10 step 1: tax is added on top of the price, and the products are SaaS.
const TAX_MODE = "external";
const TAX_CATEGORY = "saas";

const PRICE_VARIABLES = [
  "PADDLE_PRO_MONTHLY_PRICE_ID",
  "PADDLE_PRO_TRIAL_PRICE_ID",
  "PADDLE_PRO_YEARLY_PRICE_ID",
  "PADDLE_MAX_MONTHLY_PRICE_ID",
  "PADDLE_MAX_YEARLY_PRICE_ID",
] as const;

type PriceVariable = (typeof PRICE_VARIABLES)[number];

export type CatalogConfig = {
  environment: PaddleEnvironment;
  apiKey: string | undefined;
  clientToken: string | undefined;
  priceIds: Partial<Record<PriceVariable, string>>;
};

type Money = { amount: string; currency_code: string };

export type CatalogPrice = {
  id: string;
  product_id: string;
  status: string;
  billing_cycle: { interval: string; frequency: number } | null;
  trial_period: {
    interval: string;
    frequency: number;
    requires_payment_method: boolean | null;
    unit_price: Money | null;
  } | null;
  unit_price: Money;
  unit_price_overrides: { country_codes: string[]; unit_price: Money }[];
  tax_mode: string;
  product: { name: string; status: string; tax_category: string };
};

export type PriceLookup =
  | { found: true; price: CatalogPrice }
  | { found: false; reason: "not_found" | "unauthorized" | "forbidden" | "timeout" | "network" }
  | { found: false; reason: "http"; status: number }
  | { found: false; reason: "unexpected" };

export type CatalogCheck = { ok: boolean; message: string };

type Slot = {
  variable: PriceVariable;
  plan: PaidPlanId;
  interval: BillingInterval;
  trial: boolean;
  label: string;
};

function slot(
  variable: PriceVariable,
  plan: PaidPlanId,
  interval: BillingInterval,
  trial = false,
): Slot {
  const name = PLANS[plan].name;
  const label = trial ? `${name} trial` : `${name} ${INTERVAL_NAMES[interval].toLowerCase()}`;
  return { variable, plan, interval, trial, label };
}

const SLOTS: readonly Slot[] = [
  slot("PADDLE_PRO_MONTHLY_PRICE_ID", "pro", "month"),
  slot("PADDLE_PRO_TRIAL_PRICE_ID", PRO_TRIAL.plan, PRO_TRIAL.interval, true),
  slot("PADDLE_PRO_YEARLY_PRICE_ID", "pro", "year"),
  slot("PADDLE_MAX_MONTHLY_PRICE_ID", "max", "month"),
  slot("PADDLE_MAX_YEARLY_PRICE_ID", "max", "year"),
];

const MoneySchema = z.object({ amount: z.string(), currency_code: z.string() });
const Cycle = z.object({ interval: z.string(), frequency: z.number() });

const PriceResponse = z.object({
  data: z.object({
    id: z.string(),
    product_id: z.string(),
    status: z.string(),
    billing_cycle: Cycle.nullish().transform((value) => value ?? null),
    trial_period: Cycle.extend({
      requires_payment_method: z
        .boolean()
        .nullish()
        .transform((value) => value ?? null),
      unit_price: MoneySchema.nullish().transform((value) => value ?? null),
    })
      .nullish()
      .transform((value) => value ?? null),
    unit_price: MoneySchema,
    unit_price_overrides: z
      .array(z.object({ country_codes: z.array(z.string()), unit_price: MoneySchema }))
      .nullish()
      .transform((value) => value ?? []),
    tax_mode: z.string(),
    product: z.object({ name: z.string(), status: z.string(), tax_category: z.string() }),
  }) satisfies z.ZodType<CatalogPrice>,
});

export function catalogConfig(): CatalogConfig {
  const e = env();
  return {
    environment: e.PADDLE_ENVIRONMENT,
    apiKey: e.PADDLE_API_KEY,
    clientToken: e.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
    priceIds: Object.fromEntries(PRICE_VARIABLES.map((name) => [name, e[name]])),
  };
}

const timedOut = (error: unknown) => error instanceof Error && error.name === "TimeoutError";

export async function readPaddlePrice(
  id: string,
  access: { apiKey: string; environment: PaddleEnvironment },
): Promise<PriceLookup> {
  const url = new URL(`/prices/${encodeURIComponent(id)}`, API_URL[access.environment]);
  url.searchParams.set("include", "product");
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${access.apiKey}`, "Paddle-Version": "1" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    return { found: false, reason: timedOut(error) ? "timeout" : "network" };
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    if (response.status === 404) return { found: false, reason: "not_found" };
    if (response.status === 401) return { found: false, reason: "unauthorized" };
    if (response.status === 403) return { found: false, reason: "forbidden" };
    return { found: false, reason: "http", status: response.status };
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    return { found: false, reason: timedOut(error) ? "timeout" : "unexpected" };
  }
  const parsed = PriceResponse.safeParse(body);
  return parsed.success
    ? { found: true, price: parsed.data.data }
    : { found: false, reason: "unexpected" };
}

export async function runCatalogCheck(
  config: CatalogConfig = catalogConfig(),
): Promise<CatalogCheck[]> {
  const apiKey = config.apiKey;
  if (!apiKey || !canReadPrices(config)) return checkCatalog(config, null);
  const ids = [...new Set(Object.values(config.priceIds))].filter(
    (id): id is string => id !== undefined && PRICE_ID.test(id),
  );
  const access = { apiKey, environment: config.environment };
  const lookups = await Promise.all(
    ids.map(async (id) => [id, await readPaddlePrice(id, access)] as const),
  );
  return checkCatalog(config, new Map(lookups));
}

export function canReadPrices(config: CatalogConfig): boolean {
  return environmentOf(config.apiKey, KEY_PREFIX) === config.environment;
}

// lookups is null when the key can't read this environment's prices, so none were asked for.
export function checkCatalog(
  config: CatalogConfig,
  lookups: ReadonlyMap<string, PriceLookup> | null,
): CatalogCheck[] {
  const checks = [...environmentChecks(config)];
  if (!lookups) {
    checks.push(problem("Prices weren't read from Paddle: fix the API key and environment first."));
  }
  const found: Found[] = [];
  for (const entry of SLOTS) {
    const id = config.priceIds[entry.variable];
    const unusable = idProblem(entry, id);
    if (unusable) {
      checks.push(unusable);
      continue;
    }
    if (!id || !lookups) continue;
    const lookup = lookups.get(id) ?? ({ found: false, reason: "unexpected" } as const);
    if (!lookup.found) {
      checks.push(problem(lookupProblem(entry, id, lookup, config.environment)));
      continue;
    }
    found.push({ slot: entry, price: lookup.price });
    const problems = priceProblems(entry, lookup.price);
    if (problems.length === 0) {
      checks.push(ok(`${entry.label} (${id}): ${describe(entry, lookup.price)}.`));
    }
    for (const text of problems) checks.push(problem(`${entry.label} (${id}): ${text}.`));
  }
  checks.push(...missingMax(config), ...duplicateChecks(config), ...productChecks(found));
  return [...new Map(checks.map((check) => [check.message, check])).values()];
}

type Found = { slot: Slot; price: CatalogPrice };

const ok = (message: string): CatalogCheck => ({ ok: true, message });
const problem = (message: string): CatalogCheck => ({ ok: false, message });

const hasSpaces = (value: string) => value.trim() !== value;

function environmentOf(
  value: string | undefined,
  prefixes: Record<PaddleEnvironment, string>,
): PaddleEnvironment | null {
  if (!value || hasSpaces(value)) return null;
  if (value.startsWith(prefixes.live)) return "live";
  if (value.startsWith(prefixes.sandbox)) return "sandbox";
  return null;
}

function credentialProblem(
  name: string,
  value: string | undefined,
  prefixes: Record<PaddleEnvironment, string>,
  missing: string,
): CatalogCheck | null {
  if (!value) return problem(`${name} is not set: ${missing}.`);
  if (hasSpaces(value)) return problem(`${name} has a space or line break around it: remove it.`);
  if (environmentOf(value, prefixes) === null) {
    return problem(
      `${name} doesn't look right: it should start with ${prefixes.sandbox} (sandbox) or ${prefixes.live} (live).`,
    );
  }
  return null;
}

function environmentChecks(config: CatalogConfig): CatalogCheck[] {
  const checks = [
    credentialProblem(
      "PADDLE_API_KEY",
      config.apiKey,
      KEY_PREFIX,
      "no price can be read without it",
    ),
    credentialProblem(
      "NEXT_PUBLIC_PADDLE_CLIENT_TOKEN",
      config.clientToken,
      TOKEN_PREFIX,
      "checkout stays off without it",
    ),
  ].filter((check): check is CatalogCheck => check !== null);

  const sources = [
    { name: "PADDLE_ENVIRONMENT", environment: config.environment },
    { name: "the API key", environment: environmentOf(config.apiKey, KEY_PREFIX) },
    { name: "the client token", environment: environmentOf(config.clientToken, TOKEN_PREFIX) },
  ].filter(
    (source): source is { name: string; environment: PaddleEnvironment } =>
      source.environment !== null,
  );
  const agree = sources.every((source) => source.environment === config.environment);
  const said = sources.map((source) => `${source.name} is ${source.environment}`);
  const agreeing =
    sources.length > 1 ? ` (${listOf(sources.map((source) => source.name))} agree)` : "";
  checks.push(
    agree
      ? ok(`Environment: ${config.environment}${agreeing}.`)
      : problem(
          `Environments disagree: ${listOf(said)}. Use one account's values; only live or production in PADDLE_ENVIRONMENT selects live.`,
        ),
  );
  return checks;
}

function idProblem(entry: Slot, id: string | undefined): CatalogCheck | null {
  const where = `${entry.label}: ${entry.variable}`;
  if (!id) {
    if (entry.variable === "PADDLE_PRO_MONTHLY_PRICE_ID") {
      return problem(`${where} is not set: checkout stays off without it.`);
    }
    return ok(
      `${where} is not set, so ${entry.trial ? "there is no trial" : `${entry.label} isn't offered`}.`,
    );
  }
  if (hasSpaces(id)) return problem(`${where} has a space or line break around the id: remove it.`);
  if (PRODUCT_ID.test(id)) {
    return problem(`${where} holds a product id (pro_...): copy the price id (pri_...).`);
  }
  if (!PRICE_ID.test(id)) {
    return problem(
      `${where} isn't a Paddle price id: it should be pri_ followed by 26 letters and digits.`,
    );
  }
  return null;
}

function lookupProblem(
  entry: Slot,
  id: string,
  lookup: Exclude<PriceLookup, { found: true }>,
  environment: PaddleEnvironment,
): string {
  const where = `${entry.label} (${id})`;
  switch (lookup.reason) {
    case "not_found":
      return `${where}: not in the ${environment} catalog. Copy it from the ${environment} account; sandbox and live ids differ.`;
    case "unauthorized":
      return "Paddle refused the API key (HTTP 401): it may have expired or been revoked.";
    case "forbidden":
      return "The API key can't read the catalog (HTTP 403): give it Prices read and Products read.";
    case "timeout":
      return `${where}: Paddle didn't answer within ${TIMEOUT_MS / 1000} seconds. Try again.`;
    case "network":
      return `${where}: Paddle couldn't be reached. Check the connection and try again.`;
    case "http":
      return `${where}: Paddle answered HTTP ${lookup.status}. Try again.`;
    case "unexpected":
      return `${where}: Paddle's answer wasn't a price this check can read.`;
  }
}

const toMinor = (usd: number) => Math.round(usd * 100);

function money(amount: string, currency: string): string {
  return /^\d+$/.test(amount)
    ? `${currency} ${(Number(amount) / 100).toFixed(2)}`
    : `${currency} "${amount}"`;
}

function every(cycle: { interval: string; frequency: number }): string {
  return cycle.frequency === 1
    ? `every ${cycle.interval}`
    : `every ${cycle.frequency} ${cycle.interval}s`;
}

function span(cycle: { interval: string; frequency: number }): string {
  return `${cycle.frequency} ${cycle.interval}${cycle.frequency === 1 ? "" : "s"}`;
}

const lasting = (cycle: { interval: string; frequency: number }) =>
  `${cycle.frequency}-${cycle.interval}`;

const TAX_FIX =
  "set the price's tax to excluding tax: the pricing page and the terms add tax on top";

function taxProblem(mode: string): string {
  if (mode === "account_setting") return `it uses the account's tax setting; ${TAX_FIX}`;
  if (mode === "internal") return `its price includes tax; ${TAX_FIX}`;
  if (mode === "location") return `its price includes tax in some countries; ${TAX_FIX}`;
  return `its tax mode is ${mode}; ${TAX_FIX}`;
}

function priceProblems(entry: Slot, price: CatalogPrice): string[] {
  const problems: string[] = [];
  if (price.status !== "active") problems.push(`it is ${price.status}, not active`);

  const cycle = price.billing_cycle;
  const wantedCycle = { interval: entry.interval, frequency: 1 };
  if (!cycle) problems.push("it is a one-time price, not a subscription");
  else if (cycle.interval !== wantedCycle.interval || cycle.frequency !== wantedCycle.frequency) {
    problems.push(`it bills ${every(cycle)}, not ${every(wantedCycle)}`);
  }

  const { amount, currency_code: currency } = price.unit_price;
  const wanted = toMinor(PRICES_USD[entry.plan][entry.interval]);
  if (currency !== CURRENCY) problems.push(`it is in ${currency}, not ${CURRENCY}`);
  if (amount !== String(wanted)) {
    problems.push(
      `it costs ${money(amount, currency)}, but the app shows ${money(String(wanted), CURRENCY)} (PRICES_USD in src/config/plans.ts)`,
    );
  }
  const countries = new Set(price.unit_price_overrides.flatMap((entry) => entry.country_codes));
  if (countries.size > 0) {
    problems.push(
      `it has its own price in ${countries.size} ${countries.size === 1 ? "country" : "countries"}, but the app shows one ${CURRENCY} price everywhere: remove the country prices`,
    );
  }
  if (price.tax_mode !== TAX_MODE) problems.push(taxProblem(price.tax_mode));

  const trial = price.trial_period;
  if (!entry.trial) {
    if (trial) {
      problems.push(`it has a ${lasting(trial)} trial; only PADDLE_PRO_TRIAL_PRICE_ID should`);
    }
    return problems;
  }
  const wantedTrial = { interval: "day", frequency: PRO_TRIAL.days };
  if (!trial) {
    problems.push(`it has no trial; it needs a ${lasting(wantedTrial)} trial`);
    return problems;
  }
  if (trial.interval !== wantedTrial.interval || trial.frequency !== wantedTrial.frequency) {
    problems.push(
      `its trial is ${span(trial)}, not ${span(wantedTrial)} (PRO_TRIAL in src/config/plans.ts)`,
    );
  }
  if (trial.requires_payment_method === false) {
    problems.push("its trial doesn't ask for a card; it must (payment method required)");
  }
  const trialCharge = trial.unit_price?.amount ?? "0";
  const wantedTrialCharge = String(toMinor(PRO_TRIAL.priceUsd));
  if (trialCharge !== wantedTrialCharge) {
    const charged = money(trialCharge, trial.unit_price?.currency_code ?? CURRENCY);
    problems.push(
      wantedTrialCharge === "0"
        ? `it charges ${charged} during the trial; the trial must be free`
        : `it charges ${charged} during the trial, not ${money(wantedTrialCharge, CURRENCY)}`,
    );
  }
  return problems;
}

function describe(entry: Slot, price: CatalogPrice): string {
  const charge = `${money(price.unit_price.amount, price.unit_price.currency_code)} ${every({ interval: entry.interval, frequency: 1 })} plus tax`;
  const trial = price.trial_period
    ? `after a ${lasting(price.trial_period)} trial charging ${money(price.trial_period.unit_price?.amount ?? "0", price.trial_period.unit_price?.currency_code ?? CURRENCY)}, card required`
    : "no trial";
  return `active, ${charge}, ${trial}`;
}

function missingMax(config: CatalogConfig): CatalogCheck[] {
  const variables = SLOTS.filter((entry) => entry.plan === "max").map((entry) => entry.variable);
  if (variables.some((variable) => config.priceIds[variable])) return [];
  const name = PLANS.max.name;
  return [
    problem(`${name}: neither ${listOf(variables, "nor")} is set, so ${name} isn't offered.`),
  ];
}

function duplicateChecks(config: CatalogConfig): CatalogCheck[] {
  const byId = new Map<string, PriceVariable[]>();
  for (const variable of PRICE_VARIABLES) {
    const id = config.priceIds[variable];
    if (id) byId.set(id, [...(byId.get(id) ?? []), variable]);
  }
  return [...byId.values()]
    .filter((variables) => variables.length > 1)
    .map((variables) =>
      problem(`${listOf(variables)} hold the same price id: each needs its own price.`),
    );
}

// Buyers see the product name at checkout and on receipts, so it names its own plan and no other.
function namedFor(name: string, plan: PaidPlanId): boolean {
  const words = new Set(name.toLowerCase().split(/[^a-z\d]+/));
  return PAID_PLANS.every(
    (other) => words.has(PLANS[other].name.toLowerCase()) === (other === plan),
  );
}

function productChecks(found: Found[]): CatalogCheck[] {
  if (found.length === 0) return [];
  const byPlan = new Map<PaidPlanId, Set<string>>();
  const byProduct = new Map<string, { product: CatalogPrice["product"]; plans: Set<PaidPlanId> }>();
  for (const { slot: entry, price } of found) {
    byPlan.set(entry.plan, (byPlan.get(entry.plan) ?? new Set<string>()).add(price.product_id));
    const known = byProduct.get(price.product_id) ?? {
      product: price.product,
      plans: new Set<PaidPlanId>(),
    };
    known.plans.add(entry.plan);
    byProduct.set(price.product_id, known);
  }
  const checks: CatalogCheck[] = [];
  for (const [plan, ids] of byPlan) {
    if (ids.size > 1) {
      const name = PLANS[plan].name;
      checks.push(
        problem(
          `${name} prices are on different products (${listOf([...ids])}): put every ${name} price on one product.`,
        ),
      );
    }
  }
  for (const [id, { product, plans }] of byProduct) {
    if (plans.size > 1) {
      checks.push(
        problem(
          `${listOf([...plans].map((plan) => PLANS[plan].name))} prices share a product (${id}): each plan needs its own product.`,
        ),
      );
    }
    if (product.status !== "active") {
      checks.push(
        problem(
          `Product ${id} is ${product.status}, so its prices can't be bought: make it active.`,
        ),
      );
    }
    if (product.tax_category !== TAX_CATEGORY) {
      checks.push(
        problem(`Product ${id} has tax category ${product.tax_category}: set it to SaaS.`),
      );
    }
    const [plan] = [...plans];
    if (plan && plans.size === 1 && !namedFor(product.name, plan)) {
      checks.push(
        problem(
          `Product ${id} holds the ${PLANS[plan].name} prices but is called "${product.name}": buyers see that name, so name it for ${PLANS[plan].name}.`,
        ),
      );
    }
  }
  if (checks.length > 0) return checks;
  const named = [...byPlan].map(([plan, ids]) => `${PLANS[plan].name} on ${[...ids].join(", ")}`);
  return [ok(`Products: ${listOf(named)}, active, tax category SaaS.`)];
}

function listOf(items: string[], joiner = "and"): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${joiner} ${items.at(-1)}`;
}
