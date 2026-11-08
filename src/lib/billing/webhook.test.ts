import type { DodoPayments } from "dodopayments";
import { eq } from "drizzle-orm";
import { Webhook } from "standardwebhooks";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { execSql } from "@/db/testing";
import { billingEvents, users, type UserRow } from "@/db/schema";
import { insertUserRow, resetDb } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import { handleWebhook } from "./index";

// "whsec_" + base64 key, the format Dodo shows in its dashboard.
const SECRET = `whsec_${Buffer.from("otto-resume-test-webhook-signing-key").toString("base64")}`;
const OTHER_SECRET = `whsec_${Buffer.from("some-other-signing-key-entirely").toString("base64")}`;
const PRODUCT_ID = "pdt_otto_pro";
const NEXT_BILLING = "2026-12-06T12:00:00Z";

let sequence = 0;
const next = (prefix: string) => `${prefix}_${++sequence}`;

type EventData = {
  subscription_id: string;
  product_id: string;
  status: string;
  next_billing_date: string;
  cancel_at_next_billing_date: boolean;
  customer: { customer_id: string; email: string; name: string };
  metadata: Record<string, string>;
};

function eventBody(type: DodoPayments.WebhookEventType, data: Partial<EventData> = {}): string {
  const base: EventData = {
    subscription_id: "sub_1",
    product_id: PRODUCT_ID,
    status: "active",
    next_billing_date: NEXT_BILLING,
    cancel_at_next_billing_date: false,
    customer: { customer_id: "cus_1", email: "ada@example.com", name: "Ada" },
    metadata: {},
  };
  return JSON.stringify({
    business_id: "bus_test",
    type,
    timestamp: new Date().toISOString(),
    data: { payload_type: "Subscription", ...base, ...data },
  });
}

function signed(
  body: string,
  options: { id?: string; secret?: string; at?: Date } = {},
): Headers {
  const id = options.id ?? next("msg");
  const at = options.at ?? new Date();
  return new Headers({
    "webhook-id": id,
    "webhook-timestamp": String(Math.floor(at.getTime() / 1000)),
    "webhook-signature": new Webhook(options.secret ?? SECRET).sign(id, at, body),
  });
}

