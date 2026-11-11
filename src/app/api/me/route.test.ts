import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AI_TOKEN_BUDGETS, FEATURES, PLANS, PRO_TRIAL } from "@/config/plans";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { clearSession } from "@/lib/auth/session";
import { AUTH_COOKIE, cookieJar, fakeAuth, resetDb, signInAs, signInOnTrial } from "@/lib/auth/test-helpers";
import { recordTrialHistory } from "@/lib/billing/trial";
import { billingWeekEnd, consumeUsage } from "@/lib/usage";
import { GET } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);
// Pinned so this test doesn't depend on how billing picks its mode.
vi.mock("@/lib/billing", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/billing")>()),
  billingMode: () => "mock",
}));

const usageOf = (limits: Record<(typeof FEATURES)[number], number>, used: Partial<Record<string, number>> = {}) =>
  Object.fromEntries(FEATURES.map((feature) => [feature, { used: used[feature] ?? 0, limit: limits[feature] }]));

beforeEach(async () => {
  await resetDb();
  cookieJar.clear();
});

describe("GET /api/me", () => {
  it("reports a signed-out visitor with null user and usage, never cached", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual({
      ok: true,
      user: null,
      usage: null,
      period: null,
      aiBudget: null,
      billing: {
        mode: "mock",
        offer: { pro: ["month", "year", "week"], max: ["month", "year", "week"] },
        // A new account would start on the trial.
        trial: true,
      },
      auth: { mode: "supabase" },
    });
  });

  it("treats a broken cookie as signed out", async () => {
    cookieJar.set(AUTH_COOKIE, "garbage");
    expect(await (await GET()).json()).toMatchObject({ ok: true, user: null, usage: null });
  });

  it("treats a cookie copied before logout as signed out", async () => {
    await signInAs("ada@example.com");
    const token = cookieJar.get(AUTH_COOKIE)?.value ?? "";
    await clearSession();
    cookieJar.set(AUTH_COOKIE, token);
    expect(await (await GET()).json()).toMatchObject({ ok: true, user: null, usage: null });
  });

  it("returns a Free user with no AI allowance, and the trial on offer until they've had one", async () => {
    const user = await signInAs("ada@example.com");
    const res = await GET();
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual({
      ok: true,
      user: { ...user, trialEndsAt: null },
      usage: usageOf(PLANS.free.limits),
      period: { kind: "month", resetsAt: expect.any(Number) },
      // Free has no AI, so no AI budget either.
      aiBudget: null,
      billing: {
        mode: "mock",
        offer: { pro: ["month", "year", "week"], max: ["month", "year", "week"] },
        trial: true,
      },
      auth: { mode: "supabase" },
    });

    await recordTrialHistory(await getDb(), user.email, "trial");
    expect((await (await GET()).json()).billing.trial).toBe(false);
  });

  it("returns a trial's own allowance, its end date as the reset, and no second trial", async () => {
    const trialEnd = Date.now() + 2 * 86_400_000;
    const user = await signInOnTrial("ada@example.com", trialEnd);
    await consumeUsage(user, "fix");

    const body = await (await GET()).json();
    expect(body.user).toMatchObject({ plan: "pro", trialEndsAt: trialEnd });
    expect(body.usage).toEqual(usageOf(PRO_TRIAL.limits, { fix: 1 }));
    expect(body.period).toEqual({ kind: "trial", resetsAt: trialEnd });
    expect(body.aiBudget).toEqual({ used: 0, limit: AI_TOKEN_BUDGETS.trial });
    expect(body.billing.trial).toBe(false);
  });

  it("counts a weekly subscriber's usage per billing week, with its reset time", async () => {
    const user = await signInAs("ada@example.com");
    const renewsAt = Date.now() + 2 * 86_400_000;
    const db = await getDb();
    await db
      .update(users)
      .set({ plan: "max", planInterval: "week", planRenewsAt: renewsAt })
      .where(eq(users.id, user.id));
    await consumeUsage({ ...user, plan: "max", planInterval: "week", planRenewsAt: renewsAt }, "tailor");

    const body = await (await GET()).json();
    expect(body.user).toMatchObject({ plan: "max", planInterval: "week" });
    expect(body.period).toEqual({ kind: "week", resetsAt: billingWeekEnd(renewsAt, Date.now()) });
    expect(body.usage.tailor).toEqual({ used: 1, limit: PLANS.max.weeklyLimits.tailor });
  });

  it("tells the sign-in form when Supabase isn't set up", async () => {
    fakeAuth.setConfigured(false);
    expect(await (await GET()).json()).toMatchObject({ auth: { mode: "off" } });
  });
});
