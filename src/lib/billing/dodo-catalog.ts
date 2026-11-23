import { createHash, timingSafeEqual } from "node:crypto";
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
import { isDodoId } from "./dodo-status";
import { INTERVAL_NAMES } from "./prices";

export type DodoEnvironment = Env["DODO_ENVIRONMENT"];
export type DodoAccess = { apiKey: string; environment: DodoEnvironment };

// Read-only: this module only ever sends GETs; scripts/dodo-setup.ts makes the changes.
export const DODO_API_URL: Record<DodoEnvironment, string> = {
  test: "https://test.dodopayments.com",
  live: "https://live.dodopayments.com",
};
const TIMEOUT_MS = 8_000;
const PAGE_SIZE = 100;
const MAX_PAGES = 20;

const KEY_PREFIX: Record<DodoEnvironment, string> = { test: "dodo_test_", live: "dodo_live_" };
const WEBHOOK_SECRET = /^whsec_[A-Za-z\d+/]+={0,2}$/;
const MIN_SIGNING_SECRET_LENGTH = 32;
const PADDLE_PRICE_ID = /^pri_[a-z\d]{26}$/;
export const DEFAULT_APP_URL = "https://www.ottosensei.com";
const WEBHOOK_PATH = "/api/billing/webhook";
const CURRENCY = "USD";
const TAX_CATEGORY = "saas";
// Dodo's longest subscription period; a shorter one stops renewing when it runs out.
const PERIOD_YEARS = 20;
const DODO_INTERVAL: Record<BillingInterval, string> = { month: "Month", year: "Year" };

// Never empty: an endpoint with no event list receives every event type.
export const DODO_WEBHOOK_EVENTS = [
  "subscription.active",
  "subscription.renewed",
  "subscription.updated",
  "subscription.plan_changed",
  "subscription.past_due",
  "subscription.on_hold",
  "subscription.paused",
  "subscription.unpaused",
  "subscription.cancelled",
  "subscription.expired",
  "subscription.failed",
  "subscription.update_payment_method",
  "payment.succeeded",
  "payment.failed",
  "refund.succeeded",
  "refund.failed",
  "dispute.opened",
  "dispute.challenged",
  "dispute.accepted",
  "dispute.cancelled",
  "dispute.expired",
  "dispute.won",
  "dispute.lost",
] as const;

const PRODUCT_VARIABLES = [
  "DODO_PRO_MONTHLY_PRODUCT_ID",
  "DODO_PRO_TRIAL_PRODUCT_ID",
  "DODO_PRO_YEARLY_PRODUCT_ID",
  "DODO_MAX_MONTHLY_PRODUCT_ID",
  "DODO_MAX_YEARLY_PRODUCT_ID",
] as const;

export type ProductVariable = (typeof PRODUCT_VARIABLES)[number];

export type ProductSlot = {
  variable: ProductVariable;
  plan: PaidPlanId;
  interval: BillingInterval;
  trial: boolean;
  label: string;
};

function slot(
  variable: ProductVariable,
  plan: PaidPlanId,
  interval: BillingInterval,
  trial = false,
): ProductSlot {
  const name = PLANS[plan].name;
  const label = trial ? `${name} trial` : `${name} ${INTERVAL_NAMES[interval].toLowerCase()}`;
  return { variable, plan, interval, trial, label };
}

export const PRODUCT_SLOTS: readonly ProductSlot[] = [
  slot("DODO_PRO_MONTHLY_PRODUCT_ID", "pro", "month"),
  slot("DODO_PRO_TRIAL_PRODUCT_ID", PRO_TRIAL.plan, PRO_TRIAL.interval, true),
  slot("DODO_PRO_YEARLY_PRODUCT_ID", "pro", "year"),
  slot("DODO_MAX_MONTHLY_PRODUCT_ID", "max", "month"),
  slot("DODO_MAX_YEARLY_PRODUCT_ID", "max", "year"),
];

export type CatalogConfig = {
  environment: DodoEnvironment;
  apiKey: string | undefined;
  webhookSecret: string | undefined;
  signingSecret: string | undefined;
  productIds: Partial<Record<ProductVariable, string>>;
  // Unset keeps prepaid credit off, so nothing about it is checked.
  topupProductId?: string;
  appUrl: string;
};

export const TOPUP_VARIABLE = "DODO_TOPUP_PRODUCT_ID";
export const TOPUP_LABEL = "Credit";
// The app sells credit as this $1 product times the dollars chosen.
const TOPUP_UNIT_CENTS = 100;

export type CatalogCheck = { ok: boolean; message: string };

const orNull = <T extends z.ZodType>(schema: T) =>
  schema.nullish().transform((value) => value ?? null);