async function createUser(overrides: Partial<UserRow> = {}): Promise<UserRow> {
  const row: UserRow = {
    id: crypto.randomUUID(),
    email: "ada@example.com",
    plan: "free",
    planStatus: null,
    planRenewsAt: null,
    planInterval: null,
    billingCustomerId: null,
    billingSubscriptionId: null,
    createdAt: 1,
    updatedAt: 1,
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

beforeEach(async () => {
  vi.stubEnv("DODO_PAYMENTS_WEBHOOK_KEY", SECRET);
  vi.stubEnv("DODO_PAYMENTS_PRODUCT_ID", PRODUCT_ID);
  resetEnvForTests();
  await resetDb();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("plans", () => {
  it("gives Max for a Max product, and follows a plan change back to Pro", async () => {
    vi.stubEnv("DODO_PAYMENTS_MAX_PRODUCT_ID_YEARLY", "pdt_otto_max_year");
    resetEnvForTests();
    const user = await createUser();
    const bought = eventBody("subscription.active", {
      product_id: "pdt_otto_max_year",
      metadata: { user_id: user.id },
    });
    expect(await handleWebhook(bought, signed(bought))).toEqual({ status: 200, message: "applied" });
    expect(await reload(user.id)).toMatchObject({ plan: "max", planInterval: "year" });

    const changed = eventBody("subscription.plan_changed", { product_id: PRODUCT_ID });
    expect(await handleWebhook(changed, signed(changed))).toEqual({ status: 200, message: "applied" });
    expect(await reload(user.id)).toMatchObject({ plan: "pro", planInterval: "month" });
  });

  it("stores how often the product bills, follows a plan change, and clears it on Free", async () => {
    vi.stubEnv("DODO_PAYMENTS_PRODUCT_ID_WEEKLY", "pdt_otto_pro_week");
    vi.stubEnv("DODO_PAYMENTS_MAX_PRODUCT_ID_WEEKLY", "pdt_otto_max_week");
    resetEnvForTests();
    const user = await createUser();
    const bought = eventBody("subscription.active", {
      product_id: "pdt_otto_pro_week",
      next_billing_date: "2026-11-19T09:30:00Z",
      metadata: { user_id: user.id },
    });
    expect(await handleWebhook(bought, signed(bought))).toEqual({ status: 200, message: "applied" });
    expect(await reload(user.id)).toMatchObject({
      plan: "pro",
      planInterval: "week",
      planRenewsAt: Date.parse("2026-11-19T09:30:00Z"),
    });

    const upgraded = eventBody("subscription.plan_changed", { product_id: "pdt_otto_max_week" });
    expect(await handleWebhook(upgraded, signed(upgraded))).toEqual({ status: 200, message: "applied" });
    expect(await reload(user.id)).toMatchObject({ plan: "max", planInterval: "week" });

    const monthly = eventBody("subscription.plan_changed", { product_id: PRODUCT_ID });
    expect(await handleWebhook(monthly, signed(monthly))).toEqual({ status: 200, message: "applied" });
    expect(await reload(user.id)).toMatchObject({ plan: "pro", planInterval: "month" });

    const ended = eventBody("subscription.cancelled", { status: "cancelled" });
    expect(await handleWebhook(ended, signed(ended))).toEqual({ status: 200, message: "applied" });
    expect(await reload(user.id)).toMatchObject({ plan: "free", planInterval: null });
  });

  it("ignores a product that is neither plan", async () => {
    const user = await createUser();
    const body = eventBody("subscription.active", {
      subscription_id: "sub_other",
      product_id: "pdt_ebook",
      metadata: { user_id: user.id },
    });
    expect(await handleWebhook(body, signed(body))).toEqual({ status: 200, message: "ignored" });
    expect((await reload(user.id))?.plan).toBe("free");
  });
});

describe("signature", () => {
  it("accepts a correctly signed event and upgrades the user", async () => {
    const user = await createUser();
    const body = eventBody("subscription.active", { metadata: { user_id: user.id } });

    expect(await handleWebhook(body, signed(body))).toEqual({ status: 200, message: "applied" });
    expect(await reload(user.id)).toMatchObject({
      plan: "pro",
      planStatus: "active",
      planRenewsAt: Date.parse(NEXT_BILLING),
      billingCustomerId: "cus_1",
      billingSubscriptionId: "sub_1",
    });
  });

  it("rejects an event signed with another key", async () => {
    const user = await createUser();
    const body = eventBody("subscription.active", { metadata: { user_id: user.id } });

    expect(await handleWebhook(body, signed(body, { secret: OTHER_SECRET }))).toEqual({
      status: 401,
      message: "invalid_signature",
    });
    expect((await reload(user.id))?.plan).toBe("free");
  });

  it("rejects a body changed after signing", async () => {
    const user = await createUser();
    const original = eventBody("subscription.cancelled", { status: "cancelled" });
    const tampered = eventBody("subscription.active", { metadata: { user_id: user.id } });

    expect((await handleWebhook(tampered, signed(original))).status).toBe(401);
    expect((await reload(user.id))?.plan).toBe("free");
  });

  it("rejects missing signature headers", async () => {
    const body = eventBody("subscription.active");
    expect((await handleWebhook(body, new Headers())).status).toBe(401);
  });

  it("rejects a replay of an old delivery", async () => {
    const body = eventBody("subscription.active");
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    expect((await handleWebhook(body, signed(body, { at: tenMinutesAgo }))).status).toBe(401);
  });

  it("answers 503 while no webhook key is configured", async () => {
    vi.stubEnv("DODO_PAYMENTS_WEBHOOK_KEY", "");
    resetEnvForTests();
    const body = eventBody("subscription.active");
    expect(await handleWebhook(body, signed(body))).toEqual({ status: 503, message: "not_configured" });
  });

  it("refuses oversized bodies before checking the signature", async () => {
    const body = "x".repeat(300 * 1024);
    expect(await handleWebhook(body, signed(body))).toEqual({ status: 413, message: "too_large" });
  });
});

describe("idempotency", () => {
  it("treats a repeated webhook id as a duplicate and applies it once", async () => {
    const db = await getDb();
    const user = await createUser();
    const body = eventBody("subscription.active", { metadata: { user_id: user.id } });
    const headers = signed(body);

    expect(await handleWebhook(body, headers)).toEqual({ status: 200, message: "applied" });
    await db.update(users).set({ plan: "free" }).where(eq(users.id, user.id));

    expect(await handleWebhook(body, headers)).toEqual({ status: 200, message: "duplicate" });
    expect((await reload(user.id))?.plan).toBe("free");
    expect(await db.select().from(billingEvents)).toHaveLength(1);
  });

  it("answers 500 when the database fails, records nothing, and the retry then goes through", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const db = await getDb();
    const user = await createUser();
    const body = eventBody("subscription.active", { metadata: { user_id: user.id } });
    const headers = signed(body);
    // Fails the plan update after the event id was already inserted in the same transaction.
    await execSql(`create function fail_update() returns trigger language plpgsql as
      $$ begin raise exception 'disk full'; end $$`);
    await execSql("create trigger fail_update before update on users for each row execute function fail_update()");

    expect(await handleWebhook(body, headers)).toEqual({ status: 500, message: "retry" });
    expect(await db.select().from(billingEvents)).toEqual([]);
    await execSql("drop trigger fail_update on users");
    await execSql("drop function fail_update");

    expect(await handleWebhook(body, headers)).toEqual({ status: 200, message: "applied" });
    expect((await reload(user.id))?.plan).toBe("pro");
  });
});

describe("subscription lifecycle", () => {
  async function subscriber() {
    return createUser({
      plan: "pro",
      planStatus: "active",
      billingCustomerId: "cus_1",
      billingSubscriptionId: "sub_1",
    });
  }

  it.each([
    ["subscription.cancelled", "cancelled"],
    ["subscription.expired", "expired"],
    ["subscription.on_hold", "on_hold"],
    ["subscription.failed", "failed"],
  ] satisfies Array<[DodoPayments.WebhookEventType, string]>)(
    "%s moves the user to free",
    async (type, status) => {
      const user = await subscriber();
      const body = eventBody(type, { status });

      expect(await handleWebhook(body, signed(body))).toEqual({ status: 200, message: "applied" });
      expect(await reload(user.id)).toMatchObject({ plan: "free", planStatus: status, planRenewsAt: null });
    },
  );

  it("keeps Pro until the period ends when a cancellation is only scheduled", async () => {
    const user = await subscriber();
    const body = eventBody("subscription.updated", { cancel_at_next_billing_date: true });

    expect(await handleWebhook(body, signed(body))).toEqual({ status: 200, message: "applied" });
    expect(await reload(user.id)).toMatchObject({ plan: "pro", planRenewsAt: null });
  });

  it("restores Pro when a renewal goes through", async () => {
    const user = await createUser({ planStatus: "on_hold", billingSubscriptionId: "sub_1" });
    const body = eventBody("subscription.renewed");

    expect(await handleWebhook(body, signed(body))).toEqual({ status: 200, message: "applied" });
    expect((await reload(user.id))?.plan).toBe("pro");
  });

  it("ignores events it doesn't handle", async () => {
    const db = await getDb();
    await subscriber();
    const body = JSON.stringify({ type: "payment.succeeded", data: { payment_id: "pay_1" } });

    expect(await handleWebhook(body, signed(body))).toEqual({ status: 200, message: "ignored" });
    expect(await db.select().from(billingEvents)).toHaveLength(0);
  });

  it("ignores statuses it doesn't know", async () => {
    const user = await subscriber();
    const body = eventBody("subscription.updated", { status: "brand_new_status" });

    expect(await handleWebhook(body, signed(body))).toEqual({ status: 200, message: "ignored" });
    expect((await reload(user.id))?.plan).toBe("pro");
  });

  it("ignores subscriptions to other products", async () => {
    const user = await createUser();
    const body = eventBody("subscription.active", {
      product_id: "pdt_something_else",
      metadata: { user_id: user.id },
    });

    expect(await handleWebhook(body, signed(body))).toEqual({ status: 200, message: "ignored" });
    expect((await reload(user.id))?.plan).toBe("free");
  });

  it("gives Pro for the yearly and weekly products once they're set", async () => {
    vi.stubEnv("DODO_PAYMENTS_PRODUCT_ID_YEARLY", "pdt_otto_pro_yearly");
    vi.stubEnv("DODO_PAYMENTS_PRODUCT_ID_WEEKLY", "pdt_otto_pro_weekly");
    resetEnvForTests();
    for (const [productId, interval] of [
      ["pdt_otto_pro_yearly", "year"],
      ["pdt_otto_pro_weekly", "week"],
    ] as const) {
      const user = await createUser({ id: crypto.randomUUID(), email: `${productId}@example.com` });
      const body = eventBody("subscription.active", {
        subscription_id: next("sub"),
        customer: { customer_id: next("cus"), email: user.email, name: "Ada" },
        product_id: productId,
        metadata: { user_id: user.id },
      });
      expect(await handleWebhook(body, signed(body))).toEqual({ status: 200, message: "applied" });
      expect(await reload(user.id)).toMatchObject({ plan: "pro", planInterval: interval });
    }
  });

  it("answers 500 for a signed subscription event it can't read, so Dodo keeps it", async () => {
    const body = JSON.stringify({ type: "subscription.active", data: { status: "active" } });
    expect(await handleWebhook(body, signed(body))).toEqual({ status: 500, message: "malformed" });
  });
});

describe("after the account was deleted", () => {
  it("answers 200 to the cancellation, so Dodo doesn't retry it, and only logs it as info", async () => {
    const db = await getDb();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const user = await createUser({ plan: "pro", planStatus: "active", billingSubscriptionId: "sub_1" });
    await db.delete(users).where(eq(users.id, user.id));
    const body = eventBody("subscription.cancelled", { status: "cancelled", metadata: { user_id: user.id } });
    const headers = signed(body);

    expect(await handleWebhook(body, headers)).toEqual({ status: 200, message: "ignored" });
    expect(await handleWebhook(body, headers)).toEqual({ status: 200, message: "ignored" });
    expect(await db.select().from(users)).toHaveLength(0);
    expect(JSON.stringify(info.mock.calls)).toContain("no_user");
    expect(warn).not.toHaveBeenCalled();
  });

  it("still warns when a paying subscription has no account", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const body = eventBody("subscription.renewed", { metadata: { user_id: "user_deleted" } });

    expect(await handleWebhook(body, signed(body))).toEqual({ status: 200, message: "ignored" });
    expect(JSON.stringify(warn.mock.calls)).toContain("no_user");
  });
});

describe("logs", () => {
  it("never include the customer's email", async () => {
    const sinks = (["info", "warn", "error"] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => undefined),
    );
    const user = await createUser();
    const matched = eventBody("subscription.active", { metadata: { user_id: user.id } });
    const unmatched = eventBody("subscription.active", {
      subscription_id: "sub_9",
      customer: { customer_id: "cus_9", email: "grace@example.com", name: "Grace" },
    });

    await handleWebhook(matched, signed(matched));
    await handleWebhook(unmatched, signed(unmatched));
    await handleWebhook(matched, signed(matched, { secret: OTHER_SECRET }));

    const output = JSON.stringify(sinks.flatMap((sink) => sink.mock.calls));
    expect(output).toContain("billing.plan_updated");
    expect(output).not.toContain("ada@example.com");
    expect(output).not.toContain("grace@example.com");
  });
});
