import { z } from "zod";
import type { PaidPlanId } from "@/config/plans";
import { normalizeEmail } from "@/lib/auth/policy";
import { env } from "@/lib/env";
import { log } from "@/lib/log";
import { BillingError } from "./errors";
import { signBillingId } from "./paddle-sign";

const API_URL = {
  sandbox: "https://sandbox-api.paddle.com",
  live: "https://api.paddle.com",
} as const;

const TIMEOUT_MS = 8_000;
// Only reads retry, and briefly: a write retried after a timeout could act twice.
const READ_RETRY_DELAYS_MS = [250, 750];
const READ_RETRY_BUDGET_MS = 2_000;

const PAGE_SIZE = "200";
const PORTAL_SUBSCRIPTION_LIMIT = 25;
const LIVE_STATUSES = "active,trialing,past_due,paused";
const OPEN_TRANSACTION_STATUSES = "draft,ready";
const REFUSED_STATUSES: ReadonlySet<number> = new Set([400, 404, 409, 422]);
const ERROR_CODE = /^[a-z0-9_]{1,64}$/;
const CUSTOMER_ID = /\bctm_[a-z\d]{26}\b/;
const PADDLE_ID = /^(sub|ctm|txn|pri)_[a-z0-9]{26}$/;

export const REPLACES_METADATA_KEY = "replaces_subscription_id";

export type PaddleIdKind = "sub" | "ctm" | "txn" | "pri";

// Anything else (an old Creem id, say) is nothing at Paddle, so it is never sent there.
export function isPaddleId(kind: PaddleIdKind, id: string | null | undefined): id is string {
  return typeof id === "string" && id.startsWith(`${kind}_`) && PADDLE_ID.test(id);
}

type Operation = "checkout" | "portal" | "cancel" | "lookup" | "change_plan" | "refund";

export type PaddleSubscription = {
  id: string;
  status: "active" | "trialing" | "past_due" | "paused" | "canceled";
  customer_id: string;
  items: { price: { id: string }; trial_dates?: { starts_at: string; ends_at: string } | null }[];
  scheduled_change: { action: "cancel" | "pause" | "resume"; effective_at: string } | null;
  next_billed_at: string | null;
  current_billing_period: { starts_at: string; ends_at: string } | null;
  custom_data: Record<string, unknown> | null;
};

const Period = z.object({ starts_at: z.string(), ends_at: z.string() });

const SubscriptionSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["active", "trialing", "past_due", "paused", "canceled"]),
  customer_id: z.string().min(1),
  items: z.array(z.object({ price: z.object({ id: z.string() }), trial_dates: Period.nullish() })),
  scheduled_change: z
    .object({ action: z.enum(["cancel", "pause", "resume"]), effective_at: z.string() })
    .nullish()
    .transform((value) => value ?? null),
  next_billed_at: z
    .string()
    .nullish()
    .transform((value) => value ?? null),
  current_billing_period: Period.nullish().transform((value) => value ?? null),
  custom_data: z
    .record(z.string(), z.unknown())
    .nullish()
    .transform((value) => value ?? null),
}) satisfies z.ZodType<PaddleSubscription>;

const SubscriptionResponse = z.object({ data: SubscriptionSchema });
const SubscriptionList = z.object({ data: z.array(SubscriptionSchema) });
const CustomerResponse = z.object({ data: z.object({ id: z.string().min(1) }) });
const CustomerList = z.object({
  data: z.array(z.object({ id: z.string().min(1), email: z.string() })),
});
const TransactionResponse = z.object({
  data: z.object({ checkout: z.object({ url: z.url().nullish() }).nullish() }),
});
const TransactionList = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      customer_id: z.string().nullable(),
      subscription_id: z.string().nullable(),
    }),
  ),
});
const PortalResponse = z.object({
  data: z.object({ urls: z.object({ general: z.object({ overview: z.url() }) }) }),
});
const Anything = z.unknown();

const ErrorResponse = z.object({
  error: z.object({ code: z.string().optional(), detail: z.string().optional() }).optional(),
  meta: z.object({ request_id: z.string().optional() }).optional(),
});

class PaddleFailure extends Error {
  constructor(
    readonly kind: string,
    readonly info: { status?: number; code?: string; detail?: string; requestId?: string } = {},
  ) {
    super(kind);
    this.name = "PaddleFailure";
  }
}

type Call = {
  method: "GET" | "POST" | "PATCH";
  path: string;
  query?: Record<string, string>;
  body?: unknown;
};

