import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PLANS } from "@/config/plans";
import { getDb } from "@/db/client";
import { users, type UserRow } from "@/db/schema";
import { insertUserRow, resetDb } from "@/lib/auth/test-helpers";
import { addMonths, consumeUsage, getUsage } from "@/lib/usage";
import { toSessionUser } from "@/lib/users";
import {
  applySubscriptionState,
  chargeableSubscriptionId,
  claimBillingEvent,
  findBillingUserId,
  findUserQuery,
  isLiveStatus,
  markSubscriptionCancelled,
  planForStatus,
  type SubscriptionState,
} from "./entitlements";
import { addTrialHistory, eventRows, replacementRows, trialRows } from "./log-testing";
import { emailFingerprint } from "./trial";

const NOW = Date.UTC(2026, 10, 6, 12);
const RENEWS_AT = Date.UTC(2026, 11, 6, 12);
const PERIOD_STARTS_AT = Date.UTC(2026, 10, 6, 12);

let sequence = 0;
const next = (prefix: string) => `${prefix}_${++sequence}`;

async function createUser(overrides: Partial<UserRow> = {}): Promise<UserRow> {
  const row: UserRow = {
    id: crypto.randomUUID(),
    email: `${next("person")}@example.com`,
    plan: "free",
    planStatus: null,
    planRenewsAt: null,
    planInterval: null,
    trialEndsAt: null,
    planPeriodStartsAt: null,
    planPeriodEndsAt: null,
    billingCustomerId: null,
    billingSubscriptionId: null,
    billingEventAt: null,
    createdAt: NOW - 1000,
    updatedAt: NOW - 1000,
    ...overrides,
  };
  await insertUserRow(row);
  return row;
}

async function reload(id: string): Promise<UserRow | undefined> {
  const db = await getDb();
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row;
}

function subscription(overrides: Partial<SubscriptionState> = {}): SubscriptionState {
  return {
    customerId: next("ctm"),
    subscriptionId: next("sub"),
    pricePlan: "pro",
    priceInterval: "month",
    status: "active",
    renewsAt: RENEWS_AT,
    periodStartsAt: PERIOD_STARTS_AT,
    periodEndsAt: RENEWS_AT,
    eventAt: null,
    ...overrides,
  };
}

const source = () => ({ eventId: next("evt"), eventType: "subscription.updated" });

beforeEach(async () => {
  await resetDb();
});

describe("planForStatus", () => {
  const cases: Array<[string, "paid" | "free" | null]> = [
    ["active", "paid"],
    ["past_due", "paid"],
    ["trialing", "paid"],
    ["scheduled_cancel", "paid"],
    ["paused", "free"],
    ["on_hold", "free"],
    ["canceled", "free"],
    ["something_new", null],
    ["toString", null],
  ];

  it.each(cases)("maps %s to %s", (status, plan) => {
    expect(planForStatus(status)).toBe(plan);
  });

  it("counts everything but canceled as live", () => {
    expect(["active", "trialing", "past_due", "paused", "on_hold"].every(isLiveStatus)).toBe(true);
    expect(isLiveStatus("canceled")).toBe(false);
    const record = {
      plan: "free" as const,
      billingCustomerId: "cus_1",
      billingSubscriptionId: "sub_1",
    };
    expect(chargeableSubscriptionId({ ...record, planStatus: "paused" })).toBe("sub_1");
    expect(chargeableSubscriptionId({ ...record, planStatus: "on_hold" })).toBe("sub_1");
    expect(chargeableSubscriptionId({ ...record, planStatus: "canceled" })).toBeNull();
  });

  it("moves an on_hold subscription to Free but keeps it as the one to cancel", async () => {
    const user = await createUser({
      plan: "pro",
      planInterval: "month",
      planStatus: "active",
      planRenewsAt: RENEWS_AT,
      planPeriodStartsAt: PERIOD_STARTS_AT,
      planPeriodEndsAt: RENEWS_AT,
      billingCustomerId: "cus_TV52uJWWXt2yIoBBxpjaa",
      billingSubscriptionId: "sub_Iuaq622bbmmfOGrVTqdXv",
    });
    const result = await applySubscriptionState(
      subscription({
        userId: user.id,
        customerId: "cus_TV52uJWWXt2yIoBBxpjaa",
        subscriptionId: "sub_Iuaq622bbmmfOGrVTqdXv",
        status: "on_hold",
      }),
      source(),
      NOW,
    );
    expect(result).toMatchObject({ outcome: "applied", plan: "free" });
    const row = await reload(user.id);
    expect(row).toMatchObject({
      plan: "free",
      planStatus: "on_hold",
      planInterval: null,
      planRenewsAt: null,
      billingSubscriptionId: "sub_Iuaq622bbmmfOGrVTqdXv",
    });
    expect(row && chargeableSubscriptionId(row)).toBe("sub_Iuaq622bbmmfOGrVTqdXv");
  });
});

