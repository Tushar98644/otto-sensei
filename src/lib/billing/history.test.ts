import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRO_TRIAL } from "@/config/plans";
import { insertUserRow, resetDb } from "@/lib/auth/test-helpers";
import type { SessionUser } from "@/lib/auth/types";
import { resetEnvForTests } from "@/lib/env";
import { DAY_MS } from "@/lib/time";
import { dodoId } from "./dodo-testing";
import {
  billingHistory,
  cardOf,
  invoiceFor,
  isCharge,
  mockHistory,
  paymentItem,
  paymentStatus,
  TRIAL_ITEM,
} from "./history";
import { EMPTY_HISTORY } from "./history-types";

const NOW = Date.UTC(2026, 10, 21, 12);
const PRO_MONTH = dodoId("pdt", "promonth");
const PRO_TRIAL_PRODUCT = dodoId("pdt", "protrial");
const MAX_MONTH = dodoId("pdt", "maxmonth");
const MINE = dodoId("cus", "mine");
const THEIRS = dodoId("cus", "theirs");
const MY_SUB = dodoId("sub", "mine");
const MY_PAY = dodoId("pay", "mine1");
const MY_RENEWAL = dodoId("pay", "mine2");
const MY_FAILED = dodoId("pay", "mine3");
const THEIR_PAY = dodoId("pay", "theirs1");
const PDF = new TextEncoder().encode("%PDF-1.4\nfake invoice\n%%EOF\n");

type Payment = {
  payment_id: string;
  customer: string;
  status: string;
  created_at: string;
  total_amount?: number;
  charge_type?: string;
  refund_status?: string | null;
  card_last_four?: string | null;
  card_network?: string | null;
  card_exp_month?: string | null;
  card_exp_year?: string | null;
  metadata?: Record<string, string>;
};

let payments: Payment[] = [];
let calls: string[] = [];

const entity = (payment: Payment) => ({
  payment_id: payment.payment_id,
  status: payment.status,
  customer: { customer_id: payment.customer, email: "x@example.com", name: "X" },
  subscription_id: payment.customer === MINE ? MY_SUB : dodoId("sub", "theirs"),
  subscription_ids: [],
  total_amount: payment.total_amount ?? 1500,
  currency: "USD",
  created_at: payment.created_at,
  charge_type: payment.charge_type ?? "renewal",
  refund_status: payment.refund_status ?? null,
  card_last_four: payment.card_last_four ?? null,
  card_network: payment.card_network ?? null,
  card_exp_month: payment.card_exp_month ?? null,
  card_exp_year: payment.card_exp_year ?? null,
  metadata: payment.metadata ?? {},
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

// A small Dodo: only the reads billing history makes.
function installDodo() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request) => {
      const url = new URL(input instanceof Request ? input.url : input);
      calls.push(`${url.pathname}${url.search}`);
      if (url.pathname === "/payments") {
        const customer = url.searchParams.get("customer_id");
        // A sloppy filter, so the code's own customer check is what keeps other people's rows out.
        return json({ items: payments.filter(() => customer !== null).map(entity) });
      }
      const one = /^\/payments\/([^/]+)$/.exec(url.pathname);
      if (one) {
        const found = payments.find((payment) => payment.payment_id === one[1]);
        return found ? json(entity(found)) : json({ code: "NOT_FOUND", message: "No" }, 404);
      }
      if (url.pathname === `/subscriptions/${MY_SUB}`) {
        return json({
          subscription_id: MY_SUB,
          status: "active",
          product_id: PRO_MONTH,
          customer: { customer_id: MINE, email: "x@example.com" },
          created_at: "2026-10-21T12:00:00Z",
          previous_billing_date: "2026-11-21T12:00:00Z",
          next_billing_date: "2026-12-21T12:00:00",
          cancel_at_next_billing_date: false,
          recurring_pre_tax_amount: 1500,
          currency: "usd",
          tax_inclusive: false,
        });
      }
      if (url.pathname.startsWith("/invoices/payments/")) {
        return new Response(PDF, { headers: { "content-type": "application/pdf" } });
      }
      return json({ code: "NOT_FOUND", message: "No fake" }, 404);
    }),
  );
}

function useBilling(mode: "dodo" | "mock" | "disabled") {
  const dodo = mode === "dodo";
  for (const [name, value] of Object.entries({
    NODE_ENV: mode === "disabled" ? "production" : "test",
    DODO_API_KEY: dodo ? "dodo_test_apikey_for_history_tests" : undefined,
    DODO_ENVIRONMENT: undefined,
    DODO_WEBHOOK_SECRET: dodo ? "whsec_aGlzdG9yeS10ZXN0LXdlYmhvb2sta2V5" : undefined,
    BILLING_SIGNING_SECRET: dodo ? "billing_signing_secret_for_history" : undefined,
    DODO_PRO_MONTHLY_PRODUCT_ID: dodo ? PRO_MONTH : undefined,
    DODO_PRO_YEARLY_PRODUCT_ID: undefined,
    DODO_MAX_MONTHLY_PRODUCT_ID: dodo ? MAX_MONTH : undefined,
    DODO_MAX_YEARLY_PRODUCT_ID: undefined,
    DODO_PRO_TRIAL_PRODUCT_ID: dodo ? PRO_TRIAL_PRODUCT : undefined,
  })) {
    vi.stubEnv(name, value);
  }
  resetEnvForTests();
}