async function send<T>(call: Call, schema: z.ZodType<T>): Promise<T> {
  const { PADDLE_API_KEY: key, PADDLE_ENVIRONMENT: environment } = env();
  if (!key) throw new BillingError("unavailable", "PADDLE_API_KEY is not set");
  const url = new URL(call.path, API_URL[environment]);
  for (const [name, value] of Object.entries(call.query ?? {})) url.searchParams.set(name, value);
  const init: RequestInit = {
    method: call.method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Paddle-Version": "1",
      "Content-Type": "application/json",
    },
    ...(call.body === undefined ? {} : { body: JSON.stringify(call.body) }),
  };
  const delays = call.method === "GET" ? [...READ_RETRY_DELAYS_MS] : [];
  const started = Date.now();
  for (;;) {
    let response: Response;
    try {
      response = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "TimeoutError";
      const delay = timedOut ? null : nextDelay(delays, started);
      if (delay !== null) {
        await sleep(delay);
        continue;
      }
      throw new PaddleFailure(timedOut ? "timeout" : "network");
    }
    if (response.ok) return parse(response, schema);
    const busy = response.status === 429 || response.status >= 500;
    const delay = busy ? nextDelay(delays, started) : null;
    if (delay !== null) {
      await response.body?.cancel();
      await sleep(delay);
      continue;
    }
    throw new PaddleFailure(`http_${response.status}`, {
      status: response.status,
      ...(await errorOf(response)),
    });
  }
}

function nextDelay(delays: number[], started: number): number | null {
  const delay = delays[0];
  if (delay === undefined || Date.now() - started + delay > READ_RETRY_BUDGET_MS) return null;
  delays.shift();
  return delay;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function parse<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
  const body: unknown = await response.json().catch(() => undefined);
  const parsed = schema.safeParse(body);
  if (parsed.success) return parsed.data;
  throw new PaddleFailure("unexpected_response", requestIdOf(body));
}

function requestIdOf(body: unknown): { requestId?: string } {
  const parsed = ErrorResponse.safeParse(body);
  const requestId = parsed.success ? parsed.data.meta?.request_id?.slice(0, 64) : undefined;
  return requestId ? { requestId } : {};
}

async function errorOf(response: Response) {
  const body: unknown = await response.json().catch(() => undefined);
  const parsed = ErrorResponse.safeParse(body);
  const code = parsed.success ? parsed.data.error?.code : undefined;
  return {
    ...requestIdOf(body),
    ...(code && ERROR_CODE.test(code) ? { code } : {}),
    ...(parsed.success && parsed.data.error?.detail ? { detail: parsed.data.error.detail } : {}),
  };
}

async function request<T>(operation: Operation, call: Call, schema: z.ZodType<T>): Promise<T> {
  try {
    return await send(call, schema);
  } catch (error) {
    throw providerFailure(operation, error);
  }
}

// Paddle's error detail can echo the customer's email, so only the kind, status, code and request id are logged.
function providerFailure(operation: Operation, error: unknown): BillingError {
  if (error instanceof BillingError) return error;
  if (!(error instanceof PaddleFailure)) {
    log.error("billing.provider_failed", error, { operation });
    return new BillingError("provider_error", `Paddle ${operation} request failed`, { operation });
  }
  const { status, code, requestId } = error.info;
  log.error("billing.provider_failed", error.kind, {
    operation,
    status,
    requestId,
    providerCode: code,
  });
  if (status !== undefined && status >= 400 && status < 500) {
    return new BillingError("refused", `Paddle refused the ${operation} request`, {
      operation,
      providerStatus: status,
      ...(code ? { providerCode: code } : {}),
    });
  }
  return new BillingError("provider_error", `Paddle ${operation} request failed`, { operation });
}

const segment = (id: string) => encodeURIComponent(id);

export async function getPaddleSubscription(id: string): Promise<PaddleSubscription> {
  return readSubscription(id, "lookup");
}

async function readSubscription(id: string, operation: Operation): Promise<PaddleSubscription> {
  if (!isPaddleId("sub", id)) {
    throw new BillingError("no_subscription", "Not a Paddle subscription id", { operation });
  }
  const response = await request(
    operation,
    { method: "GET", path: `/subscriptions/${segment(id)}` },
    SubscriptionResponse,
  );
  return response.data;
}

export type CancelOutcome = "cancelled" | "already_ended";

export async function cancelPaddleSubscription(
  id: string,
  opts: { immediately: boolean },
): Promise<void> {
  await cancelSubscription(id, opts.immediately);
}

export async function endPaddleSubscription(id: string): Promise<CancelOutcome> {
  return cancelSubscription(id, true);
}