describe("applySubscriptionState", () => {
  it("grants Pro for an active subscription and stores the billing details", async () => {
    const user = await createUser();
    const state = subscription({ userId: user.id });

    const result = await applySubscriptionState(state, source(), NOW);

    expect(result).toMatchObject({ outcome: "applied", userId: user.id, plan: "pro" });
    expect(await reload(user.id)).toMatchObject({
      plan: "pro",
      planStatus: "active",
      planRenewsAt: RENEWS_AT,
      billingCustomerId: state.customerId,
      billingSubscriptionId: state.subscriptionId,
      updatedAt: NOW,
    });
  });

  it("keeps Pro while a failed renewal is in its grace period", async () => {
    const user = await createUser({ plan: "pro", billingSubscriptionId: "sub_grace" });
    const result = await applySubscriptionState(
      subscription({ subscriptionId: "sub_grace", status: "past_due" }),
      source(),
      NOW,
    );
    expect(result).toMatchObject({ outcome: "applied", plan: "pro" });
    expect(await reload(user.id)).toMatchObject({ plan: "pro", planStatus: "past_due" });
  });

  it.each(["canceled", "paused"])("takes Pro away when the subscription is %s", async (status) => {
    const user = await createUser({
      plan: "pro",
      planStatus: "active",
      planRenewsAt: RENEWS_AT,
      billingCustomerId: "cus_paid",
      billingSubscriptionId: "sub_paid",
    });

    const result = await applySubscriptionState(
      subscription({ customerId: "cus_paid", subscriptionId: "sub_paid", status }),
      source(),
      NOW,
    );

    expect(result).toMatchObject({ outcome: "applied", userId: user.id, plan: "free" });
    expect(await reload(user.id)).toMatchObject({
      plan: "free",
      planStatus: status,
      planRenewsAt: null,
    });
  });

  it("leaves the user alone for an unknown status", async () => {
    const user = await createUser({
      plan: "pro",
      planStatus: "active",
      billingSubscriptionId: "sub_1",
    });
    const unknown = subscription({ userId: user.id, status: "something_new" });
    expect(await applySubscriptionState(unknown, source(), NOW)).toEqual({
      outcome: "ignored",
      reason: "unknown_status",
    });
    expect(await reload(user.id)).toEqual(user);
  });
});

