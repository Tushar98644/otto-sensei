import { AuthRetryableFetchError } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as webhook } from "@/app/api/billing/webhook/route";
import { getDb } from "@/db/client";
import { resumes, usage, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import type { SessionUser } from "@/lib/auth/types";
import {
  AUTH_COOKIE,
  cookieJar,
  createUser,
  fakeAuth,
  resetDb,
  signInAs as signInFake,
} from "@/lib/auth/test-helpers";
import { dodoId, installFakeDodo, type FakeDodo } from "@/lib/billing/dodo-testing";
import {
  BILLING_TEST_SIGNING_SECRET,
  DODO_TEST_PRODUCTS,
  DODO_WEBHOOK_TEST_SECRET,
  standardWebhookHeaders,
  subscriptionEvent,
} from "@/lib/billing/dodo-webhook-testing";
import { resetEnvForTests } from "@/lib/env";
import type { Resume } from "@/lib/resume/schema";
import { consumeUsage } from "@/lib/usage";
import { toSessionUser } from "@/lib/users";
import { DELETE } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

let dodo: FakeDodo;

const NOW = Date.UTC(2026, 10, 6, 12);
const CANCEL_FAILED =
  "We couldn't cancel your subscription, so your account wasn't deleted. Try again, or email us.";
const SUB_1 = dodoId("sub", 1);
const SUB_2 = dodoId("sub", 2);
const CUS_1 = dodoId("cus", 1);
const PRODUCT = DODO_TEST_PRODUCTS.proMonth;
const CANCEL_NOW = { status: "cancelled", cancel_reason: "cancelled_by_merchant" };
// Paddle-sandbox ids still stored before the reset: never sent to Dodo.
const PADDLE_IDS = [`ctm_${"a1".repeat(13)}`, `sub_${"b2".repeat(13)}`] as const;

function useBilling(mode: "dodo" | "mock") {
  for (const [name, value] of Object.entries({
    DODO_API_KEY: mode === "dodo" ? "dodo_test_apikey_for_account_tests" : undefined,
    DODO_ENVIRONMENT: undefined,
    DODO_WEBHOOK_SECRET: DODO_WEBHOOK_TEST_SECRET,
    BILLING_SIGNING_SECRET: BILLING_TEST_SIGNING_SECRET,
    DODO_PRO_MONTHLY_PRODUCT_ID: PRODUCT,
    DODO_PRO_YEARLY_PRODUCT_ID: undefined,
    DODO_MAX_MONTHLY_PRODUCT_ID: undefined,
    DODO_MAX_YEARLY_PRODUCT_ID: undefined,
    DODO_PRO_TRIAL_PRODUCT_ID: undefined,
  })) {
    vi.stubEnv(name, value);
  }
  resetEnvForTests();
}

async function signInAs(
  email: string,
  billing: Partial<typeof users.$inferInsert> = {},
): Promise<SessionUser> {
  const created = await signInFake(email);
  const db = await getDb();
  const [row] = await db
    .update(users)
    .set({ ...billing, updatedAt: NOW })
    .where(eq(users.id, created.id))
    .returning();
  return row ? toSessionUser(row) : created;
}

const DATA = { id: "r1" } as unknown as Resume;

const PRO = {
  plan: "pro",
  planStatus: "active",
  billingCustomerId: CUS_1,
  billingSubscriptionId: SUB_1,
} satisfies Partial<typeof users.$inferInsert>;

const cancels = () =>
  dodo.calls
    .filter(
      (call) =>
        call.method === "PATCH" &&
        (call.body as { status?: string } | undefined)?.status === "cancelled",
    )
    .map((call) => call.path.split("/")[2]);

const liveSubscription = (id: string, status: "active" | "on_hold" | "pending" = "active") =>
  dodo.subscriptions.push({ id, customer: CUS_1, product: PRODUCT, status });

function deliverWebhook(type: string, subscriptionId: string, userId: string) {
  const payload = subscriptionEvent(type, {
    subscription_id: subscriptionId,
    product_id: PRODUCT,
    customer: { customer_id: CUS_1, email: "ada@example.com" },
    metadata: { user_id: userId },
  });
  const headers = standardWebhookHeaders(payload, DODO_WEBHOOK_TEST_SECRET);
  headers.set("content-type", "application/json");
  return webhook(
    new Request("https://otto.example/api/billing/webhook", {
      method: "POST",
      headers,
      body: payload,
    }),
  );
}

async function userExists(id: string): Promise<boolean> {
  const db = await getDb();
  return (await db.select().from(users).where(eq(users.id, id))).length > 0;
}

beforeEach(async () => {
  useBilling("mock");
  dodo = installFakeDodo();
  await resetDb();
  cookieJar.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("DELETE /api/account", () => {
  it("needs a signed-in user", async () => {
    const res = await DELETE();
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ ok: false, error: { code: "unauthorized" } });
  });

  it("deletes the account and its data, keeps other accounts, and signs out", async () => {
    const grace = await createUser("grace@example.com");
    const ada = await signInAs("ada@example.com");
    const db = await getDb();
    for (const user of [ada, grace]) {
      await db
        .insert(resumes)
        .values({ userId: user.id, id: "r1", data: DATA, createdAt: NOW, updatedAt: NOW });
      await consumeUsage({ ...user, plan: "pro" }, "fix");
    }

    const res = await DELETE();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    expect(await db.select().from(users).where(eq(users.id, ada.id))).toHaveLength(0);
    expect(await db.select().from(resumes).where(eq(resumes.userId, ada.id))).toHaveLength(0);
    expect(await db.select().from(usage).where(eq(usage.subject, ada.id))).toHaveLength(0);
    expect(await db.select().from(resumes).where(eq(resumes.userId, grace.id))).toHaveLength(1);
    expect(await db.select().from(usage).where(eq(usage.subject, grace.id))).toHaveLength(1);

    expect(cookieJar.get(AUTH_COOKIE)).toMatchObject({ value: "", maxAge: 0 });
    await expect(getCurrentUser()).resolves.toBeNull();
    expect(fakeAuth.hasAuthUser(ada.id)).toBe(false);
    expect(fakeAuth.activeSessions(ada.id)).toBe(0);
    expect(fakeAuth.hasAuthUser(grace.id)).toBe(true);
  });

  it("deletes nothing when the Supabase secret key is missing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const ada = await signInAs("ada@example.com");
    fakeAuth.setConfigured(true, { admin: false });
    const res = await DELETE();
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ ok: false, error: { code: "auth_unavailable" } });
    expect(await userExists(ada.id)).toBe(true);
  });

  it("can be retried when Supabase fails to delete the sign-in after the data is gone", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const ada = await signInAs("ada@example.com");
    fakeAuth.failNext("deleteUser", new AuthRetryableFetchError("fetch failed", 0));

    const failed = await DELETE();
    expect(failed.status).toBe(500);
    expect(await failed.json()).toMatchObject({ error: { code: "server_error" } });
    expect(await userExists(ada.id)).toBe(false);
    expect(fakeAuth.hasAuthUser(ada.id)).toBe(true);
    await expect(getCurrentUser()).resolves.toMatchObject({ id: ada.id, plan: "free" });

    expect((await DELETE()).status).toBe(200);
    expect(fakeAuth.hasAuthUser(ada.id)).toBe(false);
    expect(await userExists(ada.id)).toBe(false);
  });
});

