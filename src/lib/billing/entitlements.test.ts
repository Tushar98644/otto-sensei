import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PLANS } from "@/config/plans";
import { getDb } from "@/db/client";
import { billingEvents, trialReplacements, users, type UserRow } from "@/db/schema";
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
    ["canceled", "free"],
    ["something_new", null],
    ["toString", null],
  ];

  it.each(cases)("maps %s to %s", (status, plan) => {
    expect(planForStatus(status)).toBe(plan);
  });

  it("counts everything but canceled as live", () => {
    expect(["active", "trialing", "past_due", "paused"].every(isLiveStatus)).toBe(true);
    expect(isLiveStatus("canceled")).toBe(false);
    const record = {
      plan: "free" as const,
      billingCustomerId: "ctm_1",
      billingSubscriptionId: "sub_1",
    };
    expect(chargeableSubscriptionId({ ...record, planStatus: "paused" })).toBe("sub_1");
    expect(chargeableSubscriptionId({ ...record, planStatus: "canceled" })).toBeNull();
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
      billingCustomerId: "ctm_paid",
      billingSubscriptionId: "sub_paid",
    });

    const result = await applySubscriptionState(
      subscription({ customerId: "ctm_paid", subscriptionId: "sub_paid", status }),
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

  it("falls back to the stored customer id", async () => {
    const user = await createUser({ billingCustomerId: "ctm_known" });
    const result = await applySubscriptionState(
      subscription({ customerId: "ctm_known" }),
      source(),
      NOW,
    );
    expect(result).toMatchObject({ outcome: "applied", userId: user.id });
  });

  it("falls back to the email, ignoring case and spaces", async () => {
    const user = await createUser({ email: "ada@example.com" });
    const result = await applySubscriptionState(
      subscription({ email: "  Ada@Example.COM " }),
      source(),
      NOW,
    );
    expect(result).toMatchObject({ outcome: "applied", userId: user.id });
  });

  it("reads the email only when no id matched and the status grants a plan", async () => {
    const user = await createUser({ email: "ada@example.com" });
    const resolveEmail = vi.fn(async () => "ADA@example.com");
    const state = subscription({ customerId: "ctm_new", subscriptionId: "sub_new" });

    expect(
      await applySubscriptionState({ ...state, status: "canceled" }, source(), NOW, {
        resolveEmail,
      }),
    ).toEqual({ outcome: "ignored", reason: "no_user" });
    expect(resolveEmail).not.toHaveBeenCalled();

    expect(await applySubscriptionState(state, source(), NOW, { resolveEmail })).toMatchObject({
      outcome: "applied",
      userId: user.id,
    });
    expect(resolveEmail).toHaveBeenCalledExactlyOnceWith("ctm_new");

    await applySubscriptionState(state, source(), NOW, { resolveEmail });
    expect(resolveEmail).toHaveBeenCalledTimes(1);
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
    const user = await createUser({ billingCustomerId: "ctm_t" });
    expect(await findBillingUserId({ customerId: "ctm_t", subscriptionId: "sub_t" })).toBe(user.id);
    expect(
      await findBillingUserId({ userId: user.id, customerId: "ctm_x", subscriptionId: "sub_x" }),
    ).toBe(user.id);
    expect(await findBillingUserId({ customerId: "ctm_x", subscriptionId: "sub_x" })).toBeNull();
  });

  it("can answer from indexes alone, never needing a table scan", async () => {
    const db = await getDb();
    const query = findUserQuery(db, {
      userId: crypto.randomUUID(),
      email: "ada@example.com",
      customerId: "ctm_1",
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
      billingCustomerId: "ctm_1",
      billingSubscriptionId: "sub_paid",
    });

    const result = await applySubscriptionState(
      subscription({
        userId: user.id,
        customerId: "ctm_1",
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
    expect(await db.select().from(billingEvents)).toEqual([
      { id: event.eventId, type: event.eventType, receivedAt: NOW },
    ]);
  });

  it("claims a key once", async () => {
    expect(await claimBillingEvent("checkout:sub_1", "transaction.completed", NOW)).toBe(true);
    expect(await claimBillingEvent("checkout:sub_1", "transaction.completed", NOW + 1)).toBe(false);
    expect(await (await getDb()).select().from(billingEvents)).toEqual([
      { id: "checkout:sub_1", type: "transaction.completed", receivedAt: NOW },
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
    return (await getDb()).select().from(trialReplacements);
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