const MetadataSchema = z
  .record(z.string(), z.unknown())
  .nullish()
  .transform((value) => value ?? {});

// Only the fields the check reads; anything else Dodo sends is dropped, not refused.
const ProductSchema = z.object({
  product_id: z.string().min(1),
  name: orNull(z.string()),
  tax_category: orNull(z.string()),
  metadata: MetadataSchema,
  addons: z
    .array(z.string())
    .nullish()
    .transform((value) => value ?? []),
  pricing_mode: orNull(z.string()),
  price: z.object({
    type: z.string(),
    currency: orNull(z.string()),
    price: orNull(z.number()),
    payment_frequency_count: orNull(z.number()),
    payment_frequency_interval: orNull(z.string()),
    subscription_period_count: orNull(z.number()),
    subscription_period_interval: orNull(z.string()),
    discount: orNull(z.number()),
    discount_bps: orNull(z.number()),
    purchasing_power_parity: orNull(z.boolean()),
    pay_what_you_want: orNull(z.boolean()),
    tax_inclusive: orNull(z.boolean()),
    trial_period_days: orNull(z.number()),
    trial_amount: orNull(z.number()),
    trial_payment_method_optional: orNull(z.boolean()),
  }),
});

const ProductSummarySchema = z.object({
  product_id: z.string().min(1),
  name: orNull(z.string()),
  metadata: MetadataSchema,
});

const WebhookEndpointSchema = z.object({
  id: z.string().min(1),
  url: z.string(),
  disabled: z
    .boolean()
    .nullish()
    .transform((value) => value ?? false),
  filter_types: orNull(z.array(z.string())),
});

export type DodoProduct = z.output<typeof ProductSchema>;
export type DodoProductSummary = z.output<typeof ProductSummarySchema>;
export type WebhookEndpoint = z.output<typeof WebhookEndpointSchema>;

export type DodoReadFailure =
  | {
      found: false;
      reason: "not_found" | "unauthorized" | "forbidden" | "timeout" | "network" | "unexpected";
    }
  | { found: false; reason: "http"; status: number };

export type ProductLookup = { found: true; product: DodoProduct } | DodoReadFailure;
export type ListLookup<T> = { found: true; items: T[] } | DodoReadFailure;
export type SecretLookup = { found: true; secret: string } | DodoReadFailure;

export type CatalogReads = {
  products: ReadonlyMap<string, ProductLookup>;
  archived: ListLookup<DodoProductSummary>;
  webhooks: ListLookup<WebhookEndpoint>;
  // Null when the endpoint's secret wasn't read.
  secretMatches: boolean | null;
};

export function appOrigin(value: string): string {
  const trimmed = value.trim();
  const url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return url.replace(/\/+$/, "");
}

export function catalogConfig(options: { appUrl?: string } = {}): CatalogConfig {
  const e = env();
  return {
    environment: e.DODO_ENVIRONMENT,
    apiKey: e.DODO_API_KEY,
    webhookSecret: e.DODO_WEBHOOK_SECRET,
    signingSecret: e.BILLING_SIGNING_SECRET,
    productIds: Object.fromEntries(PRODUCT_VARIABLES.map((name) => [name, e[name]])),
    topupProductId: e.DODO_TOPUP_PRODUCT_ID,
    appUrl: appOrigin(options.appUrl?.trim() || e.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL),
  };
}

export function keyEnvironment(key: string | undefined): DodoEnvironment | null {
  if (!key || key.trim() !== key) return null;
  for (const environment of ["live", "test"] as const) {
    const prefix = KEY_PREFIX[environment];
    if (key.startsWith(prefix) && key.length > prefix.length) return environment;
  }
  return null;
}

export function webhookUrl(appUrl: string): string {
  return `${appOrigin(appUrl)}${WEBHOOK_PATH}`;
}

function normalUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return `${url.origin}${url.pathname.replace(/\/+$/, "")}${url.search}`;
  } catch {
    return null;
  }
}

export function endpointsFor(
  endpoints: readonly WebhookEndpoint[],
  appUrl: string,
): WebhookEndpoint[] {
  const wanted = normalUrl(webhookUrl(appUrl));
  return endpoints.filter((endpoint) => wanted !== null && normalUrl(endpoint.url) === wanted);
}

// Tags dodo-setup.ts puts on each product, so a rerun finds it instead of making another.
export function slotTagged(metadata: Record<string, unknown>, entry: ProductSlot): boolean {
  return (
    String(metadata.otto_plan) === entry.plan &&
    String(metadata.otto_interval) === entry.interval &&
    String(metadata.otto_trial) === String(entry.trial)
  );
}

const toMinor = (usd: number) => Math.round(usd * 100);

