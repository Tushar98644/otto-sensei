import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PLANS } from "@/config/plans";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { clearSession } from "@/lib/auth/session";
import { AUTH_COOKIE, cookieJar, fakeAuth, resetDb, signInAs } from "@/lib/auth/test-helpers";
import { billingWeekEnd, consumeUsage } from "@/lib/usage";
import { GET } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);
// Pinned so this test doesn't depend on how billing picks its mode.
vi.mock("@/lib/billing", () => ({ billingMode: () => "mock" }));

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
      billing: {
        mode: "mock",
        offer: { pro: ["month", "year", "week"], max: ["month", "year", "week"] },
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

  it("returns the user with this month's usage", async () => {
    const user = await signInAs("ada@example.com");
    await consumeUsage(user, "fix");

    const res = await GET();
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual({
      ok: true,
      user,
      usage: {
        fix: { used: 1, limit: PLANS.free.limits.fix },
        tailor: { used: 0, limit: PLANS.free.limits.tailor },
        letter: { used: 0, limit: PLANS.free.limits.letter },
        import: { used: 0, limit: PLANS.free.limits.import },
        draft: { used: 0, limit: PLANS.free.limits.draft },
        github: { used: 0, limit: PLANS.free.limits.github },
      },
      period: { kind: "month", resetsAt: expect.any(Number) },
      billing: {
        mode: "mock",
        offer: { pro: ["month", "year", "week"], max: ["month", "year", "week"] },
      },
      auth: { mode: "supabase" },
    });
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