describe("DELETE /api/account with a subscription", () => {
  it("cancels the Dodo subscription right away first, then deletes the account", async () => {
    useBilling("dodo");
    const user = await signInAs("ada@example.com", PRO);
    liveSubscription(SUB_1);

    const res = await DELETE();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(dodo.callsTo(`PATCH /subscriptions/${SUB_1}`).map((call) => call.body)).toEqual([
      CANCEL_NOW,
    ]);
    expect(dodo.subscriptions[0]?.status).toBe("cancelled");
    expect(await userExists(user.id)).toBe(false);
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("looks for other subscriptions under the same email, matched exactly", async () => {
    useBilling("dodo");
    const user = await signInAs("ada@example.com", PRO);
    liveSubscription(SUB_1);

    expect((await DELETE()).status).toBe(200);
    const lookups = dodo.callsTo("GET /customers");
    expect(lookups).toHaveLength(1);
    expect(lookups[0]?.query.get("email")).toBe("ada@example.com");
    expect(await userExists(user.id)).toBe(false);
  });

  it("keeps the account and the session when the cancel fails", async () => {
    useBilling("dodo");
    const sinks = (["info", "warn", "error"] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => undefined),
    );
    const user = await signInAs("ada@example.com", PRO);
    liveSubscription(SUB_1);
    const db = await getDb();
    const resume = { userId: user.id, id: "r1", data: DATA, createdAt: NOW, updatedAt: NOW };
    await db.insert(resumes).values(resume);
    dodo.failNext(`PATCH /subscriptions/${SUB_1}`, 503);

    const res = await DELETE();
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({
      ok: false,
      error: { code: "billing_unavailable", message: CANCEL_FAILED },
    });
    expect(await db.select().from(users).where(eq(users.id, user.id))).toMatchObject([
      { plan: "pro", planStatus: "active", billingSubscriptionId: SUB_1 },
    ]);
    expect(await db.select().from(resumes).where(eq(resumes.userId, user.id))).toHaveLength(1);
    await expect(getCurrentUser()).resolves.toMatchObject({ id: user.id });

    const output = JSON.stringify(sinks.flatMap((sink) => sink.mock.calls));
    expect(output).toContain("account.delete_blocked");
    expect(output).not.toContain("ada@example.com");
  });

  it("deletes the account on a retry once the cancel goes through", async () => {
    useBilling("dodo");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = await signInAs("ada@example.com", PRO);
    liveSubscription(SUB_1);
    dodo.failNext(`PATCH /subscriptions/${SUB_1}`, 503);

    expect((await DELETE()).status).toBe(502);
    expect((await DELETE()).status).toBe(200);
    expect(cancels()).toEqual([SUB_1, SUB_1]);
    expect(await userExists(user.id)).toBe(false);
  });

  it("deletes the account when Dodo refuses the cancel because the subscription already ended", async () => {
    useBilling("dodo");
    const user = await signInAs("ada@example.com", PRO);
    liveSubscription(SUB_1);
    dodo.subscriptions[0]!.status = "cancelled";

    expect((await DELETE()).status).toBe(200);
    expect(dodo.callsTo(`PATCH /subscriptions/${SUB_1}`)).toHaveLength(1);
    expect(dodo.callsTo(`GET /subscriptions/${SUB_1}`)).toHaveLength(1);
    expect(await userExists(user.id)).toBe(false);
  });

  it("keeps the account when Dodo refuses to cancel a subscription that is still live", async () => {
    useBilling("dodo");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = await signInAs("ada@example.com", PRO);
    liveSubscription(SUB_1);
    dodo.failNext(`PATCH /subscriptions/${SUB_1}`, 409, 1, "PLAN_CHANGE_PAYMENT_IN_PROGRESS");

    const res = await DELETE();
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({
      ok: false,
      error: { code: "billing_unavailable", message: CANCEL_FAILED },
    });
    expect(dodo.callsTo(`GET /subscriptions/${SUB_1}`)).toHaveLength(1);
    expect(dodo.subscriptions[0]?.status).toBe("active");
    expect(await userExists(user.id)).toBe(true);
  });

  it("answers 503 and keeps everything in production when there's no Dodo key to cancel with", async () => {
    useBilling("dodo");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DODO_API_KEY", undefined);
    resetEnvForTests();
    const sinks = (["info", "warn", "error"] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => undefined),
    );
    const user = await signInAs("ada@example.com", PRO);
    const db = await getDb();
    await db
      .insert(resumes)
      .values({ userId: user.id, id: "r1", data: DATA, createdAt: NOW, updatedAt: NOW });

    const res = await DELETE();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({
      ok: false,
      error: {
        code: "billing_unavailable",
        message:
          "We can't cancel your subscription right now, so your account wasn't deleted. Email us and we'll do it.",
      },
    });
    expect(await db.select().from(users).where(eq(users.id, user.id))).toMatchObject([
      { plan: "pro", planStatus: "active", billingSubscriptionId: SUB_1 },
    ]);
    expect(await db.select().from(resumes).where(eq(resumes.userId, user.id))).toHaveLength(1);
    expect(fakeAuth.hasAuthUser(user.id)).toBe(true);
    await expect(getCurrentUser()).resolves.toMatchObject({ id: user.id });
    expect(dodo.calls).toEqual([]);

    const output = JSON.stringify(sinks.flatMap((sink) => sink.mock.calls));
    expect(output).toContain("billing_not_configured");
    expect(output).not.toContain("ada@example.com");
  });

  it("deletes in production without a Dodo key when nothing at Dodo can charge", async () => {
    useBilling("dodo");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DODO_API_KEY", undefined);
    resetEnvForTests();
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const user = await signInAs("ada@example.com", {
      ...PRO,
      planStatus: "canceled",
      plan: "free",
    });

    expect((await DELETE()).status).toBe(200);
    expect(await userExists(user.id)).toBe(false);
    expect(dodo.calls).toEqual([]);
  });

  it("deletes an account holding Paddle-sandbox ids without sending them to Dodo", async () => {
    useBilling("dodo");
    const user = await signInAs("ada@example.com", {
      ...PRO,
      billingCustomerId: PADDLE_IDS[0],
      billingSubscriptionId: PADDLE_IDS[1],
    });

    expect((await DELETE()).status).toBe(200);
    expect(await userExists(user.id)).toBe(false);
    expect(dodo.calls.map((call) => `${call.method} ${call.path}`)).toEqual(["GET /customers"]);
    const sent = JSON.stringify(
      dodo.calls.map((call) => [call.path, call.query.toString(), call.body]),
    );
    for (const id of PADDLE_IDS) expect(sent).not.toContain(id);
  });

  it("cancels a Dodo subscription found by email for an account still holding Paddle ids", async () => {
    useBilling("dodo");
    const user = await signInAs("ada@example.com", {
      ...PRO,
      billingCustomerId: PADDLE_IDS[0],
      billingSubscriptionId: PADDLE_IDS[1],
    });
    dodo.customers.push(
      { id: CUS_1, email: "ada@example.com" },
      { id: dodoId("cus", 2), email: "notada@example.com" },
    );
    liveSubscription(SUB_1);
    dodo.subscriptions.push({
      id: SUB_2,
      customer: dodoId("cus", 2),
      product: PRODUCT,
      status: "active",
    });

    expect((await DELETE()).status).toBe(200);
    expect(cancels()).toEqual([SUB_1]);
    expect(dodo.subscriptions.find((found) => found.id === SUB_2)?.status).toBe("active");
    expect(await userExists(user.id)).toBe(false);
  });

  it("keeps the account when Dodo can't find the subscription: it may be in the other mode", async () => {
    useBilling("dodo");
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = await signInAs("ada@example.com", PRO);

    expect((await DELETE()).status).toBe(502);
    expect(await userExists(user.id)).toBe(true);
    expect(dodo.callsTo(`PATCH /subscriptions/${SUB_1}`)).toHaveLength(1);
    expect(JSON.stringify(errors.mock.calls)).toContain("billing.cancel_not_found");
  });

  it("downgrades and deletes in mock mode, a trial included", async () => {
    const user = await signInAs("ada@example.com", {
      plan: "pro",
      planStatus: "mock_trialing",
      trialEndsAt: NOW + 86_400_000,
    });

    expect((await DELETE()).status).toBe(200);
    expect(await userExists(user.id)).toBe(false);
    expect(dodo.calls).toEqual([]);
  });

  it("only asks Dodo about the email for a free user with nothing stored", async () => {
    useBilling("dodo");
    const user = await signInAs("ada@example.com");

    expect((await DELETE()).status).toBe(200);
    expect(await userExists(user.id)).toBe(false);
    expect(dodo.calls.map((call) => `${call.method} ${call.path}`)).toEqual(["GET /customers"]);
  });

  it("cancels a checkout paid before its webhook came, though nothing is stored, and a late event for it refunds nothing", async () => {
    useBilling("dodo");
    vi.stubEnv("NODE_ENV", "production");
    resetEnvForTests();
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const user = await signInAs("ada@example.com");
    dodo.customers.push({ id: CUS_1, email: "ada@example.com" });
    liveSubscription(SUB_1);
    dodo.payments.push({ id: dodoId("pay", 1), subscription: SUB_1, status: "succeeded" });

    expect((await DELETE()).status).toBe(200);
    expect(cancels()).toEqual([SUB_1]);
    expect(await userExists(user.id)).toBe(false);

    const res = await deliverWebhook("subscription.active", SUB_1, user.id);
    expect(res.status).toBe(200);
    expect(dodo.callsTo("PATCH /subscriptions")).toHaveLength(1);
    expect(dodo.refunds).toEqual([]);
  });

  it("cancels and refunds a subscription paid for after the account was deleted, once its webhook comes", async () => {
    useBilling("dodo");
    vi.stubEnv("NODE_ENV", "production");
    resetEnvForTests();
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = await signInAs("ada@example.com");
    expect((await DELETE()).status).toBe(200);

    // An old checkout tab, still payable, is paid after the deletion.
    dodo.customers.push({ id: CUS_1, email: "ada@example.com" });
    liveSubscription(SUB_2);
    dodo.payments.push({ id: dodoId("pay", 2), subscription: SUB_2, status: "succeeded" });
    expect((await deliverWebhook("subscription.active", SUB_2, user.id)).status).toBe(200);
    expect((await deliverWebhook("subscription.updated", SUB_2, user.id)).status).toBe(200);

    expect(cancels()).toEqual([SUB_2]);
    expect(dodo.refunds.map((refund) => refund.payment)).toEqual([dodoId("pay", 2)]);
    expect(JSON.stringify(errors.mock.calls)).toContain("billing.orphan_subscription_cancelled");
    expect(await userExists(user.id)).toBe(false);
  });

  it("also cancels a subscription the stored ids no longer point to", async () => {
    useBilling("dodo");
    const user = await signInAs("ada@example.com", { ...PRO, billingSubscriptionId: SUB_2 });
    liveSubscription(SUB_1);
    liveSubscription(SUB_2);

    expect((await DELETE()).status).toBe(200);
    expect(cancels().sort()).toEqual([SUB_1, SUB_2].sort());
    expect(await userExists(user.id)).toBe(false);
  });

  it("cancels an on-hold subscription and one still pending, so neither can charge later", async () => {
    useBilling("dodo");
    const user = await signInAs("ada@example.com", { ...PRO, plan: "free", planStatus: "on_hold" });
    liveSubscription(SUB_1, "on_hold");
    liveSubscription(SUB_2, "pending");

    expect((await DELETE()).status).toBe(200);
    expect(cancels().sort()).toEqual([SUB_1, SUB_2].sort());
    expect(dodo.subscriptions.map((found) => found.status)).toEqual(["cancelled", "cancelled"]);
    expect(await userExists(user.id)).toBe(false);
  });

  it("answers Dodo's later cancellation webhook with 200, so it isn't retried", async () => {
    useBilling("dodo");
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const user = await signInAs("ada@example.com", PRO);
    liveSubscription(SUB_1);
    expect((await DELETE()).status).toBe(200);

    const res = await deliverWebhook("subscription.cancelled", SUB_1, user.id);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, message: "ignored" });
    expect(await userExists(user.id)).toBe(false);
  });
});