async function cancelSubscription(id: string, immediately: boolean): Promise<CancelOutcome> {
  if (!isPaddleId("sub", id)) {
    log.warn("billing.cancel_skipped", { operation: "cancel", reason: "not_a_paddle_id" });
    return "already_ended";
  }
  try {
    await send(
      {
        method: "POST",
        path: `/subscriptions/${segment(id)}/cancel`,
        body: { effective_from: immediately ? "immediately" : "next_billing_period" },
      },
      Anything,
    );
    return "cancelled";
  } catch (error) {
    const info = error instanceof PaddleFailure ? error.info : {};
    if (info.status === undefined || !REFUSED_STATUSES.has(info.status)) {
      throw providerFailure("cancel", error);
    }
    // Sandbox and live ids look alike, so a 404 may mean this build talks to the other environment.
    if (info.status === 404) {
      log.error("billing.cancel_not_found", "Paddle has no such subscription", {
        operation: "cancel",
        subscriptionId: id,
        environment: env().PADDLE_ENVIRONMENT,
        requestId: info.requestId,
      });
    }
  }
  // An earlier timed-out cancel may have gone through before its webhook: Paddle's status decides.
  const subscription = await readSubscription(id, "cancel");
  if (subscription.status === "canceled") return "already_ended";
  const scheduledAction = subscription.scheduled_change?.action;
  // Paddle may refuse to cancel over a pending cancel (say, from the portal); it can't charge again either way.
  if (scheduledAction === "cancel") {
    log.info("billing.cancel_already_scheduled", { operation: "cancel", status: subscription.status });
    return "already_ended";
  }
  log.error("billing.provider_failed", "cancel refused for a live subscription", {
    operation: "cancel",
    status: subscription.status,
    scheduledAction,
  });
  throw new BillingError("provider_error", "Paddle refused to cancel the subscription", {
    operation: "cancel",
  });
}

export async function changePaddlePlan(subscriptionId: string, priceId: string): Promise<void> {
  if (!isPaddleId("sub", subscriptionId)) {
    throw new BillingError("no_subscription", "Not a Paddle subscription id", {
      operation: "change_plan",
    });
  }
  assertPriceId(priceId);
  await request(
    "change_plan",
    {
      method: "PATCH",
      path: `/subscriptions/${segment(subscriptionId)}`,
      body: {
        items: [{ price_id: priceId, quantity: 1 }],
        proration_billing_mode: "prorated_immediately",
      },
    },
    Anything,
  );
}

export async function listLivePaddleSubscriptions(q: {
  customerId?: string | null;
  email?: string | null;
}): Promise<PaddleSubscription[]> {
  const customerIds = new Set<string>();
  if (isPaddleId("ctm", q.customerId)) customerIds.add(q.customerId);
  if (q.email) {
    const byEmail = await customerWithEmail(normalizeEmail(q.email), "lookup");
    if (byEmail) customerIds.add(byEmail);
  }
  if (customerIds.size === 0) return [];
  const list = await request(
    "lookup",
    {
      method: "GET",
      path: "/subscriptions",
      query: { customer_id: [...customerIds].join(","), status: LIVE_STATUSES, per_page: PAGE_SIZE },
    },
    SubscriptionList,
  );
  return list.data.filter(
    (subscription) =>
      customerIds.has(subscription.customer_id) && subscription.status !== "canceled",
  );
}

// Exact matches only: a near match is someone else's billing.
async function customerWithEmail(email: string, operation: Operation): Promise<string | null> {
  const list = await request(
    operation,
    { method: "GET", path: "/customers", query: { email } },
    CustomerList,
  );
  const found = list.data.find((customer) => normalizeEmail(customer.email) === email)?.id;
  return isPaddleId("ctm", found) ? found : null;
}

async function customerFor(email: string): Promise<string> {
  const normalized = normalizeEmail(email);
  const found = await customerWithEmail(normalized, "checkout");
  if (found) return found;
  try {
    const created = await send(
      { method: "POST", path: "/customers", body: { email: normalized } },
      CustomerResponse,
    );
    return created.data.id;
  } catch (error) {
    // Another checkout created it a moment ago: Paddle names it in the conflict.
    if (error instanceof PaddleFailure && error.info.status === 409) {
      const named = CUSTOMER_ID.exec(error.info.detail ?? "")?.[0];
      const id = named ?? (await customerWithEmail(normalized, "checkout"));
      if (id) return id;
    }
    throw providerFailure("checkout", error);
  }
}

