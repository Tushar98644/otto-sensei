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
import { signBillingId } from "@/lib/billing/paddle-sign";
import {
  installFakePaddle,
  paddleId,
  paddleSignature,
  subscriptionEvent,
  type FakePaddle,
} from "@/lib/billing/testing";
import { resetEnvForTests } from "@/lib/env";
import type { Resume } from "@/lib/resume/schema";
import { consumeUsage } from "@/lib/usage";
import { toSessionUser } from "@/lib/users";
import { DELETE } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

let paddle: FakePaddle;

const NOW = Date.UTC(2026, 10, 6, 12);
const WEBHOOK_SECRET = "pdl_ntfset_otto_account_test_secret";
const CANCEL_FAILED =
  "We couldn't cancel your subscription, so your account wasn't deleted. Try again, or email us.";
const SUB_1 = paddleId("sub", 1);
const SUB_2 = paddleId("sub", 2);
const CTM_1 = paddleId("ctm", 1);
const PRICE = paddleId("pri", "ottopro");

function useBilling(mode: "paddle" | "mock") {
  vi.stubEnv("PADDLE_API_KEY", mode === "paddle" ? "pdl_sdbx_apikey_test" : undefined);
  vi.stubEnv("PADDLE_PRO_MONTHLY_PRICE_ID", PRICE);
  vi.stubEnv("PADDLE_WEBHOOK_SECRET", WEBHOOK_SECRET);
  vi.stubEnv("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN", "test_otto_client_token");
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
  billingCustomerId: CTM_1,
  billingSubscriptionId: SUB_1,
} satisfies Partial<typeof users.$inferInsert>;

const cancels = () =>
  paddle.calls
    .filter((call) => call.method === "POST" && call.path.endsWith("/cancel"))
    .map((call) => call.path.split("/")[2]);

async function userExists(id: string): Promise<boolean> {
  const db = await getDb();
  return (await db.select().from(users).where(eq(users.id, id))).length > 0;
}

