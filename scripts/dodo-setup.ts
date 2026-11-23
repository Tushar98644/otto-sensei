// Sets up a Dodo Payments account for the app and writes the ids to its env file. bun --env-file=.env.dodo.local scripts/dodo-setup.ts (live: .env.dodo.live.local)
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import {
  DEFAULT_APP_URL,
  DODO_API_URL,
  DODO_WEBHOOK_EVENTS,
  PRODUCT_SLOTS,
  appOrigin,
  endpointsFor,
  failureMessage,
  keyEnvironment,
  listDodoProducts,
  listDodoWebhooks,
  productProblems,
  productSpec,
  readDodoProduct,
  readWebhookSecret,
  slotTagged,
  TOPUP_LABEL,
  TOPUP_VARIABLE,
  topupProblems,
  topupSpec,
  topupTagged,
  webhookUrl,
  type DodoProduct,
  type DodoProductSummary,
  type DodoReadFailure,
  type ProductSlot,
} from "../src/lib/billing/dodo-catalog";
import { isDodoId } from "../src/lib/billing/dodo-status";
import { env } from "../src/lib/env";

const ENVIRONMENT = env().DODO_ENVIRONMENT;
// Live values go to their own file, so the test mode ones stay usable for testing.
const ENV_FILE = ENVIRONMENT === "live" ? ".env.dodo.live.local" : ".env.dodo.local";
const APP_URL = appOrigin(process.env.DODO_SETUP_APP_URL?.trim() || DEFAULT_APP_URL);
const KEY = (process.env.DODO_SETUP_API_KEY ?? "").trim();
const ACCESS = { apiKey: KEY, environment: ENVIRONMENT };
const WEBHOOK_DESCRIPTION = "Otto Sensei app";
const TIMEOUT_MS = 15_000;

const redact = (text: string) => text.replace(/\b(dodo_(test|live)_|whsec_)\S+/g, "$1[redacted]");

