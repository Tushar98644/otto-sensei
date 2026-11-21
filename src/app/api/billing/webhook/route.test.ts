import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { insertUserRow, resetDb } from "@/lib/auth/test-helpers";
import {
  BILLING_TEST_SIGNING_SECRET,
  DODO_TEST_PRODUCTS,
  DODO_WEBHOOK_TEST_SECRET,
  refundEvent,
  standardWebhookHeaders,
  subscriptionEvent,
  type Delivery,
} from "@/lib/billing/dodo-webhook-testing";
import { resetEnvForTests } from "@/lib/env";
import { POST as webhook } from "./route";

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: vi.fn() }));

const currentUser = vi.mocked(getCurrentUser);

const SECRET = DODO_WEBHOOK_TEST_SECRET;
const OTHER_SECRET = `whsec_${Buffer.from("not-the-configured-endpoint").toString("base64")}`;

function post(
  body: string,
  headers: Headers = standardWebhookHeaders(body, SECRET),
): Promise<Response> {
  headers.set("content-type", "application/json");
  return webhook(
    new Request("https://otto.example/api/billing/webhook", { method: "POST", headers, body }),
  );
}

const signedAs = (body: string, delivery: Delivery, secret = SECRET) =>
  standardWebhookHeaders(body, secret, delivery);

async function buyer() {
  const id = crypto.randomUUID();
  await insertUserRow({ id, email: `${id}@example.com`, plan: "free", createdAt: 1, updatedAt: 1 });
  // Pretty-printed on purpose: the signature covers these exact bytes, whitespace included.
  const body = JSON.stringify(
    JSON.parse(subscriptionEvent("subscription.active", { metadata: { user_id: id } })),
    null,
    2,
  );
  return { id, body };
}

async function planOf(id: string) {
  const [row] = await (await getDb()).select().from(users).where(eq(users.id, id));
  return row?.plan;
}

beforeEach(async () => {
  vi.stubEnv("DODO_API_KEY", undefined);
  vi.stubEnv("DODO_WEBHOOK_SECRET", SECRET);
  vi.stubEnv("BILLING_SIGNING_SECRET", BILLING_TEST_SIGNING_SECRET);
  vi.stubEnv("DODO_PRO_MONTHLY_PRODUCT_ID", DODO_TEST_PRODUCTS.proMonth);
  resetEnvForTests();
  currentUser.mockReset();
  await resetDb();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("POST /api/billing/webhook", () => {
  it("verifies the raw body and updates the plan, without a session", async () => {
    const { id, body } = await buyer();
    const res = await post(body);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, message: "applied" });
    expect(await planOf(id)).toBe("pro");
    expect(currentUser).not.toHaveBeenCalled();
  });

  it("answers a redelivery of the same webhook-id as a duplicate", async () => {
    const { body } = await buyer();
    const delivery = { id: "msg_otto_redelivered_0001" };
    expect(await (await post(body, signedAs(body, delivery))).json()).toEqual({
      ok: true,
      message: "applied",
    });
    const res = await post(body, signedAs(body, delivery));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, message: "duplicate" });
  });

  it("grants nothing for a user_id the server didn't sign", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const id = crypto.randomUUID();
    await insertUserRow({
      id,
      email: `${id}@example.com`,
      plan: "free",
      createdAt: 1,
      updatedAt: 1,
    });
    const body = subscriptionEvent("subscription.active", {
      metadata: { user_id: id, user_sig: undefined },
    });
    const res = await post(body);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, message: "ignored" });
    expect(await planOf(id)).toBe("free");
  });

  it("answers a refund notice with 200 and leaves the plan alone", async () => {
    const warnings = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { id, body } = await buyer();
    await post(body);
    const res = await post(refundEvent("refund.succeeded"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, message: "applied" });
    expect(await planOf(id)).toBe("pro");
    expect(JSON.stringify(warnings.mock.calls)).toContain("billing.adjustment");
  });

  it("answers an event it doesn't handle with 200, so Dodo doesn't retry it", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const body = JSON.stringify({
      business_id: "bus_TestBusiness00000001",
      type: "license_key.created",
      timestamp: new Date().toISOString(),
      data: { payload_type: "LicenseKey" },
    });
    const res = await post(body);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, message: "ignored" });
  });

  it("rejects a bad signature with 401", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { id, body } = await buyer();
    const res = await post(body, standardWebhookHeaders(body, OTHER_SECRET));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      ok: false,
      error: { code: "unauthorized", message: "invalid_signature" },
    });
    expect(await planOf(id)).toBe("free");
  });

  it("rejects a body re-encoded after signing", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { id, body } = await buyer();
    const res = await post(JSON.stringify(JSON.parse(body)), standardWebhookHeaders(body, SECRET));
    expect(res.status).toBe(401);
    expect(await planOf(id)).toBe("free");
  });

  it("rejects a delivery without the Standard Webhooks headers, or signed too long ago", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { id, body } = await buyer();
    expect((await post(body, new Headers())).status).toBe(401);
    const stale = Math.floor(Date.now() / 1000) - 10 * 60;
    expect((await post(body, signedAs(body, { timestamp: stale }))).status).toBe(401);
    expect(await planOf(id)).toBe("free");
  });

  it("answers 503 until the webhook secret and the signing secret are set", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { id, body } = await buyer();
    for (const unset of ["DODO_WEBHOOK_SECRET", "BILLING_SIGNING_SECRET"]) {
      vi.stubEnv("DODO_WEBHOOK_SECRET", SECRET);
      vi.stubEnv("BILLING_SIGNING_SECRET", BILLING_TEST_SIGNING_SECRET);
      vi.stubEnv(unset, "");
      resetEnvForTests();
      const res = await post(body);
      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({
        ok: false,
        error: { code: "billing_unavailable", message: "not_configured" },
      });
    }
    expect(await planOf(id)).toBe("free");
  });

  it("answers 413 for an oversized body and 500 for an unreadable one, so Dodo retries", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const huge = "x".repeat(300 * 1024);
    const tooLarge = await post(huge);
    expect(tooLarge.status).toBe(413);
    expect(await tooLarge.json()).toMatchObject({ ok: false, error: { code: "too_large" } });

    for (const garbled of [
      "{}",
      "not json",
      subscriptionEvent("subscription.active", { subscription_id: undefined }),
    ]) {
      const res = await post(garbled);
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({
        ok: false,
        error: { code: "server_error", message: "malformed" },
      });
    }
  });
});