beforeEach(async () => {
  useBilling("mock");
  paddle = installFakePaddle();
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
      await db.insert(resumes).values({ userId: user.id, id: "r1", data: DATA, createdAt: NOW, updatedAt: NOW });
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
  it("cancels the Paddle subscription right away first, then deletes the account", async () => {
    useBilling("paddle");
    const user = await signInAs("ada@example.com", PRO);
    paddle.subscriptions.push({ id: SUB_1, customer: CTM_1, price: PRICE, status: "active" });

    const res = await DELETE();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(paddle.callsTo(`POST /subscriptions/${SUB_1}/cancel`)[0]?.body).toEqual({ effective_from: "immediately" });
    expect(await userExists(user.id)).toBe(false);
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("keeps the account and the session when the cancel fails", async () => {
    useBilling("paddle");
    const sinks = (["info", "warn", "error"] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => undefined),
    );
    const user = await signInAs("ada@example.com", PRO);
    paddle.subscriptions.push({ id: SUB_1, customer: CTM_1, price: PRICE, status: "active" });
    const db = await getDb();
    const resume = { userId: user.id, id: "r1", data: DATA, createdAt: NOW, updatedAt: NOW };
    await db.insert(resumes).values(resume);
    paddle.failNext(`POST /subscriptions/${SUB_1}/cancel`, 503);

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
    useBilling("paddle");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = await signInAs("ada@example.com", PRO);
    paddle.subscriptions.push({ id: SUB_1, customer: CTM_1, price: PRICE, status: "active" });
    paddle.failNext(`POST /subscriptions/${SUB_1}/cancel`, 503);

    expect((await DELETE()).status).toBe(502);
    expect((await DELETE()).status).toBe(200);
    expect(await userExists(user.id)).toBe(false);
  });

  it("deletes the account when Paddle refuses the cancel because the subscription already ended", async () => {
    useBilling("paddle");
    const user = await signInAs("ada@example.com", PRO);
    paddle.subscriptions.push({ id: SUB_1, customer: CTM_1, price: PRICE, status: "canceled" });

    expect((await DELETE()).status).toBe(200);
    expect(paddle.callsTo(`GET /subscriptions/${SUB_1}`)).toHaveLength(1);
    expect(await userExists(user.id)).toBe(false);
  });

  it("keeps the account when Paddle refuses to cancel a subscription that is still live", async () => {
    useBilling("paddle");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = await signInAs("ada@example.com", PRO);
    paddle.subscriptions.push({ id: SUB_1, customer: CTM_1, price: PRICE, status: "active" });
    paddle.failNext(`POST /subscriptions/${SUB_1}/cancel`, 400, 1, "subscription_locked_renewal");

    expect((await DELETE()).status).toBe(502);
    expect(await userExists(user.id)).toBe(true);
  });

  it("answers 503 and keeps everything in production when there's no Paddle key to cancel with", async () => {
    useBilling("paddle");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PADDLE_API_KEY", undefined);
    resetEnvForTests();
    const sinks = (["info", "warn", "error"] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => undefined),
    );
    const user = await signInAs("ada@example.com", PRO);
    const db = await getDb();
    await db.insert(resumes).values({ userId: user.id, id: "r1", data: DATA, createdAt: NOW, updatedAt: NOW });

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
    expect(paddle.calls).toEqual([]);

    const output = JSON.stringify(sinks.flatMap((sink) => sink.mock.calls));
    expect(output).toContain("billing_not_configured");
    expect(output).not.toContain("ada@example.com");
  });

  it("deletes in production without a Paddle key when nothing at Paddle can charge", async () => {
    useBilling("paddle");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PADDLE_API_KEY", undefined);
    resetEnvForTests();
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const user = await signInAs("ada@example.com", { ...PRO, planStatus: "canceled", plan: "free" });

    expect((await DELETE()).status).toBe(200);
    expect(await userExists(user.id)).toBe(false);
    expect(paddle.calls).toEqual([]);
  });

  it("deletes an account holding ids left over from Creem without sending them to Paddle", async () => {
    useBilling("paddle");
    const creem = ["cust_3kKw0VQ8bY1lN3m9", "sub_7Hq2LmPz9XcV4bN1"];
    const user = await signInAs("ada@example.com", {
      ...PRO,
      billingCustomerId: creem[0],
      billingSubscriptionId: creem[1],
    });

    expect((await DELETE()).status).toBe(200);
    expect(await userExists(user.id)).toBe(false);
    expect(paddle.calls.map((call) => `${call.method} ${call.path}`)).toEqual(["GET /customers"]);
    const sent = JSON.stringify(paddle.calls.map((call) => [call.path, call.query.toString(), call.body]));
    for (const id of creem) expect(sent).not.toContain(id);
  });

  it("cancels a Paddle subscription found by email for an account still holding Creem ids", async () => {
    useBilling("paddle");
    const user = await signInAs("ada@example.com", {
      ...PRO,
      billingCustomerId: "cust_3kKw0VQ8bY1lN3m9",
      billingSubscriptionId: "sub_7Hq2LmPz9XcV4bN1",
    });
    paddle.customers.push({ id: CTM_1, email: "ada@example.com" });
    paddle.subscriptions.push({ id: SUB_1, customer: CTM_1, price: PRICE, status: "active" });

    expect((await DELETE()).status).toBe(200);
    expect(cancels()).toEqual([SUB_1]);
    expect(await userExists(user.id)).toBe(false);
  });

  it("keeps the account when Paddle can't find the subscription: it may be on the other environment", async () => {
    useBilling("paddle");
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = await signInAs("ada@example.com", PRO);

    expect((await DELETE()).status).toBe(502);
    expect(await userExists(user.id)).toBe(true);
    expect(paddle.callsTo(`POST /subscriptions/${SUB_1}/cancel`)).toHaveLength(1);
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
    expect(paddle.calls).toEqual([]);
  });

  it("never calls Paddle for a free user", async () => {
    useBilling("paddle");
    const user = await signInAs("ada@example.com");

    expect((await DELETE()).status).toBe(200);
    expect(await userExists(user.id)).toBe(false);
    expect(paddle.calls).toEqual([]);
  });

  it("also cancels a subscription the stored ids no longer point to", async () => {
    useBilling("paddle");
    const user = await signInAs("ada@example.com", { ...PRO, billingSubscriptionId: SUB_2 });
    paddle.subscriptions.push(
      { id: SUB_1, customer: CTM_1, price: PRICE, status: "active" },
      { id: SUB_2, customer: CTM_1, price: PRICE, status: "active" },
    );

    expect((await DELETE()).status).toBe(200);
    expect(cancels().sort()).toEqual([SUB_1, SUB_2]);
    expect(await userExists(user.id)).toBe(false);
  });

  it("answers Paddle's later cancellation webhook with 200, so it isn't retried", async () => {
    useBilling("paddle");
    const user = await signInAs("ada@example.com", PRO);
    paddle.subscriptions.push({ id: SUB_1, customer: CTM_1, price: PRICE, status: "active" });
    expect((await DELETE()).status).toBe(200);

    const payload = subscriptionEvent("subscription.canceled", {
      id: SUB_1,
      customer: CTM_1,
      status: "canceled",
      price: PRICE,
      customData: { user_id: user.id, user_sig: signBillingId(user.id, WEBHOOK_SECRET) },
    });
    const res = await webhook(
      new Request("https://otto.example/api/billing/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "paddle-signature": paddleSignature(payload, WEBHOOK_SECRET),
        },
        body: payload,
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, message: "ignored" });
    expect(await userExists(user.id)).toBe(false);
  });
});
