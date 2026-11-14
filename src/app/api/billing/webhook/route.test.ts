import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { insertUserRow, resetDb } from "@/lib/auth/test-helpers";
import {
  adjustmentEvent,
  paddleSignature,
  subscriptionEvent,
  WEBHOOK_TEST_SECRET,
} from "@/lib/billing/webhook-testing";
import { resetEnvForTests } from "@/lib/env";
import { POST as webhook } from "./route";

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: vi.fn() }));

const currentUser = vi.mocked(getCurrentUser);

// The event builders sign custom_data's user_id with this secret.
const SECRET = WEBHOOK_TEST_SECRET;
const PRICE_ID = "pri_otto_pro_month";

function post(body: string, signature = paddleSignature(body, SECRET)): Promise<Response> {
  return webhook(
    new Request("https://otto.example/api/billing/webhook", {
      method: "POST",
      headers: { "content-type": "application/json", "paddle-signature": signature },
      body,
    }),
  );
}

async function buyer() {
  const id = crypto.randomUUID();
  await insertUserRow({ id, email: `${id}@example.com`, plan: "free", createdAt: 1, updatedAt: 1 });
  // Pretty-printed on purpose: the signature covers these exact bytes, whitespace included.
  const body = JSON.stringify(
    JSON.parse(
      subscriptionEvent("subscription.created", {
        price_id: PRICE_ID,
        custom_data: { user_id: id },
      }),
    ),
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
  vi.stubEnv("PADDLE_WEBHOOK_SECRET", SECRET);
  vi.stubEnv("PADDLE_PRO_MONTHLY_PRICE_ID", PRICE_ID);
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

  it("answers a redelivery as a duplicate", async () => {
    const { body } = await buyer();
    await post(body);
    const res = await post(body);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, message: "duplicate" });
  });

  it("grants nothing for a user_id the server didn't sign", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const id = crypto.randomUUID();
    await insertUserRow({
      id,
      email: `${id}@example.com`,
      plan: "free",
      createdAt: 1,
      updatedAt: 1,
    });
    const body = subscriptionEvent("subscription.created", {
      price_id: PRICE_ID,
      custom_data: { user_id: id, user_sig: undefined },
    });
    const res = await post(body);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, message: "ignored" });
    expect(await planOf(id)).toBe("free");
  });

  it("answers a refund notice with 200 and leaves the plan alone", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { id, body } = await buyer();
    await post(body);
    const res = await post(adjustmentEvent("adjustment.updated", { status: "approved" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, message: "applied" });
    expect(await planOf(id)).toBe("pro");
  });

  it("rejects a bad signature with 401", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { id, body } = await buyer();
    const res = await post(body, paddleSignature(body, "pdl_ntfset_not_the_configured_one"));

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
    const res = await post(JSON.stringify(JSON.parse(body)), paddleSignature(body, SECRET));
    expect(res.status).toBe(401);
    expect(await planOf(id)).toBe("free");
  });

  it("answers 503 until the webhook secret is set", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubEnv("PADDLE_WEBHOOK_SECRET", "");
    resetEnvForTests();
    const { body } = await buyer();
    const res = await post(body);
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ ok: false, error: { code: "billing_unavailable" } });
  });

  it("answers 413 for an oversized body and 500 for an unreadable one, so Paddle retries", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const huge = "x".repeat(300 * 1024);
    const tooLarge = await post(huge);
    expect(tooLarge.status).toBe(413);
    expect(await tooLarge.json()).toMatchObject({ ok: false, error: { code: "too_large" } });

    const garbled = await post("{}");
    expect(garbled.status).toBe(500);
    expect(await garbled.json()).toEqual({
      ok: false,
      error: { code: "server_error", message: "malformed" },
    });
  });
});
