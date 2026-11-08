import { AuthRetryableFetchError } from "@supabase/supabase-js";
import { APIConnectionTimeoutError, type DodoPayments } from "dodopayments";
import { eq } from "drizzle-orm";
import { Webhook } from "standardwebhooks";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as webhook } from "@/app/api/billing/webhook/route";
import { getDb } from "@/db/client";
import { resumes, usage, users, type UserRow } from "@/db/schema";
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
import { resetEnvForTests } from "@/lib/env";
import type { Resume } from "@/lib/resume/schema";
import { consumeUsage } from "@/lib/usage";
import { toSessionUser } from "@/lib/users";
import { DELETE } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

// The real Dodo API is never called: the client is swapped for one whose methods are spies.
type SubscriptionStub = Pick<DodoPayments.Subscription, "status">;

const sdk = vi.hoisted(() => ({
  subscriptionUpdate:
    vi.fn<(id: string, params: DodoPayments.SubscriptionUpdateParams) => Promise<SubscriptionStub>>(),
  subscriptionRetrieve: vi.fn<(id: string) => Promise<SubscriptionStub>>(),
  // Lookups of other live subscriptions find none unless a test says otherwise.
  customersList: vi.fn(async () => ({ items: [] as Pick<DodoPayments.Customer, "customer_id" | "email">[] })),
  subscriptionsList: vi.fn(async () => ({
    items: [] as (Pick<DodoPayments.SubscriptionListResponse, "subscription_id" | "status" | "product_id"> & {
      customer: { customer_id: string };
    })[],
  })),
}));

vi.mock("dodopayments", async (importOriginal) => {
  const actual = await importOriginal<typeof import("dodopayments")>();
  class FakeDodoPayments {
    customers = { list: sdk.customersList };
    subscriptions = {
      update: sdk.subscriptionUpdate,
      retrieve: sdk.subscriptionRetrieve,
      list: sdk.subscriptionsList,
    };
  }
  return { ...actual, DodoPayments: FakeDodoPayments };
});

const NOW = Date.UTC(2026, 10, 6, 12);
const WEBHOOK_KEY = `whsec_${Buffer.from("otto-account-test-signing-key").toString("base64")}`;
const CANCEL_FAILED =
  "We couldn't cancel your subscription, so your account wasn't deleted. Try again, or email us.";

function useBilling(mode: "dodo" | "mock") {
  vi.stubEnv("DODO_PAYMENTS_API_KEY", mode === "dodo" ? "sk_test_123" : undefined);
  vi.stubEnv("DODO_PAYMENTS_PRODUCT_ID", "pdt_otto_pro");
  vi.stubEnv("DODO_PAYMENTS_WEBHOOK_KEY", WEBHOOK_KEY);
  resetEnvForTests();
}

async function signInAs(email: string, billing: Partial<UserRow> = {}): Promise<SessionUser> {
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
  billingCustomerId: "cus_1",
  billingSubscriptionId: "sub_1",
} satisfies Partial<UserRow>;

async function userExists(id: string): Promise<boolean> {
  const db = await getDb();
  return (await db.select().from(users).where(eq(users.id, id))).length > 0;
}