describe("finding the user", () => {
  it("prefers the user id from custom_data", async () => {
    const buyer = await createUser();
    const someoneElse = await createUser();

    const result = await applySubscriptionState(
      subscription({ userId: buyer.id, email: someoneElse.email }),
      source(),
      NOW,
    );

    expect(result).toMatchObject({ outcome: "applied", userId: buyer.id });
    expect((await reload(someoneElse.id))?.plan).toBe("free");
  });

  it("falls back to the stored subscription id", async () => {
    const user = await createUser({ billingSubscriptionId: "sub_known" });
    const result = await applySubscriptionState(
      subscription({ subscriptionId: "sub_known" }),
      source(),
      NOW,
    );
    expect(result).toMatchObject({ outcome: "applied", userId: user.id });
  });

  it("won't let a new subscription in by the stored customer id alone, only with our signed id", async () => {
    const user = await createUser({ billingCustomerId: "cus_known" });
    const unsigned = subscription({ customerId: "cus_known" });
    expect(await applySubscriptionState(unsigned, source(), NOW)).toEqual({
      outcome: "ignored",
      reason: "unsigned",
    });
    expect(await reload(user.id)).toMatchObject({ plan: "free", billingSubscriptionId: null });

    const signed = await applySubscriptionState({ ...unsigned, userId: user.id }, source(), NOW);
    expect(signed).toMatchObject({ outcome: "applied", userId: user.id });
  });

  it("matches the email ignoring case and spaces, but an email match alone grants nothing", async () => {
    const user = await createUser({ email: "ada@example.com" });
    const result = await applySubscriptionState(
      subscription({ email: "  Ada@Example.COM " }),
      source(),
      NOW,
    );
    expect(result).toEqual({ outcome: "ignored", reason: "unsigned" });
    expect((await reload(user.id))?.plan).toBe("free");
  });

  it("reads the email only when no id matched and the status grants a plan", async () => {
    const user = await createUser({ email: "ada@example.com" });
    const resolveEmail = vi.fn(async () => "ADA@example.com");
    const state = subscription({ customerId: "cus_new", subscriptionId: "sub_new" });

    expect(
      await applySubscriptionState({ ...state, status: "canceled" }, source(), NOW, {
        resolveEmail,
      }),
    ).toEqual({ outcome: "ignored", reason: "no_user" });
    expect(resolveEmail).not.toHaveBeenCalled();

    expect(await applySubscriptionState(state, source(), NOW, { resolveEmail })).toEqual({
      outcome: "ignored",
      reason: "unsigned",
    });
    expect(resolveEmail).toHaveBeenCalledExactlyOnceWith("cus_new");
    expect((await reload(user.id))?.plan).toBe("free");
  });

  it("ignores subscriptions it can't match to anyone", async () => {
    await createUser();
    const result = await applySubscriptionState(
      subscription({ userId: "user_gone", email: "nobody@example.com" }),
      source(),
      NOW,
      { resolveEmail: async () => null },
    );
    expect(result).toEqual({ outcome: "ignored", reason: "no_user" });
  });

  it("finds the user for a transaction the same way", async () => {
    const user = await createUser({ billingCustomerId: "cus_t" });
    expect(await findBillingUserId({ customerId: "cus_t", subscriptionId: "sub_t" })).toBe(user.id);
    expect(
      await findBillingUserId({ userId: user.id, customerId: "cus_x", subscriptionId: "sub_x" }),
    ).toBe(user.id);
    expect(await findBillingUserId({ customerId: "cus_x", subscriptionId: "sub_x" })).toBeNull();
  });

  it("can answer from indexes alone, never needing a table scan", async () => {
    const db = await getDb();
    const query = findUserQuery(db, {
      userId: crypto.randomUUID(),
      email: "ada@example.com",
      customerId: "cus_1",
      subscriptionId: "sub_1",
    });

    const plan = await db.transaction(async (tx) => {
      await tx.execute(sql`set local enable_seqscan = off`);
      return tx.execute(sql`explain ${query.getSQL()}`);
    });
    const text = JSON.stringify(plan);
    expect(text).toContain("BitmapOr");
    expect(text.match(/Bitmap Index Scan on users_/g)).toHaveLength(4);
    expect(text).not.toContain("Seq Scan");
  });
});

