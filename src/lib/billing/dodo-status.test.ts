import { describe, expect, it } from "vitest";
import { DAY_MS, HOUR_MS } from "@/lib/time";
import {
  DodoSubscriptionSchema,
  inTrialWindow,
  internalStatus,
  isDodoId,
  periodOf,
  trialEndOf,
  type DodoSubscription,
  type InternalStatus,
} from "./dodo-status";

const STARTED = Date.UTC(2026, 10, 20, 9, 30, 15, 123);
const TRIAL_END = STARTED + 3 * DAY_MS;
const RENEWS = Date.UTC(2026, 11, 23, 9, 30, 15, 123);

// Dodo sends microseconds and a Z, like 2026-11-20T09:30:15.123456Z.
const iso = (ms: number) => new Date(ms).toISOString().replace("Z", "456Z");

function subscription(overrides: Partial<DodoSubscription> = {}): DodoSubscription {
  return {
    subscription_id: "sub_Iuaq622bbmmfOGrVTqdXv",
    status: "active",
    product_id: "pdt_R8AWMPiV8RyJElcCKvAID",
    customer: { customer_id: "cus_TV52uJWWXt2yIoBBxpjaa", email: "ada@example.com" },
    metadata: {},
    created_at: iso(STARTED),
    previous_billing_date: iso(STARTED),
    next_billing_date: iso(TRIAL_END),
    trial_period_days: 3,
    cancel_at_next_billing_date: false,
    cancelled_at: null,
    ...overrides,
  };
}

const paidTrial = (overrides: Partial<DodoSubscription> = {}) => subscription(overrides);
const converted = (overrides: Partial<DodoSubscription> = {}) =>
  subscription({
    previous_billing_date: iso(TRIAL_END),
    next_billing_date: iso(RENEWS),
    ...overrides,
  });
const noTrial = (overrides: Partial<DodoSubscription> = {}) =>
  subscription({ trial_period_days: 0, next_billing_date: iso(RENEWS), ...overrides });

