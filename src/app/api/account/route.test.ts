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
import { creemSignature, installFakeCreem, subscriptionEvent, type FakeCreem } from "@/lib/billing/testing";
import { resetEnvForTests } from "@/lib/env";
import type { Resume } from "@/lib/resume/schema";
import { consumeUsage } from "@/lib/usage";
import { toSessionUser } from "@/lib/users";
import { DELETE } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

// The real Creem API is never called: fetch is swapped for a fake of it (src/lib/billing/testing.ts).
let creem: FakeCreem;

const NOW = Date.UTC(2026, 10, 6, 12);
const WEBHOOK_SECRET = "whsec_otto_account_test_secret";
const CANCEL_FAILED =
  "We couldn't cancel your subscription, so your account wasn't deleted. Try again, or email us.";

function useBilling(mode: "creem" | "mock") {
  vi.stubEnv("CREEM_API_KEY", mode === "creem" ? "creem_test_123" : undefined);
  vi.stubEnv("CREEM_PRO_MONTHLY_PRODUCT_ID", "prod_otto_pro");
  vi.stubEnv("CREEM_WEBHOOK_SECRET", WEBHOOK_SECRET);
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

// Deletion doesn't read the document, only removes it.
const DATA = { id: "r1" } as unknown as Resume;

const PRO = {
  plan: "pro",
  planStatus: "active",
  billingCustomerId: "cust_1",
  billingSubscriptionId: "sub_1",
} satisfies Partial<typeof users.$inferInsert>;

const cancels = () =>
  creem.calls
    .filter((call) => call.method === "POST" && call.path.endsWith("/cancel"))
    .map((call) => call.path.split("/")[3]);

async function userExists(id: string): Promise<boolean> {
  const db = await getDb();
  return (await db.select().from(users).where(eq(users.id, id))).length > 0;
}

beforeEach(async () => {
  useBilling("mock");
  creem = installFakeCreem();
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
      // Free has no AI allowance, so the count is written as a paid plan would.
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
    // The Supabase Auth user goes too, with every session it had on other devices.
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
  it("cancels the Creem subscription right away first, then deletes the account", async () => {
    useBilling("creem");
    const user = await signInAs("ada@example.com", PRO);
    creem.subscriptions.push({ id: "sub_1", customer: "cust_1", product: "prod_otto_pro", status: "active" });

    const res = await DELETE();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(creem.callsTo("POST /v1/subscriptions/sub_1/cancel")[0]?.body).toEqual({ mode: "immediate" });
    expect(await userExists(user.id)).toBe(false);
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("keeps the account and the session when the cancel fails", async () => {
    useBilling("creem");
    const sinks = (["info", "warn", "error"] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => undefined),
    );
    const user = await signInAs("ada@example.com", PRO);
    creem.subscriptions.push({ id: "sub_1", customer: "cust_1", product: "prod_otto_pro", status: "active" });
    const db = await getDb();
    const resume = { userId: user.id, id: "r1", data: DATA, createdAt: NOW, updatedAt: NOW };
    await db.insert(resumes).values(resume);
    creem.failNext("POST /v1/subscriptions/sub_1/cancel", 503);

    const res = await DELETE();
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({
      ok: false,
      error: { code: "billing_unavailable", message: CANCEL_FAILED },
    });
    expect(await db.select().from(users).where(eq(users.id, user.id))).toMatchObject([
      { plan: "pro", planStatus: "active", billingSubscriptionId: "sub_1" },
    ]);
    expect(await db.select().from(resumes).where(eq(resumes.userId, user.id))).toHaveLength(1);
    await expect(getCurrentUser()).resolves.toMatchObject({ id: user.id });

    const output = JSON.stringify(sinks.flatMap((sink) => sink.mock.calls));
    expect(output).toContain("account.delete_blocked");
    expect(output).not.toContain("ada@example.com");
  });

  it("deletes the account on a retry once the cancel goes through", async () => {
    useBilling("creem");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = await signInAs("ada@example.com", PRO);
    creem.subscriptions.push({ id: "sub_1", customer: "cust_1", product: "prod_otto_pro", status: "active" });
    creem.failNext("POST /v1/subscriptions/sub_1/cancel", 503);

    expect((await DELETE()).status).toBe(502);
    expect((await DELETE()).status).toBe(200);
    expect(await userExists(user.id)).toBe(false);
  });

  it("downgrades and deletes in mock mode, a trial included", async () => {
    const user = await signInAs("ada@example.com", {
      plan: "pro",
      planStatus: "mock_trialing",
      trialEndsAt: NOW + 86_400_000,
    });

    expect((await DELETE()).status).toBe(200);
    expect(await userExists(user.id)).toBe(false);
    expect(creem.calls).toEqual([]);
  });

  it("never calls Creem for a free user", async () => {
    useBilling("creem");
    const user = await signInAs("ada@example.com");

    expect((await DELETE()).status).toBe(200);
    expect(await userExists(user.id)).toBe(false);
    expect(creem.calls).toEqual([]);
  });

  // A second checkout's webhook replaces the stored id, so the first subscription is only found
  // by asking Creem. Left alone, it would keep charging an account that no longer exists.
  it("also cancels a subscription the stored ids no longer point to", async () => {
    useBilling("creem");
    const user = await signInAs("ada@example.com", { ...PRO, billingSubscriptionId: "sub_2" });
    creem.subscriptions.push(
      { id: "sub_1", customer: "cust_1", product: "prod_otto_pro", status: "active" },
      { id: "sub_2", customer: "cust_1", product: "prod_otto_pro", status: "active" },
    );

    expect((await DELETE()).status).toBe(200);
    expect(cancels().sort()).toEqual(["sub_1", "sub_2"]);
    expect(await userExists(user.id)).toBe(false);
  });

  it("answers Creem's later cancellation webhook with 200, so it isn't retried", async () => {
    useBilling("creem");
    const user = await signInAs("ada@example.com", PRO);
    creem.subscriptions.push({ id: "sub_1", customer: "cust_1", product: "prod_otto_pro", status: "active" });
    expect((await DELETE()).status).toBe(200);

    const payload = subscriptionEvent("subscription.canceled", {
      id: "sub_1",
      status: "canceled",
      product: "prod_otto_pro",
      metadata: { user_id: user.id },
    });
    const res = await webhook(
      new Request("https://otto.example/api/billing/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "creem-signature": creemSignature(payload, WEBHOOK_SECRET),
        },
        body: payload,
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, message: "ignored" });
    expect(await userExists(user.id)).toBe(false);
  });
});