describe("protecting paying users", () => {
  it("won't let another subscription's end downgrade an active subscriber", async () => {
    const user = await createUser({
      plan: "pro",
      planStatus: "active",
      billingCustomerId: "cus_1",
      billingSubscriptionId: "sub_paid",
    });

    const result = await applySubscriptionState(
      subscription({
        userId: user.id,
        customerId: "cus_1",
        subscriptionId: "sub_second",
        status: "paused",
      }),
      source(),
      NOW,
    );

    expect(result).toEqual({ outcome: "ignored", reason: "superseded" });
    expect(await reload(user.id)).toMatchObject({ plan: "pro", billingSubscriptionId: "sub_paid" });
  });

  it("lets a new subscription take over after the old one ended", async () => {
    const user = await createUser({ planStatus: "canceled", billingSubscriptionId: "sub_old" });
    const result = await applySubscriptionState(
      subscription({ userId: user.id, subscriptionId: "sub_new" }),
      source(),
      NOW,
    );
    expect(result).toMatchObject({ outcome: "applied", plan: "pro" });
    expect(await reload(user.id)).toMatchObject({ plan: "pro", billingSubscriptionId: "sub_new" });
  });

  it("remembers a subscription's end even when another had taken over, and never lets it grant again", async () => {
    const user = await createUser({
      plan: "pro",
      planStatus: "active",
      billingCustomerId: "cus_1",
      billingSubscriptionId: "sub_old",
    });
    const old = subscription({ userId: user.id, customerId: "cus_1", subscriptionId: "sub_old" });
    const fresh = subscription({ userId: user.id, customerId: "cus_1", subscriptionId: "sub_new" });
    expect(await applySubscriptionState(fresh, source(), NOW)).toMatchObject({
      outcome: "applied",
    });
    expect(await applySubscriptionState({ ...old, status: "canceled" }, source(), NOW)).toEqual({
      outcome: "ignored",
      reason: "superseded",
    });
    expect(
      await applySubscriptionState({ ...old, status: "scheduled_cancel" }, source(), NOW),
    ).toEqual({ outcome: "ignored", reason: "superseded" });
    expect(await reload(user.id)).toMatchObject({
      plan: "pro",
      planStatus: "active",
      billingSubscriptionId: "sub_new",
    });
    expect(
      await applySubscriptionState({ ...fresh, status: "canceled" }, source(), NOW),
    ).toMatchObject({ outcome: "applied", plan: "free" });
    expect(await applySubscriptionState({ ...fresh, status: "past_due" }, source(), NOW)).toEqual({
      outcome: "ignored",
      reason: "superseded",
    });
    expect(await reload(user.id)).toMatchObject({ plan: "free", billingSubscriptionId: "sub_new" });
  });

  it("ignores other prices, but follows the user's own subscription to a new price", async () => {
    const stranger = await createUser();
    expect(
      await applySubscriptionState(
        subscription({ userId: stranger.id, pricePlan: null }),
        source(),
        NOW,
      ),
    ).toEqual({ outcome: "ignored", reason: "other_product" });
    expect((await reload(stranger.id))?.plan).toBe("free");

    const subscriber = await createUser({ plan: "pro", billingSubscriptionId: "sub_mine" });
    const changed = await applySubscriptionState(
      subscription({ subscriptionId: "sub_mine", pricePlan: null, status: "canceled" }),
      source(),
      NOW,
    );
    expect(changed).toMatchObject({ outcome: "applied", userId: subscriber.id, plan: "free" });
  });
});

describe("idempotency", () => {
  it("applies each event id once", async () => {
    const db = await getDb();
    const user = await createUser();
    const event = source();

    expect(
      await applySubscriptionState(subscription({ userId: user.id }), event, NOW),
    ).toMatchObject({ outcome: "applied" });
    await db
      .update(users)
      .set({ plan: "free", planStatus: "canceled" })
      .where(eq(users.id, user.id));

    expect(await applySubscriptionState(subscription({ userId: user.id }), event, NOW + 1)).toEqual(
      { outcome: "duplicate" },
    );
    expect(await reload(user.id)).toMatchObject({
      plan: "free",
      planStatus: "canceled",
      updatedAt: NOW,
    });
    expect(await eventRows()).toEqual([
      { id: event.eventId, type: event.eventType, receivedAt: NOW },
    ]);
  });

  it("claims a key once", async () => {
    expect(await claimBillingEvent("checkout:sub_1", "payment.succeeded", NOW)).toBe(true);
    expect(await claimBillingEvent("checkout:sub_1", "payment.succeeded", NOW + 1)).toBe(false);
    expect(await eventRows()).toEqual([
      { id: "checkout:sub_1", type: "payment.succeeded", receivedAt: NOW },
    ]);
  });
});

