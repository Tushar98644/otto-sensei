// Sets up a Paddle account for the app and writes the values back to its env file. bun --env-file=.env.paddle.local scripts/paddle-setup.ts (live: .env.paddle.live.local)
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { PRICES_USD, PRO_TRIAL, type PaidPlanId } from "../src/config/plans";

const live = /^(live|production)$/i.test((process.env.PADDLE_ENVIRONMENT ?? "").trim());
// Live values go to their own file, so the sandbox ones stay usable for testing.
const ENV_FILE = live ? ".env.paddle.live.local" : ".env.paddle.local";
const APP_URL = (process.env.PADDLE_SETUP_APP_URL ?? "https://www.ottosensei.com").replace(
  /\/$/,
  "",
);
const BASE = live ? "https://api.paddle.com" : "https://sandbox-api.paddle.com";
const KEY = (process.env.PADDLE_SETUP_API_KEY ?? "").trim();
const EVENTS = [
  "subscription.created",
  "subscription.trialing",
  "subscription.activated",
  "subscription.updated",
  "subscription.past_due",
  "subscription.paused",
  "subscription.resumed",
  "subscription.canceled",
  "transaction.completed",
  "adjustment.created",
  "adjustment.updated",
];

type Entity = Record<string, unknown> & { id: string };
type PriceSpec = { env: string; plan: PaidPlanId; interval: "month" | "year"; trial: boolean };

const PRICES: PriceSpec[] = [
  { env: "PADDLE_PRO_MONTHLY_PRICE_ID", plan: "pro", interval: "month", trial: false },
  { env: "PADDLE_PRO_TRIAL_PRICE_ID", plan: "pro", interval: "month", trial: true },
  { env: "PADDLE_PRO_YEARLY_PRICE_ID", plan: "pro", interval: "year", trial: false },
  { env: "PADDLE_MAX_MONTHLY_PRICE_ID", plan: "max", interval: "month", trial: false },
  { env: "PADDLE_MAX_YEARLY_PRICE_ID", plan: "max", interval: "year", trial: false },
];
const PRODUCT_NAMES: Record<PaidPlanId, string> = {
  pro: "Otto Sensei Pro",
  max: "Otto Sensei Max",
};

async function paddle<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Paddle-Version": "1",
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await response.json().catch(() => null)) as {
    data?: T;
    error?: { code?: string; detail?: string };
  } | null;
  if (!response.ok || !json || json.data === undefined) {
    const code = json?.error?.code ?? "unreadable_answer";
    throw new Error(
      `${method} ${path.split("?")[0]} failed: ${response.status} ${code}${json?.error?.detail ? ` (${json.error.detail})` : ""}`,
    );
  }
  return json.data;
}

const list = (path: string) => paddle<Entity[]>("GET", path);

function cents(usd: number): string {
  return String(Math.round(usd * 100));
}

async function ensureProduct(plan: PaidPlanId): Promise<string> {
  const name = PRODUCT_NAMES[plan];
  const found = (await list("/products?status=active&per_page=200")).find((p) => p.name === name);
  if (found) return found.id;
  const created = await paddle<Entity>("POST", "/products", {
    name,
    tax_category: "saas",
    description: `${name} subscription`,
    custom_data: { otto_plan: plan },
  });
  return created.id;
}

function matches(price: Entity, spec: PriceSpec): boolean {
  const cycle = price.billing_cycle as { interval?: string; frequency?: number } | null;
  const trial = price.trial_period as { interval?: string; frequency?: number } | null;
  const unit = price.unit_price as { amount?: string; currency_code?: string } | null;
  return (
    cycle?.interval === spec.interval &&
    cycle.frequency === 1 &&
    unit?.amount === cents(PRICES_USD[spec.plan][spec.interval]) &&
    unit.currency_code === "USD" &&
    price.tax_mode === "external" &&
    (spec.trial ? trial?.interval === "day" && trial.frequency === PRO_TRIAL.days : trial === null)
  );
}

