import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { billingEvents, users, type UserRow } from "@/db/schema";
import { insertUserRow, resetDb } from "@/lib/auth/test-helpers";
import {
  applySubscriptionState,
  findUserQuery,
  markSubscriptionCancelled,
  planForStatus,
  type SubscriptionState,
} from "./entitlements";

const NOW = Date.UTC(2026, 10, 6, 12);
const RENEWS_AT = Date.UTC(2026, 11, 6, 12);

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
    billingCustomerId: null,
    billingSubscriptionId: null,
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
    customerId: next("cus"),
    subscriptionId: next("sub"),
    productPlan: "pro",
    productInterval: "month",
    status: "active",
    renewsAt: RENEWS_AT,
    ...overrides,
  };
}

const source = () => ({ eventId: next("msg"), eventType: "subscription.updated" });

beforeEach(async () => {
  await resetDb();
});

describe("planForStatus", () => {
  const cases: Array<[string, "paid" | "free" | null]> = [
    ["active", "paid"],
    ["past_due", "paid"],
    ["on_hold", "free"],
    ["paused", "free"],
    ["cancelled", "free"],
    ["expired", "free"],
    ["failed", "free"],
    ["pending", null],
    ["something_new", null],
  ];

  it.each(cases)("maps %s to %s", (status, plan) => {
    expect(planForStatus(status)).toBe(plan);
  });
});