describe("plans from prices", () => {
  it("grants the plan the price sells, and moves with a plan change", async () => {
    const user = await createUser();
    expect(
      await applySubscriptionState(
        subscription({ userId: user.id, pricePlan: "max" }),
        source(),
        NOW,
      ),
    ).toMatchObject({ outcome: "applied", plan: "max" });
    expect(await reload(user.id)).toMatchObject({ plan: "max", planRenewsAt: RENEWS_AT });

    const row = await reload(user.id);
    const downgraded = await applySubscriptionState(
      subscription({
        subscriptionId: row?.billingSubscriptionId ?? "",
        customerId: row?.billingCustomerId ?? "",
        pricePlan: "pro",
      }),
      source(),
      NOW,
    );
    expect(downgraded).toMatchObject({ outcome: "applied", plan: "pro" });
  });

  it("keeps the paid plan the user has when their own subscription moves to a price we don't list", async () => {
    const subscriber = await createUser({
      plan: "max",
      planInterval: "year",
      billingSubscriptionId: "sub_max",
    });
    const moved = await applySubscriptionState(
      subscription({
        subscriptionId: "sub_max",
        pricePlan: null,
        priceInterval: null,
        status: "active",
      }),
      source(),
      NOW,
    );
    expect(moved).toMatchObject({ outcome: "applied", userId: subscriber.id, plan: "max" });
    expect(await reload(subscriber.id)).toMatchObject({ plan: "max", planInterval: "year" });
  });

  it("stores the price's billing interval, moves with a change, and clears it on Free", async () => {
    const user = await createUser();
    await applySubscriptionState(
      subscription({ userId: user.id, subscriptionId: "sub_i", priceInterval: "month" }),
      source(),
      NOW,
    );
    expect(await reload(user.id)).toMatchObject({ plan: "pro", planInterval: "month" });

    await applySubscriptionState(
      subscription({ subscriptionId: "sub_i", priceInterval: "year" }),
      source(),
      NOW,
    );
    expect(await reload(user.id)).toMatchObject({ plan: "pro", planInterval: "year" });

    await applySubscriptionState(
      subscription({ subscriptionId: "sub_i", priceInterval: "year", status: "canceled" }),
      source(),
      NOW,
    );
    expect(await reload(user.id)).toMatchObject({ plan: "free", planInterval: null });
  });

  it("clears the interval when we cancel the subscription ourselves", async () => {
    const user = await createUser({
      plan: "pro",
      planInterval: "year",
      billingSubscriptionId: "sub_gone",
    });
    await markSubscriptionCancelled(user.id, "sub_gone", NOW);
    expect(await reload(user.id)).toMatchObject({
      plan: "free",
      planInterval: null,
      planStatus: "canceled",
    });
  });
});