// Writes are never retried: Dodo has no idempotency keys, and a rerun finds what a lost answer made.
async function send(method: "POST" | "PATCH", path: string, body: unknown): Promise<unknown> {
  const response = await fetch(new URL(path, DODO_API_URL[ENVIRONMENT]), {
    method,
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await response.text().catch(() => "");
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!response.ok) {
    const error = (json ?? {}) as { code?: unknown; message?: unknown };
    const code = typeof error.code === "string" ? error.code : "unreadable_answer";
    const message =
      typeof error.message === "string" ? ` (${redact(error.message).slice(0, 300)})` : "";
    throw new Error(`${method} ${path} failed: HTTP ${response.status} ${code}${message}`);
  }
  return json;
}

function must<T extends { found: true }>(lookup: T | DodoReadFailure, where: string): T {
  if (!lookup.found) throw new Error(failureMessage(where, lookup, ENVIRONMENT));
  return lookup;
}

async function readProduct(id: string, where: string): Promise<DodoProduct> {
  return must(await readDodoProduct(id, ACCESS), where).product;
}

function writeEnv(values: Record<string, string>) {
  for (const [key, value] of Object.entries(values)) {
    if (!value || /\s/.test(value)) throw new Error(`Refusing to write an empty or spaced ${key}.`);
  }
  const text = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8") : "";
  const lines = text === "" ? [] : text.replace(/\n+$/, "").split("\n");
  const seen = new Set<string>();
  const out = lines.map((line) => {
    const key = /^\s*(?:export\s+)?([A-Za-z_]\w*)\s*=/.exec(line)?.[1];
    if (!key || !Object.hasOwn(values, key)) return line;
    seen.add(key);
    return `${key}=${values[key]}`;
  });
  for (const [key, value] of Object.entries(values))
    if (!seen.has(key)) out.push(`${key}=${value}`);
  writeFileSync(ENV_FILE, `${out.join("\n")}\n`, { mode: 0o600 });
  chmodSync(ENV_FILE, 0o600);
}

type ProductTarget = {
  label: string;
  variable: string;
  spec: { name: string };
  tagged: (metadata: Record<string, unknown>) => boolean;
  problems: (product: DodoProduct) => string[];
};

function slotTarget(entry: ProductSlot): ProductTarget {
  return {
    label: entry.label,
    variable: entry.variable,
    spec: productSpec(entry),
    tagged: (metadata) => slotTagged(metadata, entry),
    problems: (product) => productProblems(entry, product),
  };
}

const TOPUP_TARGET: ProductTarget = {
  label: TOPUP_LABEL,
  variable: TOPUP_VARIABLE,
  spec: topupSpec(),
  tagged: topupTagged,
  problems: topupProblems,
};

async function ensureProduct(entry: ProductTarget, active: DodoProductSummary[]): Promise<string> {
  const spec = entry.spec;
  const tagged = active.filter((item) => entry.tagged(item.metadata));
  const products = await Promise.all(
    tagged.map((item) => readProduct(item.product_id, `${entry.label} (${item.product_id})`)),
  );
  const fits = (product: DodoProduct) =>
    product.name === spec.name && entry.problems(product).length === 0;
  const chosen = products.find(fits) ?? products[0];
  const others = products.filter((product) => product !== chosen).map((p) => p.product_id);
  if (others.length > 0) {
    console.log(`note     ${others.join(", ")} also tagged ${entry.label}: archive them`);
  }
  let id: string;
  let action: string;
  if (!chosen) {
    const created = (await send("POST", "/products", spec)) as { product_id?: unknown } | null;
    if (typeof created?.product_id !== "string" || !isDodoId("pdt", created.product_id)) {
      throw new Error(`Dodo didn't return the new ${entry.label} product's id.`);
    }
    id = created.product_id;
    action = "created";
  } else if (fits(chosen)) {
    console.log(`found    ${entry.variable}  ${chosen.product_id}`);
    return chosen.product_id;
  } else {
    id = chosen.product_id;
    // PATCH keeps the id, so the env and existing subscriptions stay on it; those keep their old price.
    await send("PATCH", `/products/${encodeURIComponent(id)}`, {
      ...spec,
      ...(chosen.addons.length > 0 ? { addons: [] } : {}),
      ...(chosen.pricing_mode !== null ? { pricing_mode: null } : {}),
    });
    action = "updated";
  }
  console.log(`${action.padEnd(8)} ${entry.variable}  ${id}`);
  const left = entry.problems(await readProduct(id, `${entry.label} (${id})`));
  for (const text of left) {
    console.log(`warning  ${entry.label} (${id}): ${text}`);
    process.exitCode = 2;
  }
  return id;
}

function sameEvents(types: string[] | null): boolean {
  const have = new Set(types ?? []);
  return have.size === DODO_WEBHOOK_EVENTS.length && DODO_WEBHOOK_EVENTS.every((e) => have.has(e));
}

async function ensureWebhook(): Promise<string> {
  const url = webhookUrl(APP_URL);
  const listed = must(await listDodoWebhooks(ACCESS), "Webhook endpoints");
  const [found, ...extra] = endpointsFor(listed.items, APP_URL);
  if (extra.length > 0) {
    console.log(`note     ${extra.map((e) => e.id).join(", ")} also send to ${url}: delete them`);
  }
  let id: string;
  const body = { filter_types: [...DODO_WEBHOOK_EVENTS], disabled: false };
  if (!found) {
    const created = (await send("POST", "/webhooks", {
      url,
      description: WEBHOOK_DESCRIPTION,
      ...body,
    })) as { id?: unknown } | null;
    if (typeof created?.id !== "string" || !created.id) {
      throw new Error("Dodo didn't return the new webhook endpoint's id.");
    }
    id = created.id;
    console.log(`created  webhook  ${url}  ${id}`);
  } else if (found.disabled || !sameEvents(found.filter_types)) {
    id = found.id;
    await send("PATCH", `/webhooks/${encodeURIComponent(id)}`, body);
    console.log(`updated  webhook  ${url}  ${id}  (${DODO_WEBHOOK_EVENTS.length} event types)`);
  } else {
    id = found.id;
    console.log(`found    webhook  ${url}  ${id}`);
  }
  const { secret } = must(await readWebhookSecret(id, ACCESS), `Webhook endpoint ${id}`);
  if (!secret.startsWith("whsec_")) {
    throw new Error(`Webhook endpoint ${id}'s secret doesn't start with whsec_.`);
  }
  return secret;
}

const CHECKLIST = [
  "Set these by hand in the Dodo dashboard, in this mode (test and live each have their own):",
  "- Adaptive Currency off, so buyers pay the USD price plus tax.",
  "- Customer portal: cancellation at the next billing date on; immediate cancellation, subscription updates and pause off.",
  "- Allow Multiple Subscriptions off.",
  "- Subscription grace period on, 3 days, ending in on hold; payment retries on.",
  "- Prevent Trial Misuse off: the app decides who gets the trial.",
  "- Customer emails: Subscription Trial Ending off (the app sends its own reminder); keep payment, plan change, refund, cancellation and renewal reminder emails.",
  "- Visa RDR on.",
  "- Brand name Otto Sensei, the support email, and a statement descriptor such as DODOPAY_OTTOSENSEI.",
  "Then:",
  "- Make the app's API key: Write on Checkout Sessions, Subscriptions and Refunds; Read on Customers, Payments, Products and Disputes; no IP allowlist. Save it as DODO_API_KEY.",
  "- Set BILLING_SIGNING_SECRET to the output of openssl rand -hex 32.",
  "- Give Vercel DODO_ENVIRONMENT, DODO_API_KEY, DODO_WEBHOOK_SECRET, BILLING_SIGNING_SECRET and the five plan DODO_*_PRODUCT_ID values.",
  "- Prepaid credit stays off until Vercel has DODO_TOPUP_PRODUCT_ID too: add it only once the owner says yes.",
  `- Check them: bun --env-file=${ENV_FILE} scripts/check-dodo-catalog.ts`,
];

async function main() {
  const keyMode = keyEnvironment(KEY);
  if (!keyMode) {
    throw new Error(
      `Put the setup key in ${ENV_FILE} as DODO_SETUP_API_KEY: it starts with dodo_test_ or dodo_live_, with Write on Products and Webhooks.`,
    );
  }
  if (keyMode !== ENVIRONMENT) {
    throw new Error(
      `DODO_ENVIRONMENT is ${ENVIRONMENT} but the setup key is a ${keyMode} mode key: use one mode's values.`,
    );
  }
  if (!URL.canParse(APP_URL) || new URL(APP_URL).protocol !== "https:") {
    throw new Error(
      "DODO_SETUP_APP_URL must be an https URL: Dodo only sends webhooks over https.",
    );
  }
  console.log(`Dodo Payments ${ENVIRONMENT} mode setup for ${APP_URL}`);
  writeEnv({ DODO_ENVIRONMENT: ENVIRONMENT });
  const active = must(await listDodoProducts(ACCESS, { archived: false }), "Products").items;
  // Each value is saved as soon as it is known, so a later failure loses nothing.
  for (const entry of [...PRODUCT_SLOTS.map(slotTarget), TOPUP_TARGET]) {
    writeEnv({ [entry.variable]: await ensureProduct(entry, active) });
  }
  writeEnv({ DODO_WEBHOOK_SECRET: await ensureWebhook() });
  console.log(`webhook  secret saved as DODO_WEBHOOK_SECRET`);
  console.log(`Wrote ${ENV_FILE} (mode 600). Nothing secret was printed.\n`);
  console.log(CHECKLIST.join("\n"));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? redact(error.message) : "Setup failed.");
  process.exit(1);
});