let sequence = 0;

async function account(
  overrides: Partial<SessionUser> & { customer?: string | null; subscription?: string | null } = {},
): Promise<SessionUser> {
  sequence += 1;
  const { customer = MINE, subscription = MY_SUB, ...fields } = overrides;
  const user: SessionUser = {
    id: crypto.randomUUID(),
    email: `buyer${sequence}@example.com`,
    plan: "pro",
    planInterval: "month",
    planRenewsAt: Date.UTC(2026, 11, 21, 12),
    trialEndsAt: null,
    planPeriodStartsAt: Date.UTC(2026, 10, 21, 12),
    planPeriodEndsAt: Date.UTC(2026, 11, 21, 12),
    ...fields,
  };
  await insertUserRow({
    id: user.id,
    email: user.email,
    plan: user.plan,
    planInterval: user.planInterval,
    planStatus: user.plan === "free" ? null : "active",
    billingCustomerId: customer,
    billingSubscriptionId: subscription,
    createdAt: 1,
    updatedAt: 1,
  });
  return user;
}

beforeEach(async () => {
  payments = [
    {
      payment_id: MY_PAY,
      customer: MINE,
      status: "succeeded",
      created_at: "2026-10-21T12:00:00Z",
      total_amount: 100,
      charge_type: "new",
      metadata: { plan: "pro", interval: "month", trial: "true" },
      card_last_four: "4242",
      card_network: "visa",
      card_exp_month: "09",
      card_exp_year: "2029",
    },
    {
      payment_id: MY_RENEWAL,
      customer: MINE,
      status: "succeeded",
      created_at: "2026-11-21T12:00:00Z",
      metadata: { plan: "pro", interval: "month", trial: "true" },
    },
    { payment_id: MY_FAILED, customer: MINE, status: "requires_payment_method", created_at: "2026-11-20T12:00:00Z" },
    {
      payment_id: THEIR_PAY,
      customer: THEIRS,
      status: "succeeded",
      created_at: "2026-11-19T12:00:00Z",
      card_last_four: "1111",
      card_network: "mastercard",
    },
  ];
  calls = [];
  await resetDb();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("billingHistory with Dodo", () => {
  beforeEach(() => {
    useBilling("dodo");
    installDodo();
  });

  it("lists only the account's own payments, newest first, with the next charge and its card", async () => {
    const history = await billingHistory(await account(), NOW);

    expect(history.payments.map((payment) => payment.id)).toEqual([MY_RENEWAL, MY_PAY]);
    expect(history.payments.map((payment) => payment.item)).toEqual(["Pro, monthly", TRIAL_ITEM]);
    expect(history.payments[1]).toMatchObject({ amountMinor: 100, status: "paid", invoice: true });
    expect(history.upcoming).toEqual({
      at: Date.UTC(2026, 11, 21, 12),
      item: "Pro, monthly",
      amountMinor: 1500,
      currency: "USD",
      taxIncluded: false,
    });
    expect(history.card).toEqual({ brand: "Visa", last4: "4242", expMonth: 9, expYear: 2029 });
    expect(JSON.stringify(history)).not.toContain(THEIR_PAY);
    expect(JSON.stringify(history)).not.toContain("1111");
    expect(calls).toContain(`/payments?customer_id=${MINE}&page_size=100`);
  });

  it("asks Dodo nothing for an account that never had a Dodo customer", async () => {
    const history = await billingHistory(await account({ plan: "free", customer: null }), NOW);

    expect(history).toEqual(EMPTY_HISTORY);
    expect(calls).toEqual([]);
  });

  it("leaves out the next charge of a subscription filed under another customer", async () => {
    const history = await billingHistory(await account({ customer: THEIRS }), NOW);

    expect(history.upcoming).toBeNull();
    expect(history.payments.map((payment) => payment.id)).toEqual([THEIR_PAY]);
  });
});

describe("invoiceFor with Dodo", () => {
  beforeEach(() => {
    useBilling("dodo");
    installDodo();
  });

  it("streams the PDF of the account's own paid payment", async () => {
    const invoice = await invoiceFor(await account(), MY_PAY, NOW);

    expect(invoice?.filename).toBe("otto-sensei-invoice-2026-10-21.pdf");
    expect(new TextDecoder().decode(invoice?.pdf.subarray(0, 5))).toBe("%PDF-");
  });

  it("answers another customer's payment like a missing one, without fetching its PDF", async () => {
    const user = await account();

    expect(await invoiceFor(user, THEIR_PAY, NOW)).toBeNull();
    expect(await invoiceFor(user, dodoId("pay", "nobody"), NOW)).toBeNull();
    expect(calls.some((call) => call.startsWith("/invoices/"))).toBe(false);
  });

  it("refuses ids that aren't Dodo payment ids, and unpaid payments", async () => {
    const user = await account();

    expect(await invoiceFor(user, "../customers", NOW)).toBeNull();
    expect(await invoiceFor(user, MY_FAILED, NOW)).toBeNull();
    expect(calls.some((call) => call.startsWith("/invoices/"))).toBe(false);
  });

  it("gives an account without a Dodo customer nothing, even for a real payment id", async () => {
    expect(await invoiceFor(await account({ customer: null }), MY_PAY, NOW)).toBeNull();
    expect(calls).toEqual([]);
  });
});

describe("billing history in test mode", () => {
  beforeEach(() => useBilling("mock"));

  it("shows a trial's $1 payment and the first full charge, with a test card", async () => {
    const endsAt = NOW + 2 * DAY_MS;
    const user = await account({ trialEndsAt: endsAt, planPeriodStartsAt: NOW - DAY_MS });
    const history = await billingHistory(user, NOW);

    expect(history.payments).toHaveLength(1);
    expect(history.payments[0]).toMatchObject({
      at: NOW - DAY_MS,
      item: TRIAL_ITEM,
      amountMinor: PRO_TRIAL.priceUsd * 100,
      status: "paid",
    });
    expect(history.upcoming).toMatchObject({ at: endsAt, item: "Pro, monthly", amountMinor: 1500 });
    expect(history.card?.last4).toBe("4242");
  });

  it("lists no sample payment without a period start, so its invoice id can't change", async () => {
    const history = await billingHistory(await account({ planPeriodStartsAt: null }), NOW);

    expect(history.payments).toEqual([]);
    expect(history.card?.last4).toBe("4242");
  });

  it("is empty on Free", async () => {
    expect(await billingHistory(await account({ plan: "free", planInterval: null }), NOW)).toEqual(
      EMPTY_HISTORY,
    );
  });

  it("gives each account only its own sample invoices", async () => {
    const mine = await account({ planInterval: "year" });
    const theirs = await account();
    const [payment] = mockHistory(mine, NOW).payments;
    if (!payment) throw new Error("no sample payment");

    const invoice = await invoiceFor(mine, payment.id, NOW);
    expect(new TextDecoder().decode(invoice?.pdf)).toContain("Pro, yearly");
    expect(new TextDecoder().decode(invoice?.pdf)).toContain("test mode");
    expect(await invoiceFor(theirs, payment.id, NOW)).toBeNull();
  });
});

describe("with billing off", () => {
  it("has no history and no invoices", async () => {
    useBilling("disabled");
    const user = await account();

    expect(await billingHistory(user, NOW)).toEqual(EMPTY_HISTORY);
    expect(await invoiceFor(user, MY_PAY, NOW)).toBeNull();
  });
});

describe("payment rows", () => {
  const base = {
    payment_id: MY_PAY,
    status: "succeeded",
    customer: { customer_id: MINE },
    subscription_id: MY_SUB,
    total_amount: 2900,
    currency: "USD",
    created_at: "2026-11-01T00:00:00Z",
  };

  it("names a plan change after the plan it moved to", () => {
    const item = paymentItem(
      { ...base, charge_type: "plan_change", metadata: { plan: "pro", interval: "month" } },
      { id: MY_SUB, term: { plan: "max", interval: "month" }, trialProduct: false },
    );
    expect(item).toBe("Change to Max, monthly");
  });

  it("only lists payments that charged or tried to", () => {
    expect(paymentStatus({ ...base, refund_status: "full" })).toBe("refunded");
    expect(paymentStatus({ ...base, refund_status: "partial" })).toBe("paid");
    expect(paymentStatus({ ...base, status: "failed" })).toBe("failed");
    expect(paymentStatus({ ...base, status: "cancelled" })).toBeNull();
    expect(paymentStatus({ ...base, status: "requires_customer_action" })).toBeNull();
  });

  it("leaves out $0 card checks that aren't a subscription charge", () => {
    expect(isCharge({ ...base, total_amount: 0, charge_type: null })).toBe(false);
    expect(isCharge({ ...base, total_amount: 0, charge_type: "new" })).toBe(true);
    expect(isCharge({ ...base, charge_type: null })).toBe(true);
  });

  it("reads the card from the newest paid payment, ignoring malformed digits", () => {
    expect(
      cardOf([
        { ...base, status: "failed", card_last_four: "9999", card_network: "amex" },
        { ...base, card_last_four: "12a4", card_network: "visa" },
        { ...base, card_last_four: "0005", card_network: "RuPay", card_exp_month: "13" },
      ]),
    ).toEqual({ brand: "RuPay", last4: "0005", expMonth: null, expYear: null });
    expect(cardOf([])).toBeNull();
  });
});