describe("the trial", () => {
  const TRIAL_ENDS = Date.UTC(2026, 10, 9, 12);

  it("keeps the trial's allowance through a cancellation scheduled during it, and ends it on payment", async () => {
    const user = await createUser();
    const started = await applySubscriptionState(
      subscription({
        userId: user.id,
        subscriptionId: "sub_t",
        status: "trialing",
        periodEndsAt: TRIAL_ENDS,
      }),
      source(),
      NOW,
    );
    expect(started).toMatchObject({
      outcome: "applied",
      plan: "pro",
      trialing: true,
      before: { plan: "free" },
    });

    await applySubscriptionState(
      subscription({ subscriptionId: "sub_t", status: "scheduled_cancel", renewsAt: null }),
      source(),
      NOW,
    );
    expect(await reload(user.id)).toMatchObject({
      plan: "pro",
      trialEndsAt: TRIAL_ENDS,
      planRenewsAt: null,
    });

    const paid = await applySubscriptionState(
      subscription({ subscriptionId: "sub_t" }),
      source(),
      NOW,
    );
    expect(paid).toMatchObject({ outcome: "applied", trialing: false, before: { trialing: true } });
    expect(await reload(user.id)).toMatchObject({ plan: "pro", trialEndsAt: null });
  });

  it("takes the trial end the provider reports, and null ends it whatever the status", async () => {
    const user = await createUser();
    await applySubscriptionState(
      subscription({
        userId: user.id,
        subscriptionId: "sub_r",
        status: "trialing",
        trialEndsAt: TRIAL_ENDS,
        periodEndsAt: RENEWS_AT,
      }),
      source(),
      NOW,
    );
    expect((await reload(user.id))?.trialEndsAt).toBe(TRIAL_ENDS);

    await applySubscriptionState(
      subscription({
        subscriptionId: "sub_r",
        status: "scheduled_cancel",
        renewsAt: null,
        trialEndsAt: null,
      }),
      source(),
      NOW,
    );
    expect(await reload(user.id)).toMatchObject({
      planStatus: "scheduled_cancel",
      trialEndsAt: null,
    });
  });

  it("drops an event older than the last one applied for the same subscription", async () => {
    const user = await createUser();
    await applySubscriptionState(
      subscription({ userId: user.id, subscriptionId: "sub_o", eventAt: 2_000 }),
      source(),
      NOW,
    );
    const late = await applySubscriptionState(
      subscription({ subscriptionId: "sub_o", status: "canceled", eventAt: 1_000 }),
      source(),
      NOW,
    );
    expect(late).toEqual({ outcome: "ignored", reason: "superseded" });
    expect(await reload(user.id)).toMatchObject({ plan: "pro", billingEventAt: 2_000 });
  });
});

describe("trial replacements", () => {
  async function replaced() {
    return replacementRows();
  }

  const trialist = (subscriptionId: string) =>
    createUser({
      plan: "pro",
      planStatus: "trialing",
      trialEndsAt: NOW + 1000,
      billingSubscriptionId: subscriptionId,
    });

  it("records the trial to cancel only once the new subscription is paid for", async () => {
    const unpaid = await trialist("sub_trial_unpaid");
    await applySubscriptionState(
      subscription({
        userId: unpaid.id,
        subscriptionId: "sub_max_unpaid",
        pricePlan: "max",
        status: "past_due",
        replacesSubscriptionId: "sub_trial_unpaid",
      }),
      source(),
      NOW,
    );
    expect(await replaced()).toEqual([]);

    const user = await trialist("sub_trial");
    const state = subscription({
      userId: user.id,
      subscriptionId: "sub_max",
      pricePlan: "max",
      replacesSubscriptionId: "sub_trial",
    });
    await applySubscriptionState(state, source(), NOW);
    expect(await replaced()).toMatchObject([
      { replacedSubscriptionId: "sub_trial", subscriptionId: "sub_max", userId: user.id },
    ]);

    const trialEvent = subscription({ subscriptionId: "sub_trial", status: "trialing" });
    expect(await applySubscriptionState(trialEvent, source(), NOW)).toEqual({
      outcome: "ignored",
      reason: "replaced",
    });
  });

  it("never records a subscription the user isn't on, so a forged custom_data can't cancel it", async () => {
    await trialist("sub_victim");
    const user = await trialist("sub_own_trial");
    const forged = subscription({
      userId: user.id,
      subscriptionId: "sub_forged",
      pricePlan: "max",
      replacesSubscriptionId: "sub_victim",
    });
    for (let delivery = 0; delivery < 2; delivery += 1) {
      expect(await applySubscriptionState(forged, source(), NOW)).toMatchObject({
        outcome: "applied",
      });
    }
    expect(await replaced()).toEqual([]);
  });
});