describe("DodoSubscriptionSchema", () => {
  it("reads a payload with fields it doesn't use and a status it doesn't know", () => {
    const parsed = DodoSubscriptionSchema.safeParse({
      ...subscription({ status: "something_new" }),
      payload_type: "Subscription",
      recurring_pre_tax_amount: 1500,
      trial_amount: 100,
      scheduled_change: null,
      customer: { customer_id: "cus_TV52uJWWXt2yIoBBxpjaa", email: "ada@example.com", name: "Ada" },
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.status).toBe("something_new");
    expect(parsed.data?.customer.customer_id).toBe("cus_TV52uJWWXt2yIoBBxpjaa");
  });

  it("accepts missing or null optional fields", () => {
    const parsed = DodoSubscriptionSchema.safeParse({
      subscription_id: "sub_Iuaq622bbmmfOGrVTqdXv",
      status: "pending",
      product_id: "pdt_R8AWMPiV8RyJElcCKvAID",
      customer: { customer_id: "cus_TV52uJWWXt2yIoBBxpjaa" },
      metadata: null,
      previous_billing_date: null,
      trial_period_days: null,
    });
    expect(parsed.success).toBe(true);
  });

  it("refuses a payload without the ids it needs", () => {
    expect(
      DodoSubscriptionSchema.safeParse({ ...subscription(), subscription_id: undefined }).success,
    ).toBe(false);
    expect(DodoSubscriptionSchema.safeParse({ ...subscription(), customer: {} }).success).toBe(
      false,
    );
    expect(DodoSubscriptionSchema.safeParse({ ...subscription(), status: "" }).success).toBe(false);
  });
});

describe("internalStatus", () => {
  type Window = "trial" | "paid";
  const windows: Record<Window, (o: Partial<DodoSubscription>) => DodoSubscription> = {
    trial: paidTrial,
    paid: converted,
  };
  const expected: Record<
    string,
    Record<Window, Record<"keeps" | "cancels", InternalStatus | null>>
  > = {
    active: {
      trial: { keeps: "trialing", cancels: "scheduled_cancel" },
      paid: { keeps: "active", cancels: "scheduled_cancel" },
    },
    past_due: {
      trial: { keeps: "past_due", cancels: "past_due" },
      paid: { keeps: "past_due", cancels: "past_due" },
    },
    on_hold: {
      trial: { keeps: "on_hold", cancels: "on_hold" },
      paid: { keeps: "on_hold", cancels: "on_hold" },
    },
    paused: {
      trial: { keeps: "paused", cancels: "paused" },
      paid: { keeps: "paused", cancels: "paused" },
    },
    cancelled: {
      trial: { keeps: "canceled", cancels: "canceled" },
      paid: { keeps: "canceled", cancels: "canceled" },
    },
    expired: {
      trial: { keeps: "canceled", cancels: "canceled" },
      paid: { keeps: "canceled", cancels: "canceled" },
    },
    canceled: {
      trial: { keeps: "canceled", cancels: "canceled" },
      paid: { keeps: "canceled", cancels: "canceled" },
    },
    pending: {
      trial: { keeps: null, cancels: null },
      paid: { keeps: null, cancels: null },
    },
    failed: {
      trial: { keeps: null, cancels: null },
      paid: { keeps: null, cancels: null },
    },
    something_new: {
      trial: { keeps: null, cancels: null },
      paid: { keeps: null, cancels: null },
    },
  };
  const cases = Object.entries(expected).flatMap(([status, byWindow]) =>
    (["trial", "paid"] as const).flatMap((window) =>
      (["keeps", "cancels"] as const).map(
        (flag) => [status, window, flag, byWindow[window][flag]] as const,
      ),
    ),
  );

  it.each(cases)("%s in the %s window that %s gives %s", (status, window, flag, result) => {
    const sub = windows[window]({ status, cancel_at_next_billing_date: flag === "cancels" });
    expect(internalStatus(sub)).toBe(result);
  });

  it("covers every status Dodo documents", () => {
    const documented = [
      "pending",
      "active",
      "on_hold",
      "paused",
      "cancelled",
      "failed",
      "expired",
      "past_due",
    ];
    expect(documented.every((status) => Object.hasOwn(expected, status))).toBe(true);
  });

  it("treats a paid trial's first period as trialing", () => {
    expect(internalStatus(paidTrial())).toBe("trialing");
    expect(trialEndOf(paidTrial())).toBe(TRIAL_END);
  });

  it("treats a converted subscription as active even when trial_period_days is still 3", () => {
    const sub = converted({ trial_period_days: 3 });
    expect(internalStatus(sub)).toBe("active");
    expect(trialEndOf(sub)).toBeNull();
  });

  it("never treats trial_period_days 0, null or missing as a trial", () => {
    for (const days of [0, null, undefined]) {
      const sub = paidTrial({ trial_period_days: days });
      expect(inTrialWindow(sub)).toBe(false);
      expect(internalStatus(sub)).toBe("active");
      expect(trialEndOf(sub)).toBeNull();
    }
  });

  it("is active after a trial ends early by a plan change", () => {
    const sub = paidTrial({ trial_period_days: 0, next_billing_date: iso(STARTED + 31 * DAY_MS) });
    expect(internalStatus(sub)).toBe("active");
  });

  it("keeps the trial end on a trial set to cancel, and none outside the trial", () => {
    const trial = paidTrial({ cancel_at_next_billing_date: true });
    expect(internalStatus(trial)).toBe("scheduled_cancel");
    expect(trialEndOf(trial)).toBe(TRIAL_END);
    const paid = converted({ cancel_at_next_billing_date: true });
    expect(internalStatus(paid)).toBe("scheduled_cancel");
    expect(trialEndOf(paid)).toBeNull();
  });

  it("counts past_due inside the trial window as the trial's", () => {
    const sub = paidTrial({ status: "past_due" });
    expect(internalStatus(sub)).toBe("past_due");
    expect(inTrialWindow(sub)).toBe(true);
    expect(trialEndOf(sub)).toBe(TRIAL_END);
  });

  it("ignores pending and failed subscriptions", () => {
    expect(internalStatus(paidTrial({ status: "pending" }))).toBeNull();
    expect(internalStatus(paidTrial({ status: "failed" }))).toBeNull();
    expect(internalStatus(noTrial({ status: "failed" }))).toBeNull();
  });
});

describe("inTrialWindow", () => {
  const ending = (end: number) => paidTrial({ next_billing_date: iso(end) });

  it("allows a first period of up to the trial plus an hour", () => {
    expect(inTrialWindow(ending(STARTED + 3 * DAY_MS))).toBe(true);
    expect(inTrialWindow(ending(STARTED + 3 * DAY_MS + HOUR_MS))).toBe(true);
    expect(inTrialWindow(ending(STARTED + 3 * DAY_MS + HOUR_MS + 1))).toBe(false);
    expect(inTrialWindow(ending(STARTED + 4 * DAY_MS))).toBe(false);
  });

  it("measures from created_at when there is no previous billing date", () => {
    expect(inTrialWindow(paidTrial({ previous_billing_date: null }))).toBe(true);
    expect(
      inTrialWindow(
        paidTrial({ previous_billing_date: null, created_at: iso(STARTED - DAY_MS - 2 * HOUR_MS) }),
      ),
    ).toBe(false);
  });

  it("is never a trial without usable dates", () => {
    expect(inTrialWindow(paidTrial({ next_billing_date: null }))).toBe(false);
    expect(inTrialWindow(paidTrial({ previous_billing_date: null, created_at: null }))).toBe(false);
    expect(inTrialWindow(paidTrial({ next_billing_date: "not a date" }))).toBe(false);
    expect(inTrialWindow(paidTrial({ next_billing_date: iso(STARTED) }))).toBe(false);
    expect(inTrialWindow(paidTrial({ next_billing_date: iso(STARTED - DAY_MS) }))).toBe(false);
  });

  it("follows a longer trial_period_days", () => {
    const sub = paidTrial({ trial_period_days: 7, next_billing_date: iso(STARTED + 7 * DAY_MS) });
    expect(inTrialWindow(sub)).toBe(true);
    expect(inTrialWindow({ ...sub, trial_period_days: 3 })).toBe(false);
  });
});

describe("only the first period is a trial", () => {
  const LIMIT = 3 * DAY_MS + HOUR_MS;
  const period = (start: number, end: number, overrides: Partial<DodoSubscription> = {}) =>
    paidTrial({ previous_billing_date: iso(start), next_billing_date: iso(end), ...overrides });

  it("reads a short period after a keep_cycle plan change, two days before renewal, as paid", () => {
    const sub = subscription({
      status: "active",
      trial_period_days: 3,
      created_at: iso(Date.UTC(2026, 10, 8, 10)),
      previous_billing_date: iso(Date.UTC(2026, 11, 9, 10)),
      next_billing_date: iso(Date.UTC(2026, 11, 11, 10)),
    });
    expect(inTrialWindow(sub)).toBe(false);
    expect(internalStatus(sub)).toBe("active");
    expect(trialEndOf(sub)).toBeNull();
    const ending = { ...sub, cancel_at_next_billing_date: true };
    expect(internalStatus(ending)).toBe("scheduled_cancel");
    expect(trialEndOf(ending)).toBeNull();
  });

  it("reads an on_hold subscription recovered with a 2-day period a month in as paid", () => {
    const start = STARTED + 31 * DAY_MS;
    const held = period(start, start + 2 * DAY_MS, { status: "on_hold" });
    expect(internalStatus(held)).toBe("on_hold");
    const recovered = { ...held, status: "active" };
    expect(inTrialWindow(recovered)).toBe(false);
    expect(internalStatus(recovered)).toBe("active");
    expect(trialEndOf(recovered)).toBeNull();
    const overdue = { ...held, status: "past_due" };
    expect(internalStatus(overdue)).toBe("past_due");
    expect(trialEndOf(overdue)).toBeNull();
  });

  it("still reads the real first period as the trial", () => {
    const sub = period(STARTED, STARTED + 3 * DAY_MS, { created_at: iso(STARTED) });
    expect(internalStatus(sub)).toBe("trialing");
    expect(trialEndOf(sub)).toBe(STARTED + 3 * DAY_MS);
  });

  it("still reads a trial that activated a while after it was created as the trial", () => {
    const activated = STARTED + 2 * HOUR_MS;
    const sub = period(activated, activated + 3 * DAY_MS);
    expect(internalStatus(sub)).toBe("trialing");
    expect(trialEndOf(sub)).toBe(activated + 3 * DAY_MS);
    expect(inTrialWindow(period(STARTED + LIMIT, STARTED + LIMIT + 3 * DAY_MS))).toBe(true);
    expect(inTrialWindow(period(STARTED + LIMIT + 1, STARTED + LIMIT + 1 + 3 * DAY_MS))).toBe(
      false,
    );
  });

  it("keeps past_due inside the first period on the trial", () => {
    const activated = STARTED + 2 * HOUR_MS;
    const sub = period(activated, activated + 3 * DAY_MS, { status: "past_due" });
    expect(internalStatus(sub)).toBe("past_due");
    expect(inTrialWindow(sub)).toBe(true);
    expect(trialEndOf(sub)).toBe(activated + 3 * DAY_MS);
  });

  it("goes by the period alone when created_at is missing or unreadable", () => {
    const start = STARTED + 31 * DAY_MS;
    for (const created of [null, undefined, "", "not a date"]) {
      const sub = period(start, start + 2 * DAY_MS, { created_at: created });
      expect(inTrialWindow(sub)).toBe(true);
      expect(internalStatus(sub)).toBe("trialing");
    }
  });
});

describe("periodOf", () => {
  it("runs from the previous billing date to the next one", () => {
    expect(periodOf(converted())).toEqual({ start: TRIAL_END, end: RENEWS });
  });

  it("falls back to created_at for the start and keeps a missing end null", () => {
    expect(periodOf(paidTrial({ previous_billing_date: null }))).toEqual({
      start: STARTED,
      end: TRIAL_END,
    });
    expect(
      periodOf(paidTrial({ previous_billing_date: undefined, next_billing_date: null })),
    ).toEqual({
      start: STARTED,
      end: null,
    });
    expect(
      periodOf(
        paidTrial({ previous_billing_date: null, created_at: null, next_billing_date: null }),
      ),
    ).toEqual({
      start: null,
      end: null,
    });
  });

  it("reads plain, offset and zone-less timestamps as the same instant", () => {
    const at = Date.UTC(2026, 10, 20, 9, 30, 15);
    for (const value of [
      "2026-11-20T09:30:15Z",
      "2026-11-20T09:30:15.000000Z",
      "2026-11-20T14:30:15+05:00",
      "2026-11-20T09:30:15",
    ]) {
      expect(periodOf(paidTrial({ previous_billing_date: value })).start).toBe(at);
    }
  });
});

describe("isDodoId", () => {
  it("accepts ids shaped like Dodo's", () => {
    expect(isDodoId("sub", "sub_Iuaq622bbmmfOGrVTqdXv")).toBe(true);
    expect(isDodoId("cus", "cus_TV52uJWWXt2yIoBBxpjaa")).toBe(true);
    expect(isDodoId("cus", "cus_9VuW4K7O3GHwasENg31m")).toBe(true);
    expect(isDodoId("pay", "pay_gr4RizvMOXFJ6xca3y2tU")).toBe(true);
    expect(isDodoId("pdt", "pdt_R8AWMPiV8RyJElcCKvAID")).toBe(true);
    expect(isDodoId("ref", "ref_F0gZetLvTxxBrMU2CZcmy")).toBe(true);
  });

  it("checks the prefix for the kind asked", () => {
    expect(isDodoId("cus", "sub_Iuaq622bbmmfOGrVTqdXv")).toBe(false);
    expect(isDodoId("sub", "pay_gr4RizvMOXFJ6xca3y2tU")).toBe(false);
    expect(isDodoId("pay", "cks_Gi6KGJ2zFJo9rq9Ukifwa")).toBe(false);
  });

  it("refuses Paddle-shaped ids, even with Dodo's sub_ prefix", () => {
    expect(isDodoId("sub", "sub_01jcx7m2p3q4r5s6t7v8w9xyza")).toBe(false);
    expect(isDodoId("cus", "ctm_01jcx7m2p3q4r5s6t7v8w9xyza")).toBe(false);
    expect(isDodoId("pay", "txn_01jcx7m2p3q4r5s6t7v8w9xyza")).toBe(false);
    expect(isDodoId("pdt", "pri_01jcx7m2p3q4r5s6t7v8w9xyza")).toBe(false);
  });

  it("refuses Creem leftovers and junk", () => {
    for (const id of [
      "cust_x",
      "cust_1ZFXSRwKu7zBbGMbMbEfV5",
      "sub_creem_max",
      "sub_x",
      "sub_",
      "sub_short",
      "sub_has-dash123",
      "sub_ Iuaq622bbmm",
      "",
    ]) {
      expect(isDodoId("sub", id) || isDodoId("cus", id)).toBe(false);
    }
    expect(isDodoId("sub", `sub_${"a".repeat(65)}`)).toBe(false);
    expect(isDodoId("sub", null)).toBe(false);
    expect(isDodoId("sub", undefined)).toBe(false);
  });

  it("keeps a mixed-case 26-character sub_ id, which Paddle never issues", () => {
    expect(isDodoId("sub", "sub_01JCX7M2P3Q4R5S6T7V8W9XYZA")).toBe(true);
  });
});
