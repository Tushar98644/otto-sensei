import { createHash } from "node:crypto";
import { BRAND } from "@/config/brand";
import {
  BILLING_INTERVALS,
  isPaidPlan,
  isTrialing,
  PAID_PLANS,
  PLANS,
  PRICES_USD,
  PRO_TRIAL,
  type BillingInterval,
  type PaidPlanId,
} from "@/config/plans";
import type { SessionUser } from "@/lib/auth/types";
import { log } from "@/lib/log";
import { DAY_MS } from "@/lib/time";
import {
  customerPayments,
  getPayment,
  getSubscriptionCharge,
  paymentInvoicePdf,
  type DodoPayment,
  type DodoSubscriptionCharge,
} from "./dodo";
import { isDodoId } from "./dodo-status";
import { chargeableSubscriptionId, getBillingRecord } from "./entitlements";
import { BillingError } from "./errors";
import {
  EMPTY_HISTORY,
  type BillingHistory,
  type BillingPayment,
  type CardOnFile,
  type PaymentStatus,
  type UpcomingCharge,
} from "./history-types";
import { planForProduct, trialProductId } from "./intervals";
import { simplePdf } from "./mock-invoice";
import { billingMode } from "./mode";
import { INTERVAL_NAMES } from "./prices";

type Term = { plan: PaidPlanId; interval: BillingInterval };

export type Invoice = { pdf: Uint8Array<ArrayBuffer>; filename: string };

export const TRIAL_ITEM = `${PLANS[PRO_TRIAL.plan].name} trial, ${PRO_TRIAL.days} days`;
const OTHER_ITEM = `${BRAND.name} subscription`;

const NETWORKS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  americanexpress: "American Express",
  discover: "Discover",
  rupay: "RuPay",
  jcb: "JCB",
  unionpay: "UnionPay",
  diners: "Diners Club",
  dinersclub: "Diners Club",
  maestro: "Maestro",
};

const NO_ZONE = /T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

// A Dodo time without an offset is UTC, never the server's local time.
function dodoMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(NO_ZONE.test(value) ? `${value}Z` : value);
  return Number.isFinite(ms) ? ms : null;
}

export function termItem({ plan, interval }: Term): string {
  return `${PLANS[plan].name}, ${INTERVAL_NAMES[interval].toLowerCase()}`;
}