describe("one trial per person", () => {
  const unpaidTrial = (overrides: Partial<SubscriptionState> = {}) =>
    subscription({ status: "trialing", unpaidTrial: true, ...overrides });

  it("refuses an unpaid trial to someone who had one, recording only the event and the cancel to do", async () => {
    const user = await createUser({
      planStatus: "canceled",
      billingCustomerId: "cus_old",
      billingSubscriptionId: "sub_old",
    });
    const event = source();
    expect(
      await applySubscriptionState(
        unpaidTrial({ userId: user.id, subscriptionId: "sub_again" }),
        event,
        NOW,
      ),
    ).toEqual({ outcome: "rejected", reason: "trial_reused", userId: user.id });
    expect(await reload(user.id)).toEqual(user);
    expect(await trialRows()).toEqual([]);
    expect(await replacementRows()).toEqual([
      {
        replacedSubscriptionId: "sub_again",
        subscriptionId: "sub_again",
        userId: user.id,
        attempts: 0,
        createdAt: NOW,
        cancelledAt: null,
      },
    ]);
    expect((await eventRows()).map((row) => row.id)).toEqual([event.eventId]);

    const paid = subscription({ userId: user.id, subscriptionId: "sub_again" });
    expect(await applySubscriptionState(paid, source(), NOW)).toEqual({
      outcome: "ignored",
      reason: "replaced",
    });
  });

  it("refuses it to a paying user and to an email already in the trial history", async () => {
    const paying = await createUser({
      plan: "pro",
      planStatus: "active",
      billingSubscriptionId: "sub_paid",
    });
    expect(
      await applySubscriptionState(unpaidTrial({ userId: paying.id }), source(), NOW),
    ).toMatchObject({ outcome: "rejected" });
    expect(await reload(paying.id)).toEqual(paying);

    const returning = await createUser();
    await addTrialHistory({
      emailHash: emailFingerprint(returning.email),
      kind: "paid",
      createdAt: 1,
    });
    expect(
      await applySubscriptionState(
        unpaidTrial({ userId: returning.id, status: "past_due" }),
        source(),
        NOW,
      ),
    ).toMatchObject({ outcome: "rejected" });
    expect(await reload(returning.id)).toEqual(returning);
  });

  it("grants a first trial, and every later event of that same subscription", async () => {
    const user = await createUser();
    const trial = unpaidTrial({ userId: user.id, subscriptionId: "sub_first" });
    expect(await applySubscriptionState(trial, source(), NOW)).toMatchObject({
      outcome: "applied",
      trialing: true,
    });
    for (const status of ["trialing", "scheduled_cancel", "past_due"]) {
      expect(
        await applySubscriptionState({ ...trial, status, userId: undefined }, source(), NOW),
      ).toMatchObject({ outcome: "applied", userId: user.id });
    }
    expect(await reload(user.id)).toMatchObject({ plan: "pro", planStatus: "past_due" });
    expect(await replacementRows()).toEqual([]);
  });

  it("doesn't check a subscription that isn't an unpaid trial", async () => {
    const user = await createUser({ planStatus: "canceled", billingSubscriptionId: "sub_old" });
    expect(
      await applySubscriptionState(subscription({ userId: user.id }), source(), NOW),
    ).toMatchObject({ outcome: "applied", plan: "pro" });
  });
});

describe("a second live subscription", () => {
  it("is named when a paid grant takes over from a different live one", async () => {
    const user = await createUser({
      plan: "pro",
      planStatus: "past_due",
      billingSubscriptionId: "sub_live",
    });
    expect(
      await applySubscriptionState(
        subscription({ userId: user.id, subscriptionId: "sub_new", pricePlan: "max" }),
        source(),
        NOW,
      ),
    ).toMatchObject({ outcome: "applied", plan: "max", otherLiveSubscriptionId: "sub_live" });
  });

  it("isn't for the same subscription, an ended one, a trial being replaced or a downgrade", async () => {
    const same = await createUser({
      plan: "pro",
      planStatus: "active",
      billingSubscriptionId: "s1",
    });
    const ended = await createUser({ planStatus: "canceled", billingSubscriptionId: "s2" });
    const trialist = await createUser({
      plan: "pro",
      planStatus: "trialing",
      trialEndsAt: NOW + 1000,
      billingSubscriptionId: "s3",
    });
    const states = [
      subscription({ userId: same.id, subscriptionId: "s1", pricePlan: "max" }),
      subscription({ userId: ended.id, subscriptionId: "s2_new" }),
      subscription({ userId: trialist.id, subscriptionId: "s3_max", replacesSubscriptionId: "s3" }),
      subscription({ userId: same.id, subscriptionId: "s1", status: "canceled" }),
    ];
    for (const state of states) {
      expect(await applySubscriptionState(state, source(), NOW)).toMatchObject({
        outcome: "applied",
        otherLiveSubscriptionId: null,
      });
    }
  });
});

