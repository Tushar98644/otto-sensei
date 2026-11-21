import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/lib/auth/session";
import type { SessionUser } from "@/lib/auth/types";
import { insertUserRow, resetDb } from "@/lib/auth/test-helpers";
import { mockHistory } from "@/lib/billing/history";
import { resetEnvForTests } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { GET as history } from "./history/route";
import { GET as invoice } from "./invoice/[paymentId]/route";

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit")>()),
  rateLimit: vi.fn(),
}));

const currentUser = vi.mocked(getCurrentUser);
const limiter = vi.mocked(rateLimit);
const DAY = 24 * 60 * 60 * 1000;

let sequence = 0;

async function signIn(plan: "free" | "pro" = "pro"): Promise<SessionUser> {
  sequence += 1;
  const now = Date.now();
  const user: SessionUser = {
    id: crypto.randomUUID(),
    email: `buyer${sequence}@example.com`,
    plan,
    planInterval: plan === "free" ? null : "month",
    planRenewsAt: plan === "free" ? null : now + 20 * DAY,
    trialEndsAt: null,
    planPeriodStartsAt: plan === "free" ? null : now - 10 * DAY,
    planPeriodEndsAt: plan === "free" ? null : now + 20 * DAY,
  };
  await insertUserRow({ id: user.id, email: user.email, plan, createdAt: 1, updatedAt: 1 });
  currentUser.mockResolvedValue(user);
  return user;
}

function invoiceRequest(paymentId: string, headers: Record<string, string> = {}) {
  return [
    new Request(`https://otto.example/api/billing/invoice/${paymentId}`, { headers }),
    { params: Promise.resolve({ paymentId }) },
  ] as const;
}

function firstPaymentId(user: SessionUser): string {
  const [payment] = mockHistory(user).payments;
  if (!payment) throw new Error("no sample payment");
  return payment.id;
}

beforeEach(async () => {
  for (const name of ["DODO_API_KEY", "DODO_WEBHOOK_SECRET", "BILLING_SIGNING_SECRET"]) {
    vi.stubEnv(name, undefined);
  }
  resetEnvForTests();
  currentUser.mockReset();
  currentUser.mockResolvedValue(null);
  limiter.mockReset();
  limiter.mockResolvedValue({ allowed: true, remaining: 10, retryAfterMs: 0 });
  await resetDb();
});

afterEach(() => {
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("GET /api/billing/history", () => {
  it("asks for sign-in first", async () => {
    const res = await history();

    expect(res.status).toBe(401);
    expect(limiter).not.toHaveBeenCalled();
  });

  it("returns the account's payments and next charge, never cached", async () => {
    const user = await signIn();
    const res = await history();
    const body = (await res.json()) as { history: { payments: { id: string }[] } };

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(body.history.payments.map((payment) => payment.id)).toEqual([firstPaymentId(user)]);
    expect(limiter).toHaveBeenCalledWith(`history:user:${user.id}`, 60, 60 * 60 * 1000);
  });

  it("is empty on Free", async () => {
    await signIn("free");
    const body = (await (await history()).json()) as { history: unknown };

    expect(body.history).toEqual({ payments: [], upcoming: null, card: null });
  });

  it("stops at the hourly limit", async () => {
    await signIn();
    limiter.mockResolvedValue({ allowed: false, remaining: 0, retryAfterMs: 120_000 });
    const res = await history();

    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("120");
  });
});

describe("GET /api/billing/invoice/[paymentId]", () => {
  it("asks for sign-in first", async () => {
    const res = await invoice(...invoiceRequest("pay_mock0123456789abcdef0123"));

    expect(res.status).toBe(401);
  });

  it("downloads the account's own invoice as a PDF attachment", async () => {
    const user = await signIn();
    const res = await invoice(...invoiceRequest(firstPaymentId(user)));

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toMatch(
      /^attachment; filename="otto-sensei-invoice-\d{4}-\d{2}-\d{2}\.pdf"$/,
    );
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(new TextDecoder().decode((await res.arrayBuffer()).slice(0, 5))).toBe("%PDF-");
  });

  it("answers another account's invoice like a missing one", async () => {
    const someone = await signIn();
    const theirs = firstPaymentId(someone);
    await signIn();
    const res = await invoice(...invoiceRequest(theirs));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      ok: false,
      error: { code: "not_found", message: "We couldn't find that invoice." },
    });
  });

  it("refuses a request from another website before anything else", async () => {
    const user = await signIn();
    const res = await invoice(
      ...invoiceRequest(firstPaymentId(user), { "sec-fetch-site": "cross-site" }),
    );

    expect(res.status).toBe(403);
    expect(currentUser).not.toHaveBeenCalled();
  });

  it("stops at the hourly limit", async () => {
    const user = await signIn();
    limiter.mockResolvedValue({ allowed: false, remaining: 0, retryAfterMs: 60_000 });
    const res = await invoice(...invoiceRequest(firstPaymentId(user)));

    expect(res.status).toBe(429);
    expect(limiter).toHaveBeenCalledWith(`invoice:user:${user.id}`, 30, 60 * 60 * 1000);
  });
});