beforeEach(async () => {
  useBilling("mock");
  sdk.subscriptionUpdate.mockReset();
  sdk.subscriptionRetrieve.mockReset();
  sdk.customersList.mockClear();
  sdk.subscriptionsList.mockClear();
  await resetDb();
  cookieJar.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
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
      await consumeUsage(user, "fix");
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
  it("cancels the Dodo subscription first, then deletes the account", async () => {
    useBilling("dodo");
    const user = await signInAs("ada@example.com", PRO);
    let existedDuringCancel = false;
    sdk.subscriptionUpdate.mockImplementation(async () => {
      existedDuringCancel = await userExists(user.id);
      return { status: "cancelled" };
    });

    const res = await DELETE();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(sdk.subscriptionUpdate).toHaveBeenCalledWith(
      "sub_1",
      expect.objectContaining({ status: "cancelled", cancel_reason: "cancelled_by_customer" }),
    );
    expect(existedDuringCancel).toBe(true);
    expect(await userExists(user.id)).toBe(false);
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("keeps the account and the session when the cancel fails", async () => {
    useBilling("dodo");
    const sinks = (["info", "warn", "error"] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => undefined),
    );
    const user = await signInAs("ada@example.com", PRO);
    const db = await getDb();
    const resume = { userId: user.id, id: "r1", data: DATA, createdAt: NOW, updatedAt: NOW };
    await db.insert(resumes).values(resume);
    sdk.subscriptionUpdate.mockRejectedValue(new APIConnectionTimeoutError());

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
    useBilling("dodo");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = await signInAs("ada@example.com", PRO);
    sdk.subscriptionUpdate.mockRejectedValueOnce(new APIConnectionTimeoutError());
    sdk.subscriptionUpdate.mockResolvedValueOnce({ status: "cancelled" });

    expect((await DELETE()).status).toBe(502);
    expect((await DELETE()).status).toBe(200);
    expect(await userExists(user.id)).toBe(false);
  });

  it("downgrades and deletes in mock mode", async () => {
    const user = await signInAs("ada@example.com", { plan: "pro", planStatus: "mock_active" });

    expect((await DELETE()).status).toBe(200);
    expect(await userExists(user.id)).toBe(false);
    expect(sdk.subscriptionUpdate).not.toHaveBeenCalled();
  });

  it("never calls Dodo for a free user", async () => {
    useBilling("dodo");
    const user = await signInAs("ada@example.com");

    expect((await DELETE()).status).toBe(200);
    expect(await userExists(user.id)).toBe(false);
    expect(sdk.subscriptionUpdate).not.toHaveBeenCalled();
    expect(sdk.customersList).not.toHaveBeenCalled();
    expect(sdk.subscriptionsList).not.toHaveBeenCalled();
  });

  // A second checkout's webhook replaces the stored id, so the first subscription is only found
  // by asking Dodo. Left alone, it would keep charging an account that no longer exists.
  it("also cancels a subscription the stored ids no longer point to", async () => {
    useBilling("dodo");
    const user = await signInAs("ada@example.com", { ...PRO, billingSubscriptionId: "sub_2" });
    sdk.subscriptionsList.mockResolvedValueOnce({
      items: [
        { subscription_id: "sub_1", status: "active", product_id: "pdt_otto_pro", customer: { customer_id: "cus_1" } },
        { subscription_id: "sub_2", status: "active", product_id: "pdt_otto_pro", customer: { customer_id: "cus_1" } },
      ],
    });
    sdk.subscriptionUpdate.mockResolvedValue({ status: "cancelled" });

    expect((await DELETE()).status).toBe(200);
    expect(sdk.subscriptionUpdate.mock.calls.map(([id]) => id).sort()).toEqual(["sub_1", "sub_2"]);
    expect(await userExists(user.id)).toBe(false);
  });

  it("answers Dodo's later cancellation webhook with 200, so it isn't retried", async () => {
    useBilling("dodo");
    const user = await signInAs("ada@example.com", PRO);
    sdk.subscriptionUpdate.mockResolvedValue({ status: "cancelled" });
    expect((await DELETE()).status).toBe(200);

    const payload = JSON.stringify({
      type: "subscription.cancelled",
      data: {
        subscription_id: "sub_1",
        product_id: "pdt_otto_pro",
        status: "cancelled",
        customer: { customer_id: "cus_1", email: "ada@example.com" },
        metadata: { user_id: user.id },
      },
    });
    const at = new Date();
    const res = await webhook(
      new Request("https://otto.example/api/billing/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "webhook-id": "msg_after_delete",
          "webhook-timestamp": String(Math.floor(at.getTime() / 1000)),
          "webhook-signature": new Webhook(WEBHOOK_KEY).sign("msg_after_delete", at, payload),
        },
        body: payload,
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, message: "ignored" });
    expect(await userExists(user.id)).toBe(false);
  });
});