describe("billing periods", () => {
  const MINUTE = 60_000;
  const DAY = 24 * 60 * MINUTE;

  async function sessionOf(id: string) {
    const row = await reload(id);
    if (!row) throw new Error("user missing");
    return toSessionUser(row);
  }

  it("stores the period, keeps it through an event without dates, and clears it on Free", async () => {
    const user = await createUser();
    const state = subscription({ userId: user.id, subscriptionId: "sub_period" });
    await applySubscriptionState(state, source(), NOW);
    expect(await reload(user.id)).toMatchObject({
      planPeriodStartsAt: PERIOD_STARTS_AT,
      planPeriodEndsAt: RENEWS_AT,
    });

    await applySubscriptionState(
      { ...state, periodStartsAt: null, periodEndsAt: null },
      source(),
      NOW,
    );
    expect(await reload(user.id)).toMatchObject({
      planPeriodStartsAt: PERIOD_STARTS_AT,
      planPeriodEndsAt: RENEWS_AT,
    });

    await applySubscriptionState({ ...state, status: "canceled" }, source(), NOW);
    expect(await reload(user.id)).toMatchObject({
      plan: "free",
      planPeriodStartsAt: null,
      planPeriodEndsAt: null,
    });
  });

  it("keeps what was used when Pro becomes Max partway through, then starts over at the renewal", async () => {
    const user = await createUser();
    const pro = subscription({ userId: user.id, subscriptionId: "sub_up" });
    await applySubscriptionState(pro, source(), NOW);
    const mid = NOW + 10 * DAY;
    const asPro = await sessionOf(user.id);
    for (let i = 0; i < 3; i++) await consumeUsage(asPro, "tailor", mid);

    const renewsAt = addMonths(mid, 1);
    const max = {
      ...pro,
      pricePlan: "max" as const,
      periodStartsAt: mid,
      periodEndsAt: renewsAt,
      renewsAt,
    };
    await applySubscriptionState(max, source(), mid + MINUTE);
    const asMax = await sessionOf(user.id);
    expect(await getUsage(asMax, mid + MINUTE)).toMatchObject({
      tailor: { used: 3, limit: PLANS.max.limits.tailor },
    });

    const renewal = {
      ...max,
      periodStartsAt: renewsAt,
      periodEndsAt: addMonths(mid, 2),
      renewsAt: addMonths(mid, 2),
    };
    await applySubscriptionState(renewal, source(), renewsAt + MINUTE);
    const renewed = await sessionOf(user.id);
    expect((await getUsage(renewed, renewsAt + MINUTE)).tailor.used).toBe(0);
    expect((await getUsage(renewed, renewsAt - MINUTE)).tailor.used).toBe(3);
  });

  it("keeps this month's count for a row paid before billing periods", async () => {
    const user = await createUser({
      plan: "pro",
      planInterval: "month",
      planStatus: "active",
      planRenewsAt: RENEWS_AT,
      billingSubscriptionId: "sub_old",
    });
    const asOld = await sessionOf(user.id);
    const mid = NOW + 10 * DAY;
    for (let i = 0; i < 2; i++) await consumeUsage(asOld, "fix", mid);
    await applySubscriptionState(
      subscription({ subscriptionId: "sub_old", status: "scheduled_cancel", renewsAt: null }),
      source(),
      mid,
    );
    const dated = await sessionOf(user.id);
    expect(dated).toMatchObject({
      planPeriodStartsAt: PERIOD_STARTS_AT,
      planPeriodEndsAt: RENEWS_AT,
    });
    expect((await getUsage(dated, mid)).fix.used).toBe(2);
  });
});