function oneOf<T extends string>(value: unknown, options: readonly T[]): T | null {
  return typeof value === "string" && (options as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

// Our checkout writes plan, interval and trial into the metadata, and Dodo carries it onto the payment.
function metadataTerm(metadata: DodoPayment["metadata"]): (Term & { trial: boolean }) | null {
  const plan = oneOf(metadata?.plan, PAID_PLANS);
  const interval = oneOf(metadata?.interval, BILLING_INTERVALS);
  if (!plan || !interval) return null;
  return { plan, interval, trial: metadata?.trial === "true" || metadata?.trial === true };
}

type Subscribed = { id: string; term: Term | null; trialProduct: boolean };

export function paymentItem(payment: DodoPayment, subscription: Subscribed | null): string {
  const charge = payment.charge_type ?? "new";
  const same = subscription !== null && payment.subscription_id === subscription.id;
  const fromMetadata = metadataTerm(payment.metadata);
  if (charge === "new" && (fromMetadata?.trial || (same && subscription.trialProduct))) {
    return TRIAL_ITEM;
  }
  const own = same ? subscription.term : null;
  // A plan change lands on the subscription's product, while the metadata keeps the first checkout's.
  const term = charge === "plan_change" ? (own ?? fromMetadata) : (fromMetadata ?? own);
  if (!term) return OTHER_ITEM;
  return charge === "plan_change" ? `Change to ${termItem(term)}` : termItem(term);
}

// A $0 payment outside a subscription charge is a card check, e.g. a card updated in the portal.
export function isCharge(payment: DodoPayment): boolean {
  return payment.total_amount > 0 || payment.charge_type != null;
}

// Cancelled and requires_* are checkouts nobody finished: nothing was charged, so they aren't listed.
export function paymentStatus(payment: DodoPayment): PaymentStatus | null {
  switch (payment.status) {
    case "succeeded":
      return payment.refund_status === "full" ? "refunded" : "paid";
    case "processing":
      return "processing";
    case "failed":
      return "failed";
    default:
      return null;
  }
}

function brandName(network: string): string {
  const known = NETWORKS[network];
  if (known) return known;
  return network ? `${network.charAt(0).toUpperCase()}${network.slice(1)}` : "Card";
}

export function cardOf(payments: readonly DodoPayment[]): CardOnFile | null {
  const ordered = [
    ...payments.filter((payment) => payment.status === "succeeded"),
    ...payments.filter((payment) => payment.status !== "succeeded"),
  ];
  for (const payment of ordered) {
    const last4 = payment.card_last_four;
    if (!last4 || !/^\d{4}$/.test(last4)) continue;
    const month = Number(payment.card_exp_month);
    const year = Number(payment.card_exp_year);
    return {
      brand: brandName((payment.card_network ?? "").toLowerCase().replace(/[^a-z]/g, "")),
      last4,
      expMonth: Number.isInteger(month) && month >= 1 && month <= 12 ? month : null,
      expYear: Number.isInteger(year) && year >= 2000 && year < 2100 ? year : null,
    };
  }
  return null;
}

export function upcomingOf(
  subscription: DodoSubscriptionCharge | null,
  term: Term | null,
  now: number,
): UpcomingCharge | null {
  if (!subscription || subscription.status !== "active") return null;
  if (subscription.cancel_at_next_billing_date === true) return null;
  const at = dodoMs(subscription.next_billing_date);
  const amount = subscription.recurring_pre_tax_amount;
  if (at === null || at <= now || amount == null || !subscription.currency) return null;
  return {
    at,
    item: term ? termItem(term) : OTHER_ITEM,
    amountMinor: amount,
    currency: subscription.currency.toUpperCase(),
    taxIncluded: subscription.tax_inclusive === true,
  };
}

async function ownSubscription(
  id: string | null,
  customerId: string,
): Promise<DodoSubscriptionCharge | null> {
  if (!isDodoId("sub", id)) return null;
  try {
    const subscription = await getSubscriptionCharge(id);
    return subscription.customer.customer_id === customerId ? subscription : null;
  } catch (error) {
    // The payments still show; only the next charge is left out.
    if (error instanceof BillingError) return null;
    throw error;
  }
}

export async function billingHistory(user: SessionUser, now = Date.now()): Promise<BillingHistory> {
  const mode = billingMode();
  if (mode === "disabled") return EMPTY_HISTORY;
  if (mode === "mock") return mockHistory(user, now);
  const record = await getBillingRecord(user.id);
  const customerId = record?.billingCustomerId;
  if (!record || !isDodoId("cus", customerId)) return EMPTY_HISTORY;
  const [payments, subscription] = await Promise.all([
    customerPayments(customerId),
    ownSubscription(chargeableSubscriptionId(record), customerId),
  ]);
  const productPlan = subscription ? planForProduct(subscription.product_id) : null;
  const term = productPlan ? { plan: productPlan.plan, interval: productPlan.interval } : null;
  const subscribed: Subscribed | null = subscription
    ? {
        id: subscription.subscription_id,
        term,
        trialProduct: subscription.product_id === trialProductId(),
      }
    : null;
  const rows: BillingPayment[] = [];
  for (const payment of payments) {
    const status = paymentStatus(payment);
    const at = dodoMs(payment.created_at);
    if (!status || at === null || !isCharge(payment)) continue;
    rows.push({
      id: payment.payment_id,
      at,
      item: paymentItem(payment, subscribed),
      amountMinor: payment.total_amount,
      currency: payment.currency.toUpperCase(),
      status,
      invoice: status === "paid" || status === "refunded",
    });
  }
  return { payments: rows, upcoming: upcomingOf(subscription, term, now), card: cardOf(payments) };
}

function invoiceFilename(at: number): string {
  const day = new Date(at).toISOString().slice(0, 10);
  return `${BRAND.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-invoice-${day}.pdf`;
}

// Null for anything the account can't download: not its payment, not paid, or not found.
export async function invoiceFor(
  user: SessionUser,
  paymentId: string,
  now = Date.now(),
): Promise<Invoice | null> {
  if (!isDodoId("pay", paymentId)) return null;
  const mode = billingMode();
  if (mode === "disabled") return null;
  if (mode === "mock") return mockInvoice(user, paymentId, now);
  const record = await getBillingRecord(user.id);
  const customerId = record?.billingCustomerId;
  if (!isDodoId("cus", customerId)) return null;
  let payment: DodoPayment;
  try {
    payment = await getPayment(paymentId);
  } catch (error) {
    if (error instanceof BillingError && error.details.reason === "not_found") return null;
    throw error;
  }
  if (payment.customer.customer_id !== customerId) {
    log.warn("billing.invoice_not_owned", { userId: user.id });
    return null;
  }
  if (payment.status !== "succeeded") return null;
  return {
    pdf: await paymentInvoicePdf(paymentId),
    filename: invoiceFilename(dodoMs(payment.created_at) ?? now),
  };
}

function mockPaymentId(userId: string, what: string): string {
  return `pay_mock${createHash("sha256").update(`${userId}:${what}`).digest("hex").slice(0, 20)}`;
}

const cents = (usd: number) => Math.round(usd * 100);

export function mockHistory(user: SessionUser, now = Date.now()): BillingHistory {
  if (!isPaidPlan(user.plan)) return EMPTY_HISTORY;
  const interval = user.planInterval ?? "month";
  const term = { plan: user.plan, interval };
  const trialing = isTrialing(user);
  const card: CardOnFile = {
    brand: "Visa",
    last4: "4242",
    expMonth: 12,
    expYear: new Date(now).getUTCFullYear() + 3,
  };
  const nextAt = trialing
    ? (user.trialEndsAt ?? null)
    : (user.planRenewsAt ?? user.planPeriodEndsAt ?? null);
  const upcoming: UpcomingCharge | null =
    nextAt !== null && nextAt > now
      ? {
          at: nextAt,
          item: termItem(term),
          amountMinor: cents(PRICES_USD[user.plan][interval]),
          currency: "USD",
          taxIncluded: false,
        }
      : null;
  // The id comes from the date, so it must not move between the list and the invoice download.
  const at = trialing
    ? (user.planPeriodStartsAt ??
      (user.trialEndsAt == null ? null : user.trialEndsAt - PRO_TRIAL.days * DAY_MS))
    : (user.planPeriodStartsAt ?? null);
  if (at === null) return { payments: [], upcoming, card };
  const payment: BillingPayment = trialing
    ? {
        id: mockPaymentId(user.id, `trial:${at}`),
        at,
        item: TRIAL_ITEM,
        amountMinor: cents(PRO_TRIAL.priceUsd),
        currency: "USD",
        status: "paid",
        invoice: true,
      }
    : {
        id: mockPaymentId(user.id, `${user.plan}:${interval}:${at}`),
        at,
        item: termItem(term),
        amountMinor: cents(PRICES_USD[user.plan][interval]),
        currency: "USD",
        status: "paid",
        invoice: true,
      };
  return { payments: [payment], upcoming, card };
}

function mockInvoice(user: SessionUser, paymentId: string, now: number): Invoice | null {
  const payment = mockHistory(user, now).payments.find((row) => row.id === paymentId);
  if (!payment) return null;
  return {
    pdf: simplePdf([
      `${BRAND.name} invoice (test mode)`,
      "No real payment was taken.",
      "",
      `Billed to: ${user.email}`,
      `Date: ${new Date(payment.at).toISOString().slice(0, 10)}`,
      `Item: ${payment.item}`,
      `Amount: $${(payment.amountMinor / 100).toFixed(2)} ${payment.currency}`,
      `Payment: ${payment.id}`,
    ]),
    filename: invoiceFilename(payment.at),
  };
}