const wantedTrialAmount = () => (PRO_TRIAL.priceUsd > 0 ? toMinor(PRO_TRIAL.priceUsd) : null);

export function productSpec(entry: ProductSlot) {
  const plan = PLANS[entry.plan].name;
  const cycle = INTERVAL_NAMES[entry.interval].toLowerCase();
  const trialAmount = entry.trial ? wantedTrialAmount() : null;
  return {
    name: `Otto Sensei ${plan} (${cycle}${entry.trial ? `, ${PRO_TRIAL.days}-day trial` : ""})`,
    description: entry.trial
      ? `Otto Sensei ${plan} with a ${PRO_TRIAL.days}-day trial, then billed every ${entry.interval} until you cancel.`
      : `Otto Sensei ${plan}, billed every ${entry.interval} until you cancel.`,
    tax_category: TAX_CATEGORY,
    price: {
      type: "recurring_price",
      currency: CURRENCY,
      price: toMinor(PRICES_USD[entry.plan][entry.interval]),
      discount_bps: 0,
      purchasing_power_parity: false,
      tax_inclusive: false,
      payment_frequency_count: 1,
      payment_frequency_interval: DODO_INTERVAL[entry.interval],
      subscription_period_count: PERIOD_YEARS,
      subscription_period_interval: "Year",
      trial_period_days: entry.trial ? PRO_TRIAL.days : 0,
      ...(trialAmount === null ? {} : { trial_amount: trialAmount }),
    },
    metadata: {
      otto_plan: entry.plan,
      otto_interval: entry.interval,
      otto_trial: String(entry.trial),
    },
  };
}

export function topupTagged(metadata: Record<string, unknown>): boolean {
  return String(metadata.otto_topup) === "true";
}

export function topupSpec() {
  return {
    name: "Otto Sensei credit ($1)",
    description:
      "Prepaid Otto Sensei credit in whole dollars, for AI help once a paid plan's monthly allowance runs out.",
    tax_category: TAX_CATEGORY,
    price: {
      type: "one_time_price",
      currency: CURRENCY,
      price: TOPUP_UNIT_CENTS,
      discount_bps: 0,
      purchasing_power_parity: false,
      pay_what_you_want: false,
      tax_inclusive: false,
    },
    metadata: { otto_topup: "true" },
  };
}

// The checkout buys this product once per dollar, so it must be a plain $1.00 one-time price.
export function topupProblems(product: DodoProduct): string[] {
  const price = product.price;
  if (price.type !== "one_time_price") {
    return [
      `it is ${price.type === "recurring_price" ? "a subscription" : price.type}, not a one-time price`,
    ];
  }
  const problems: string[] = [];
  if (price.currency?.toUpperCase() !== CURRENCY) {
    problems.push(`it is in ${price.currency ?? "no currency"}, not ${CURRENCY}`);
  }
  if (price.price !== TOPUP_UNIT_CENTS) {
    problems.push(
      `it costs ${money(price.price ?? 0, price.currency)}, but the app sells credit as ${money(TOPUP_UNIT_CENTS, CURRENCY)} times the dollars chosen`,
    );
  }
  if (price.pay_what_you_want === true) {
    problems.push("it lets the buyer pick the amount: turn pay what you want off, the app sets it");
  }
  if (price.tax_inclusive === true) problems.push(`its price includes tax; ${TAX_FIX}`);
  if (product.tax_category !== TAX_CATEGORY)
    problems.push("its tax category isn't SaaS: set it to SaaS");
  if (price.purchasing_power_parity === true) {
    problems.push(`it has purchasing power parity on, ${ONE_PRICE}: turn it off`);
  }
  if (product.pricing_mode !== null) {
    problems.push(`it has localized prices (${product.pricing_mode}), ${ONE_PRICE}: remove them`);
  }
  const discountBps = price.discount_bps ?? (price.discount ?? 0) * 100;
  if (discountBps > 0) problems.push(`it has a ${discountBps / 100}% discount: remove it`);
  if (product.addons.length > 0)
    problems.push("it offers add-ons, which the app doesn't sell: remove them");
  if (!product.name?.trim())
    problems.push("it has no name: buyers see it at checkout, so name it for credit");
  return problems;
}

const timedOut = (error: unknown) => error instanceof Error && error.name === "TimeoutError";