describe("applySubscriptionState", () => {
  it("grants Pro for an active subscription and stores the billing details", async () => {
    const user = await createUser();
    const state = subscription({ userId: user.id });

    const result = await applySubscriptionState(state, source(), NOW);

    expect(result).toEqual({ outcome: "applied", userId: user.id, plan: "pro" });
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

  it.each(["cancelled", "expired", "on_hold", "paused", "failed"])(
    "takes Pro away when the subscription is %s",
    async (status) => {
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

      expect(result).toEqual({ outcome: "applied", userId: user.id, plan: "free" });
      expect(await reload(user.id)).toMatchObject({ plan: "free", planStatus: status, planRenewsAt: null });
    },
  );

  it("leaves the user alone for pending and unknown statuses", async () => {
    const user = await createUser({ plan: "pro", planStatus: "active", billingSubscriptionId: "sub_1" });

    const pending = subscription({ userId: user.id, status: "pending" });
    const unknown = subscription({ userId: user.id, status: "something_new" });

    expect(await applySubscriptionState(pending, source(), NOW)).toEqual({
      outcome: "ignored",
      reason: "no_change",
    });
    expect(await applySubscriptionState(unknown, source(), NOW)).toEqual({
      outcome: "ignored",
      reason: "unknown_status",
    });
    expect(await reload(user.id)).toEqual(user);
  });
});

describe("finding the user", () => {
  it("prefers the user id from checkout metadata", async () => {
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
    const result = await applySubscriptionState(subscription({ subscriptionId: "sub_known" }), source(), NOW);
    expect(result).toMatchObject({ outcome: "applied", userId: user.id });
  });

  it("falls back to the stored customer id", async () => {
    const user = await createUser({ billingCustomerId: "cus_known" });
    const result = await applySubscriptionState(subscription({ customerId: "cus_known" }), source(), NOW);
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

  it("ignores subscriptions it can't match to anyone", async () => {
    await createUser();
    const result = await applySubscriptionState(
      subscription({ userId: "user_gone", email: "nobody@example.com" }),
      source(),
      NOW,
    );
    expect(result).toEqual({ outcome: "ignored", reason: "no_user" });
  });

  it("can answer from indexes alone, never needing a table scan", async () => {
    const db = await getDb();
    const query = findUserQuery(db, {
      userId: crypto.randomUUID(),
      email: "ada@example.com",
      customerId: "cus_1",
      subscriptionId: "sub_1",
    });

    // A near-empty table is cheapest to scan, so the planner is told scans cost too much: if any
    // OR branch had no index, it would have to scan anyway.
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
  it("won't let another subscription's failure downgrade an active subscriber", async () => {
    const user = await createUser({
      plan: "pro",
      planStatus: "active",
      billingCustomerId: "cus_1",
      billingSubscriptionId: "sub_paid",
    });

    const result = await applySubscriptionState(
      subscription({ userId: user.id, customerId: "cus_1", subscriptionId: "sub_second", status: "failed" }),
      source(),
      NOW,
    );

    expect(result).toEqual({ outcome: "ignored", reason: "superseded" });
    expect(await reload(user.id)).toMatchObject({ plan: "pro", billingSubscriptionId: "sub_paid" });
  });

  it("lets a new subscription take over after the old one ended", async () => {
    const user = await createUser({ planStatus: "cancelled", billingSubscriptionId: "sub_old" });
    const result = await applySubscriptionState(
      subscription({ userId: user.id, subscriptionId: "sub_new" }),
      source(),
      NOW,
    );
    expect(result).toMatchObject({ outcome: "applied", plan: "pro" });
    expect(await reload(user.id)).toMatchObject({ plan: "pro", billingSubscriptionId: "sub_new" });
  });

  it("ignores other products, but follows the user's own subscription to a new product", async () => {
    const stranger = await createUser();
    expect(
      await applySubscriptionState(subscription({ userId: stranger.id, productPlan: null }), source(), NOW),
    ).toEqual({ outcome: "ignored", reason: "other_product" });
    expect((await reload(stranger.id))?.plan).toBe("free");

    const subscriber = await createUser({ plan: "pro", billingSubscriptionId: "sub_mine" });
    const changed = await applySubscriptionState(
      subscription({ subscriptionId: "sub_mine", productPlan: null, status: "cancelled" }),
      source(),
      NOW,
    );
    expect(changed).toEqual({ outcome: "applied", userId: subscriber.id, plan: "free" });
  });
});

describe("idempotency", () => {
  it("applies each webhook id once", async () => {
    const db = await getDb();
    const user = await createUser();
    const event = source();

    expect(await applySubscriptionState(subscription({ userId: user.id }), event, NOW)).toMatchObject({
      outcome: "applied",
    });
    // Change the row behind the webhook's back: applying the same event again would undo this.
    await db.update(users).set({ plan: "free", planStatus: "cancelled" }).where(eq(users.id, user.id));

    expect(await applySubscriptionState(subscription({ userId: user.id }), event, NOW + 1)).toEqual({
      outcome: "duplicate",
    });
    expect(await reload(user.id)).toMatchObject({ plan: "free", planStatus: "cancelled", updatedAt: NOW });
    expect(await db.select().from(billingEvents)).toEqual([
      { id: event.eventId, type: event.eventType, receivedAt: NOW },
    ]);
  });
});

describe("plans from products", () => {
  it("grants the plan the product sells, and moves with a plan change", async () => {
    const user = await createUser();
    expect(
      await applySubscriptionState(subscription({ userId: user.id, productPlan: "max" }), source(), NOW),
    ).toMatchObject({ outcome: "applied", plan: "max" });
    expect(await reload(user.id)).toMatchObject({ plan: "max", planRenewsAt: RENEWS_AT });

    const row = await reload(user.id);
    const downgraded = await applySubscriptionState(
      subscription({
        subscriptionId: row?.billingSubscriptionId ?? "",
        customerId: row?.billingCustomerId ?? "",
        productPlan: "pro",
      }),
      source(),
      NOW,
    );
    expect(downgraded).toMatchObject({ outcome: "applied", plan: "pro" });
  });

  it("keeps the paid plan the user has when their own subscription moves to a product we don't list", async () => {
    const subscriber = await createUser({ plan: "max", planInterval: "week", billingSubscriptionId: "sub_max" });
    const moved = await applySubscriptionState(
      subscription({ subscriptionId: "sub_max", productPlan: null, productInterval: null, status: "active" }),
      source(),
      NOW,
    );
    expect(moved).toEqual({ outcome: "applied", userId: subscriber.id, plan: "max" });
    expect(await reload(subscriber.id)).toMatchObject({ plan: "max", planInterval: "week" });
  });

  it("stores the product's billing interval, moves with a change, and clears it on Free", async () => {
    const user = await createUser();
    await applySubscriptionState(
      subscription({ userId: user.id, subscriptionId: "sub_w", productPlan: "pro", productInterval: "week" }),
      source(),
      NOW,
    );
    expect(await reload(user.id)).toMatchObject({ plan: "pro", planInterval: "week" });

    await applySubscriptionState(
      subscription({ subscriptionId: "sub_w", productPlan: "pro", productInterval: "year" }),
      source(),
      NOW,
    );
    expect(await reload(user.id)).toMatchObject({ plan: "pro", planInterval: "year" });

    await applySubscriptionState(
      subscription({ subscriptionId: "sub_w", productPlan: "pro", productInterval: "year", status: "expired" }),
      source(),
      NOW,
    );
    expect(await reload(user.id)).toMatchObject({ plan: "free", planInterval: null });
  });

  it("clears the interval when we cancel the subscription ourselves", async () => {
    const user = await createUser({ plan: "pro", planInterval: "week", billingSubscriptionId: "sub_gone" });
    await markSubscriptionCancelled(user.id, "sub_gone", NOW);
    expect(await reload(user.id)).toMatchObject({ plan: "free", planInterval: null, planStatus: "cancelled" });
  });
});