export async function createPaddleCheckout(input: {
  userId: string;
  email: string;
  customerId: string | null;
  priceId: string;
  plan: PaidPlanId;
  trial: boolean;
  replacesSubscriptionId?: string;
}): Promise<{ url: string; customerId: string }> {
  const secret = env().PADDLE_WEBHOOK_SECRET;
  if (!secret) throw new BillingError("unavailable", "PADDLE_WEBHOOK_SECRET is not set");
  assertPriceId(input.priceId);
  const replaces = input.replacesSubscriptionId;
  const customerId = isPaddleId("ctm", input.customerId)
    ? input.customerId
    : await customerFor(input.email);
  await cancelOpenCheckouts(customerId);
  const transaction = await request(
    "checkout",
    {
      method: "POST",
      path: "/transactions",
      body: {
        items: [{ price_id: input.priceId, quantity: 1 }],
        customer_id: customerId,
        custom_data: {
          user_id: input.userId,
          user_sig: signBillingId(input.userId, secret),
          ...(replaces
            ? { [REPLACES_METADATA_KEY]: replaces, replaces_sig: signBillingId(replaces, secret) }
            : {}),
        },
      },
    },
    TransactionResponse,
  );
  const link = transaction.data.checkout?.url;
  if (!link) {
    log.error("billing.provider_failed", "transaction without a checkout URL", {
      operation: "checkout",
    });
    throw new BillingError("provider_error", "Paddle returned no checkout URL", {
      operation: "checkout",
    });
  }
  const url = new URL(link);
  url.searchParams.set("plan", input.plan);
  if (input.trial) url.searchParams.set("trial", "1");
  return { url: url.toString(), customerId };
}

export async function completedPaddleTransactions(subscriptionId: string): Promise<string[]> {
  const list = await request(
    "refund",
    {
      method: "GET",
      path: "/transactions",
      query: { subscription_id: subscriptionId, status: "completed" },
    },
    TransactionList,
  );
  return list.data.map(({ id }) => id).filter((id) => isPaddleId("txn", id));
}

export async function refundPaddleTransaction(transactionId: string): Promise<void> {
  assertTransactionId(transactionId);
  await request(
    "refund",
    {
      method: "POST",
      path: "/adjustments",
      body: {
        action: "refund",
        type: "full",
        transaction_id: transactionId,
        reason: "This account had already used its trial, so the new trial was cancelled.",
      },
    },
    Anything,
  );
}

function assertTransactionId(id: string): void {
  if (!isPaddleId("txn", id)) {
    throw new BillingError("provider_error", "That isn't a Paddle transaction id", {
      operation: "refund",
    });
  }
}

// A checkout link stays payable after it's made: an older one paid later would be a second subscription.
async function cancelOpenCheckouts(customerId: string): Promise<void> {
  let open: z.infer<typeof TransactionList>["data"];
  try {
    const list = await send(
      {
        method: "GET",
        path: "/transactions",
        query: { customer_id: customerId, status: OPEN_TRANSACTION_STATUSES },
      },
      TransactionList,
    );
    open = list.data;
  } catch (error) {
    openCheckoutNotCancelled("list", error);
    return;
  }
  // A card update or a renewal belongs to a subscription; only this customer's checkouts for a new one end.
  const stale = open.filter(
    (transaction) =>
      transaction.customer_id === customerId &&
      transaction.subscription_id === null &&
      isPaddleId("txn", transaction.id),
  );
  for (const { id } of stale) {
    try {
      await send(
        { method: "PATCH", path: `/transactions/${segment(id)}`, body: { status: "canceled" } },
        Anything,
      );
      log.info("billing.open_checkout_cancelled", { operation: "checkout", transactionId: id });
    } catch (error) {
      openCheckoutNotCancelled("cancel", error, id);
    }
  }
}

function openCheckoutNotCancelled(step: "list" | "cancel", error: unknown, transactionId?: string) {
  const failure = error instanceof PaddleFailure ? error : null;
  log.warn("billing.open_checkout_cancel_failed", {
    operation: "checkout",
    step,
    transactionId,
    kind: failure?.kind ?? (error instanceof BillingError ? error.code : "unknown"),
    status: failure?.info.status,
    providerCode: failure?.info.code,
    requestId: failure?.info.requestId,
  });
}

function assertPriceId(priceId: string): void {
  if (!isPaddleId("pri", priceId)) {
    throw new BillingError("unavailable", "The price id is not a Paddle price id (pri_...)");
  }
}

export async function paddlePortalUrl(customerId: string, subscriptionIds: string[]): Promise<string> {
  if (!isPaddleId("ctm", customerId)) {
    throw new BillingError("no_subscription", "Not a Paddle customer id", { operation: "portal" });
  }
  const ids = subscriptionIds
    .filter((id) => isPaddleId("sub", id))
    .slice(0, PORTAL_SUBSCRIPTION_LIMIT);
  const session = await request(
    "portal",
    {
      method: "POST",
      path: `/customers/${segment(customerId)}/portal-sessions`,
      body: ids.length > 0 ? { subscription_ids: ids } : {},
    },
    PortalResponse,
  );
  return session.data.urls.general.overview;
}