async function getJson(
  path: string,
  access: DodoAccess,
): Promise<{ found: true; body: unknown } | DodoReadFailure> {
  let response: Response;
  try {
    response = await fetch(new URL(path, DODO_API_URL[access.environment]), {
      method: "GET",
      headers: { Authorization: `Bearer ${access.apiKey}` },
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
  try {
    return { found: true, body: await response.json() };
  } catch (error) {
    return { found: false, reason: timedOut(error) ? "timeout" : "unexpected" };
  }
}

export async function readDodoProduct(id: string, access: DodoAccess): Promise<ProductLookup> {
  const got = await getJson(`/products/${encodeURIComponent(id)}`, access);
  if (!got.found) return got;
  const parsed = ProductSchema.safeParse(got.body);
  return parsed.success
    ? { found: true, product: parsed.data }
    : { found: false, reason: "unexpected" };
}

const ListPage = z.object({ items: z.array(z.unknown()) });
const CursorPage = z.object({
  data: z.array(z.unknown()),
  done: z.boolean().nullish(),
  iterator: z.string().nullish(),
});

function parseEach<T>(schema: z.ZodType<T>, items: unknown[]): T[] {
  return items.flatMap((item) => {
    const parsed = schema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

// Without archived, Dodo lists the active products; with it, the archived ones.
export async function listDodoProducts(
  access: DodoAccess,
  options: { archived: boolean },
): Promise<ListLookup<DodoProductSummary>> {
  const found = new Map<string, DodoProductSummary>();
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const query = new URLSearchParams({ page_size: String(PAGE_SIZE), page_number: String(page) });
    if (options.archived) query.set("archived", "true");
    const got = await getJson(`/products?${query}`, access);
    if (!got.found) return got;
    const parsed = ListPage.safeParse(got.body);
    if (!parsed.success) return { found: false, reason: "unexpected" };
    const before = found.size;
    for (const item of parseEach(ProductSummarySchema, parsed.data.items)) {
      found.set(item.product_id, item);
    }
    if (parsed.data.items.length < PAGE_SIZE || found.size === before) break;
  }
  return { found: true, items: [...found.values()] };
}

export async function listDodoWebhooks(access: DodoAccess): Promise<ListLookup<WebhookEndpoint>> {
  const found = new Map<string, WebhookEndpoint>();
  let iterator: string | null = null;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const query = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (iterator) query.set("iterator", iterator);
    const got = await getJson(`/webhooks?${query}`, access);
    if (!got.found) return got;
    const parsed = CursorPage.safeParse(got.body);
    if (!parsed.success) return { found: false, reason: "unexpected" };
    const before = found.size;
    for (const item of parseEach(WebhookEndpointSchema, parsed.data.data)) {
      found.set(item.id, item);
    }
    iterator = parsed.data.iterator ?? null;
    if (parsed.data.done !== false || !iterator || found.size === before) break;
  }
  return { found: true, items: [...found.values()] };
}

const SecretSchema = z.object({ secret: z.string().min(1) });

export async function readWebhookSecret(id: string, access: DodoAccess): Promise<SecretLookup> {
  const got = await getJson(`/webhooks/${encodeURIComponent(id)}/secret`, access);
  if (!got.found) return got;
  const parsed = SecretSchema.safeParse(got.body);
  return parsed.success
    ? { found: true, secret: parsed.data.secret }
    : { found: false, reason: "unexpected" };
}

const digest = (value: string) => createHash("sha256").update(value).digest();

function sameSecret(a: string, b: string): boolean {
  return timingSafeEqual(digest(a), digest(b));
}

export function canReadCatalog(config: CatalogConfig): boolean {
  return keyEnvironment(config.apiKey) === config.environment;
}

export async function runCatalogCheck(
  config: CatalogConfig = catalogConfig(),
): Promise<CatalogCheck[]> {
  const apiKey = config.apiKey;
  if (!apiKey || !canReadCatalog(config)) return validateCatalog(config, null);
  const access = { apiKey, environment: config.environment };
  const ids = [...new Set([...Object.values(config.productIds), config.topupProductId])].filter(
    (id): id is string => id !== undefined && isDodoId("pdt", id),
  );
  const [lookups, archived, webhooks] = await Promise.all([
    Promise.all(ids.map(async (id) => [id, await readDodoProduct(id, access)] as const)),
    listDodoProducts(access, { archived: true }),
    listDodoWebhooks(access),
  ]);
  let secretMatches: boolean | null = null;
  const [endpoint] = webhooks.found ? endpointsFor(webhooks.items, config.appUrl) : [];
  if (endpoint && config.webhookSecret) {
    const secret = await readWebhookSecret(endpoint.id, access);
    if (secret.found) secretMatches = sameSecret(secret.secret, config.webhookSecret);
  }
  return validateCatalog(config, {
    products: new Map(lookups),
    archived,
    webhooks,
    secretMatches,
  });
}

const ok = (message: string): CatalogCheck => ({ ok: true, message });
const problem = (message: string): CatalogCheck => ({ ok: false, message });

const hasSpaces = (value: string) => value.trim() !== value;

// reads is null when the key can't read this environment, so nothing was asked for.
export function validateCatalog(config: CatalogConfig, reads: CatalogReads | null): CatalogCheck[] {
  const checks = environmentChecks(config);
  if (!reads) {
    checks.push(
      problem(
        "Products and the webhook endpoint weren't read from Dodo: fix the API key and environment first.",
      ),
    );
  } else if (!reads.archived.found) {
    checks.push(problem(failureMessage("Archived products", reads.archived, config.environment)));
  }
  const archived = reads?.archived.found
    ? new Set(reads.archived.items.map((item) => item.product_id))
    : null;
  for (const entry of PRODUCT_SLOTS) {
    const id = config.productIds[entry.variable];
    const unusable = idProblem(entry, id);
    if (unusable) {
      checks.push(unusable);
      continue;
    }
    if (!id || !reads) continue;
    const where = `${entry.label} (${id})`;
    const lookup = reads.products.get(id) ?? ({ found: false, reason: "unexpected" } as const);
    if (!lookup.found) {
      checks.push(problem(failureMessage(where, lookup, config.environment)));
      continue;
    }
    const problems = [
      ...(archived?.has(id)
        ? [
            `it is archived, so it can't be bought: unarchive it, or set ${entry.variable} to an active product`,
          ]
        : []),
      ...productProblems(entry, lookup.product),
    ];
    if (problems.length === 0) checks.push(ok(`${where}: ${describe(entry, lookup.product)}.`));
    for (const text of problems) checks.push(problem(`${where}: ${text}.`));
  }
  checks.push(...topupChecks(config, reads, archived));
  checks.push(...missingMax(config), ...duplicateChecks(config));
  if (reads) checks.push(...webhookChecks(config, reads));
  return [...new Map(checks.map((check) => [check.message, check])).values()];
}

function topupChecks(
  config: CatalogConfig,
  reads: CatalogReads | null,
  archived: ReadonlySet<string> | null,
): CatalogCheck[] {
  const id = config.topupProductId;
  if (!id) return [];
  const where = `${TOPUP_LABEL}: ${TOPUP_VARIABLE}`;
  if (hasSpaces(id))
    return [problem(`${where} has a space or line break around the id: remove it.`)];
  if (!isDodoId("pdt", id)) {
    return [
      problem(
        `${where} isn't a Dodo product id: it should be pdt_ followed by letters and digits.`,
      ),
    ];
  }
  if (!reads) return [];
  const named = `${TOPUP_LABEL} (${id})`;
  const lookup = reads.products.get(id) ?? ({ found: false, reason: "unexpected" } as const);
  if (!lookup.found) return [problem(failureMessage(named, lookup, config.environment))];
  const problems = [
    ...(archived?.has(id)
      ? [
          `it is archived, so it can't be bought: unarchive it, or set ${TOPUP_VARIABLE} to an active product`,
        ]
      : []),
    ...topupProblems(lookup.product),
  ];
  if (problems.length === 0) {
    return [
      ok(`${named}: ${money(TOPUP_UNIT_CENTS, CURRENCY)} once, plus tax, bought once per dollar.`),
    ];
  }
  return problems.map((text) => problem(`${named}: ${text}.`));
}

type Resource = "products" | "webhooks";

export function failureMessage(
  where: string,
  failure: DodoReadFailure,
  environment: DodoEnvironment,
  resource: Resource = "products",
): string {
  switch (failure.reason) {
    case "not_found":
      return `${where}: not in the ${environment} mode catalog. Copy it from ${environment} mode; test and live ids differ.`;
    case "unauthorized":
      return "Dodo refused the API key (HTTP 401): it may have been revoked, or it belongs to the other mode.";
    case "forbidden":
      return `The API key can't read ${resource} (HTTP 403): give it ${resource === "products" ? "Products" : "Webhooks"} read.`;
    case "timeout":
      return `${where}: Dodo didn't answer within ${TIMEOUT_MS / 1000} seconds. Try again.`;
    case "network":
      return `${where}: Dodo couldn't be reached. Check the connection and try again.`;
    case "http":
      return `${where}: Dodo answered HTTP ${failure.status}. Try again.`;
    case "unexpected":
      return `${where}: Dodo's answer wasn't something this check can read.`;
  }
}

function credentialProblem(
  name: string,
  value: string | undefined,
  missing: string,
): CatalogCheck | null {
  if (!value) return problem(`${name} is not set: ${missing}.`);
  if (hasSpaces(value)) return problem(`${name} has a space or line break around it: remove it.`);
  return null;
}

function environmentChecks(config: CatalogConfig): CatalogCheck[] {
  const checks: CatalogCheck[] = [];
  const keyMode = keyEnvironment(config.apiKey);
  const key = credentialProblem(
    "DODO_API_KEY",
    config.apiKey,
    "nothing can be read from Dodo without it",
  );
  if (key) checks.push(key);
  else if (!keyMode) {
    checks.push(
      problem(
        `DODO_API_KEY doesn't look right: it should start with ${KEY_PREFIX.test} (test mode) or ${KEY_PREFIX.live} (live mode).`,
      ),
    );
  }
  checks.push(
    !keyMode || keyMode === config.environment
      ? ok(
          `Environment: ${config.environment} mode${keyMode ? " (DODO_ENVIRONMENT and the API key agree)" : ""}.`,
        )
      : problem(
          `Environments disagree: DODO_ENVIRONMENT is ${config.environment} and the API key is a ${keyMode} mode key. Billing stays off until they agree; only live, live_mode or production in DODO_ENVIRONMENT selects live mode.`,
        ),
  );
  const webhookSecret = config.webhookSecret;
  const secret = credentialProblem(
    "DODO_WEBHOOK_SECRET",
    webhookSecret,
    "billing stays off without it",
  );
  if (secret) checks.push(secret);
  else if (webhookSecret && !WEBHOOK_SECRET.test(webhookSecret)) {
    checks.push(
      problem(
        "DODO_WEBHOOK_SECRET doesn't look right: it should start with whsec_. Copy it from the webhook endpoint, or run scripts/dodo-setup.ts.",
      ),
    );
  }
  const signingSecret = config.signingSecret;
  const signing = credentialProblem(
    "BILLING_SIGNING_SECRET",
    signingSecret,
    "billing stays off without it. Make one with openssl rand -hex 32",
  );
  if (signing) checks.push(signing);
  else if (signingSecret && signingSecret.length < MIN_SIGNING_SECRET_LENGTH) {
    checks.push(
      problem("BILLING_SIGNING_SECRET is too short: make a new one with openssl rand -hex 32."),
    );
  }
  return checks;
}

function idProblem(entry: ProductSlot, id: string | undefined): CatalogCheck | null {
  const where = `${entry.label}: ${entry.variable}`;
  if (!id) {
    if (entry.variable === "DODO_PRO_MONTHLY_PRODUCT_ID") {
      return problem(`${where} is not set: billing stays off without it.`);
    }
    return ok(
      `${where} is not set, so ${entry.trial ? "there is no trial" : `${entry.label} isn't offered`}.`,
    );
  }
  if (hasSpaces(id)) return problem(`${where} has a space or line break around the id: remove it.`);
  if (PADDLE_PRICE_ID.test(id)) {
    return problem(`${where} holds a Paddle price id: set it to the Dodo product id (pdt_...).`);
  }
  if (!isDodoId("pdt", id)) {
    return problem(
      `${where} isn't a Dodo product id: it should be pdt_ followed by letters and digits.`,
    );
  }
  return null;
}

function money(minor: number, currency: string | null): string {
  const code = currency ?? CURRENCY;
  return Number.isInteger(minor) ? `${code} ${(minor / 100).toFixed(2)}` : `${code} ${minor}/100`;
}

const plural = (count: number, unit: string) => `${count} ${unit}${count === 1 ? "" : "s"}`;

function every(count: number, interval: string): string {
  const unit = interval.toLowerCase();
  return count === 1 ? `every ${unit}` : `every ${plural(count, unit)}`;
}

const MONTHS = new Map([
  ["day", 1 / 30.4375],
  ["week", 7 / 30.4375],
  ["month", 1],
  ["year", 12],
]);

function inMonths(count: number | null, interval: string | null): number | null {
  const unit = interval === null ? undefined : MONTHS.get(interval.toLowerCase());
  return count === null || unit === undefined ? null : count * unit;
}

const TAX_FIX = "turn tax inclusive off: the pricing page and the terms add tax on top";

const ONE_PRICE = `but the app shows one ${CURRENCY} price everywhere`;

export function productProblems(entry: ProductSlot, product: DodoProduct): string[] {
  const problems: string[] = [];
  const price = product.price;
  if (price.type !== "recurring_price") {
    if (price.type === "one_time_price")
      problems.push("it is a one-time price, not a subscription");
    else if (price.type === "usage_based_price")
      problems.push("it is usage-based, not a fixed price");
    else problems.push(`its price type is ${price.type}, not a subscription`);
    return problems;
  }

  const currency = price.currency;
  const wanted = toMinor(PRICES_USD[entry.plan][entry.interval]);
  if (currency?.toUpperCase() !== CURRENCY) {
    problems.push(`it is in ${currency ?? "no currency"}, not ${CURRENCY}`);
  }
  if (price.price === null) problems.push("it has no price");
  else if (price.price !== wanted) {
    problems.push(
      `it costs ${money(price.price, currency)}, but the app shows ${money(wanted, CURRENCY)} (PRICES_USD in src/config/plans.ts)`,
    );
  }

  const cycleCount = price.payment_frequency_count;
  const cycleUnit = price.payment_frequency_interval;
  const cycle = inMonths(cycleCount, cycleUnit);
  if (cycleCount === null || cycleUnit === null) problems.push("it has no billing cycle");
  else if (cycleCount !== 1 || cycleUnit.toLowerCase() !== entry.interval) {
    problems.push(`it bills ${every(cycleCount, cycleUnit)}, not every ${entry.interval}`);
  }

  const periodCount = price.subscription_period_count;
  const periodUnit = price.subscription_period_interval;
  const period = inMonths(periodCount, periodUnit);
  const setPeriod = `set the subscription period to ${PERIOD_YEARS} years`;
  if (period === null || periodCount === null || periodUnit === null) {
    problems.push(`its subscription period can't be read: ${setPeriod}`);
  } else if (cycle !== null && period <= cycle) {
    problems.push(
      `its subscription period (${plural(periodCount, periodUnit.toLowerCase())}) is no longer than its billing cycle, so it ends after one charge: ${setPeriod}`,
    );
  } else if (period < PERIOD_YEARS * 12 - 1e-6) {
    problems.push(
      `its subscription period is ${plural(periodCount, periodUnit.toLowerCase())}, so it stops renewing then: ${setPeriod}, the longest Dodo allows`,
    );
  }

  // Null is Dodo's default, which adds tax on top.
  if (price.tax_inclusive === true) problems.push(`its price includes tax; ${TAX_FIX}`);
  if (product.tax_category !== TAX_CATEGORY) {
    problems.push(
      product.tax_category === null
        ? "it has no tax category: set it to SaaS"
        : `its tax category is ${product.tax_category}: set it to SaaS`,
    );
  }
  if (price.purchasing_power_parity === true) {
    problems.push(`it has purchasing power parity on, ${ONE_PRICE}: turn it off`);
  }
  if (product.pricing_mode !== null) {
    problems.push(`it has localized prices (${product.pricing_mode}), ${ONE_PRICE}: remove them`);
  }
  const discountBps = price.discount_bps ?? (price.discount ?? 0) * 100;
  if (discountBps > 0) {
    problems.push(
      `it has a ${discountBps / 100}% discount, but the app shows the full price: remove it`,
    );
  }
  if (product.addons.length > 0) {
    problems.push(
      `it offers ${plural(product.addons.length, "add-on")}, which the app doesn't sell: remove ${product.addons.length === 1 ? "it" : "them"}`,
    );
  }

  problems.push(...trialProblems(entry, product));

  const plan = PLANS[entry.plan].name;
  if (!product.name?.trim()) {
    problems.push(
      `it has no name: buyers see it at checkout and on receipts, so name it for ${plan}`,
    );
  } else if (!namedFor(product.name, entry.plan)) {
    problems.push(
      `it holds the ${plan} price but is called "${product.name}": buyers see that name, so name it for ${plan}`,
    );
  }
  return problems;
}

function trialProblems(entry: ProductSlot, product: DodoProduct): string[] {
  const { trial_period_days: days, trial_amount: amount, currency } = product.price;
  const only = "only DODO_PRO_TRIAL_PRODUCT_ID should";
  if (!entry.trial) {
    if (days !== null && days > 0) return [`it has a ${days}-day trial; ${only}`];
    if (amount !== null && amount > 0)
      return [`it has a trial charge of ${money(amount, currency)}; ${only}`];
    return [];
  }
  if (days === null || days <= 0)
    return [`it has no trial; it needs a ${PRO_TRIAL.days}-day trial`];
  const problems: string[] = [];
  if (days !== PRO_TRIAL.days) {
    problems.push(
      `its trial is ${plural(days, "day")}, not ${plural(PRO_TRIAL.days, "day")} (PRO_TRIAL in src/config/plans.ts)`,
    );
  }
  const wanted = wantedTrialAmount();
  const charged = amount ?? 0;
  if (charged !== (wanted ?? 0)) {
    problems.push(
      wanted === null
        ? `it charges ${money(charged, currency)} for the trial; the trial must be free`
        : charged === 0
          ? `its trial is free; it must charge ${money(wanted, CURRENCY)} (PRO_TRIAL in src/config/plans.ts)`
          : `it charges ${money(charged, currency)} for the trial, not ${money(wanted, CURRENCY)} (PRO_TRIAL in src/config/plans.ts)`,
    );
  }
  if (product.price.trial_payment_method_optional === true) {
    problems.push("its trial doesn't ask for a card; it must (turn off payment method optional)");
  }
  return problems;
}

function describe(entry: ProductSlot, product: DodoProduct): string {
  const { price, currency, trial_period_days: days, trial_amount: amount } = product.price;
  const charge = `${money(price ?? 0, currency)} every ${entry.interval} plus tax`;
  const trial = entry.trial
    ? `after a ${days}-day trial charging ${money(amount ?? 0, currency)}, card required`
    : "no trial";
  return `${charge}, ${trial}`;
}

// Buyers see the product name at checkout and on receipts, so it names its own plan and no other.
function namedFor(name: string, plan: PaidPlanId): boolean {
  const words = new Set(name.toLowerCase().split(/[^a-z\d]+/));
  return PAID_PLANS.every(
    (other) => words.has(PLANS[other].name.toLowerCase()) === (other === plan),
  );
}

function missingMax(config: CatalogConfig): CatalogCheck[] {
  const variables = PRODUCT_SLOTS.filter((entry) => entry.plan === "max").map(
    (entry) => entry.variable,
  );
  if (variables.some((variable) => config.productIds[variable])) return [];
  const name = PLANS.max.name;
  return [
    problem(`${name}: neither ${listOf(variables, "nor")} is set, so ${name} isn't offered.`),
  ];
}

function duplicateChecks(config: CatalogConfig): CatalogCheck[] {
  const byId = new Map<string, string[]>();
  for (const variable of PRODUCT_VARIABLES) {
    const id = config.productIds[variable];
    if (id) byId.set(id, [...(byId.get(id) ?? []), variable]);
  }
  const topup = config.topupProductId;
  if (topup) byId.set(topup, [...(byId.get(topup) ?? []), TOPUP_VARIABLE]);
  return [...byId.values()]
    .filter((variables) => variables.length > 1)
    .map((variables) =>
      problem(`${listOf(variables)} hold the same product id: each needs its own product.`),
    );
}

export function webhookProblems(endpoint: WebhookEndpoint): string[] {
  const problems: string[] = [];
  if (endpoint.disabled) problems.push("it is disabled, so no event reaches the app: enable it");
  const types = endpoint.filter_types ?? [];
  if (types.length === 0) {
    problems.push(
      "it has no event list, so it sends every event type: run scripts/dodo-setup.ts to set one",
    );
    return problems;
  }
  const missing = DODO_WEBHOOK_EVENTS.filter((event) => !types.includes(event));
  if (missing.length > 0) {
    problems.push(
      `it doesn't send ${listOf(missing)}: run scripts/dodo-setup.ts to add ${missing.length === 1 ? "it" : "them"}`,
    );
  }
  return problems;
}

function webhookChecks(config: CatalogConfig, reads: CatalogReads): CatalogCheck[] {
  const { webhooks, secretMatches } = reads;
  if (!webhooks.found) {
    if (webhooks.reason === "forbidden") {
      return [
        ok(
          "Webhook endpoint not checked: the API key can't read webhooks (HTTP 403). Give it Webhooks read, or check the endpoint in the Dodo dashboard.",
        ),
      ];
    }
    return [problem(failureMessage("Webhook endpoints", webhooks, config.environment, "webhooks"))];
  }
  const url = webhookUrl(config.appUrl);
  const matching = endpointsFor(webhooks.items, config.appUrl);
  const [first] = matching;
  if (!first) {
    const others = webhooks.items.slice(0, 5).map((endpoint) => endpoint.url);
    const found = others.length > 0 ? `. Endpoints found: ${listOf(others)}` : "";
    return [problem(`No webhook endpoint sends to ${url}: run scripts/dodo-setup.ts${found}.`)];
  }
  const checks: CatalogCheck[] = [];
  if (matching.length > 1) {
    checks.push(
      problem(
        `${matching.length} webhook endpoints send to ${url} (${listOf(matching.map((endpoint) => endpoint.id))}): delete all but one.`,
      ),
    );
  }
  for (const endpoint of matching) {
    for (const text of webhookProblems(endpoint)) {
      checks.push(problem(`Webhook endpoint ${endpoint.id}: ${text}.`));
    }
  }
  if (secretMatches === false) {
    checks.push(
      problem(
        `DODO_WEBHOOK_SECRET isn't the signing secret of webhook endpoint ${first.id}: copy it from the endpoint, or run scripts/dodo-setup.ts. Test and live mode endpoints have different secrets.`,
      ),
    );
  }
  if (checks.length > 0) return checks;
  const signed = secretMatches ? ", signed with DODO_WEBHOOK_SECRET" : "";
  return [
    ok(
      `Webhook endpoint ${first.id}: sends ${first.filter_types?.length ?? 0} event types to ${url}${signed}.`,
    ),
  ];
}

function listOf(items: readonly string[], joiner = "and"): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${joiner} ${items.at(-1)}`;
}