async function ensurePrice(productId: string, spec: PriceSpec): Promise<string> {
  const existing = await list(`/prices?product_id=${productId}&status=active&per_page=200`);
  const found = existing.find((price) => matches(price, spec));
  if (found) return found.id;
  const label = `${spec.interval === "month" ? "Monthly" : "Yearly"}${spec.trial ? `, ${PRO_TRIAL.days}-day trial` : ""}`;
  const created = await paddle<Entity>("POST", "/prices", {
    product_id: productId,
    description: `${PRODUCT_NAMES[spec.plan]}: ${label}`,
    name: label,
    unit_price: { amount: cents(PRICES_USD[spec.plan][spec.interval]), currency_code: "USD" },
    billing_cycle: { interval: spec.interval, frequency: 1 },
    trial_period: spec.trial
      ? { interval: "day", frequency: PRO_TRIAL.days, requires_payment_method: true }
      : null,
    tax_mode: "external",
    quantity: { minimum: 1, maximum: 1 },
    custom_data: { otto_price: spec.env },
  });
  return created.id;
}

async function ensureWebhook(): Promise<string> {
  const destination = `${APP_URL}/api/billing/webhook`;
  const found = (await list("/notification-settings")).find((n) => n.destination === destination);
  const secretOf = (n: Entity) =>
    typeof n.endpoint_secret_key === "string" ? n.endpoint_secret_key : "";
  if (found) {
    const secret = secretOf(found);
    if (!secret)
      throw new Error("The webhook destination exists but Paddle didn't return its secret.");
    return secret;
  }
  const created = await paddle<Entity>("POST", "/notification-settings", {
    description: "Otto Sensei app",
    type: "url",
    destination,
    api_version: 1,
    include_sensitive_fields: false,
    subscribed_events: EVENTS,
    traffic_source: live ? "platform" : "all",
  });
  const secret = secretOf(created);
  if (!secret) throw new Error("Paddle didn't return the new webhook destination's secret.");
  return secret;
}

async function ensureClientToken(): Promise<string> {
  const name = "otto-sensei-web";
  const found = (await list("/client-tokens?status=active")).find((t) => t.name === name);
  if (found && typeof found.token === "string") return found.token;
  const created = await paddle<Entity>("POST", "/client-tokens", {
    name,
    description: "Paddle.js on the app's /checkout page",
  });
  if (typeof created.token !== "string") throw new Error("Paddle didn't return the client token.");
  return created.token;
}

function writeEnv(values: Record<string, string>) {
  const lines = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8").split("\n") : [];
  const seen = new Set<string>();
  const out = lines.map((line) => {
    const key = line.split("=")[0]?.trim() ?? "";
    if (key in values) {
      seen.add(key);
      return `${key}=${values[key]}`;
    }
    return line;
  });
  for (const [key, value] of Object.entries(values))
    if (!seen.has(key)) out.push(`${key}=${value}`);
  writeFileSync(ENV_FILE, `${out.filter((l, i) => l !== "" || i < out.length - 1).join("\n")}\n`);
  chmodSync(ENV_FILE, 0o600);
}

async function main() {
  if (!/^pdl_(sdbx|live)_apikey_/.test(KEY)) {
    throw new Error(`Put the setup key in ${ENV_FILE} as PADDLE_SETUP_API_KEY.`);
  }
  if (KEY.startsWith("pdl_live_") !== live) {
    throw new Error("PADDLE_ENVIRONMENT and the setup key's environment disagree.");
  }
  console.log(`Paddle ${live ? "live" : "sandbox"} setup for ${APP_URL}`);
  const values: Record<string, string> = { PADDLE_ENVIRONMENT: live ? "live" : "sandbox" };
  for (const plan of ["pro", "max"] as const) {
    const productId = await ensureProduct(plan);
    console.log(`product  ${PRODUCT_NAMES[plan]}  ${productId}`);
    for (const spec of PRICES.filter((p) => p.plan === plan)) {
      values[spec.env] = await ensurePrice(productId, spec);
      console.log(`price    ${spec.env}  ${values[spec.env]}`);
    }
  }
  values.PADDLE_WEBHOOK_SECRET = await ensureWebhook();
  console.log(`webhook  ${APP_URL}/api/billing/webhook  (secret saved)`);
  values.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN = await ensureClientToken();
  console.log(`token    client-side token  (saved)`);
  await paddle("PATCH", "/settings/checkout-url", { default_url: `${APP_URL}/checkout` });
  console.log(`checkout default payment link  ${APP_URL}/checkout`);
  writeEnv(values);
  console.log(`Wrote ${ENV_FILE}. Nothing secret was printed.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
