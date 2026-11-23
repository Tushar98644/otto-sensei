import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AI_TOKEN_BUDGETS, PLANS } from "@/config/plans";
import { getDb } from "@/db/client";
import { usage, users } from "@/db/schema";
import type { ApiErrorBody, FixRequestBody } from "@/lib/api/types";
import { cookieJar, jsonRequest, resetDb, setPlan, signInAs } from "@/lib/auth/test-helpers";
import type { SessionUser } from "@/lib/auth/types";
import { resetEnvForTests } from "@/lib/env";
import { AI_TOKENS, monthKey } from "@/lib/usage";
import { POST as fixRoute } from "./fix/route";
import { claimAiRead } from "./import/ai-reads";
import { takeAccountUnit } from "./metered-free";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);
vi.mock("@/lib/ai/moderation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/moderation")>()),
  checkContent: async () => ({ allowed: true, categories: [] }),
}));

const NOW = Date.UTC(2026, 10, 7, 12);
const BODY: FixRequestBody = {
  bullet: "Responsible for managing the company blog",
  role: { title: "Marketing Manager", company: "Northwind" },
};

const fix = () => fixRoute(jsonRequest("/api/fix", BODY));

async function setBalance(user: SessionUser, cents: number) {
  await (await getDb()).update(users).set({ creditCents: cents }).where(eq(users.id, user.id));
}

async function balanceOf(user: SessionUser): Promise<number> {
  const [row] = await (await getDb())
    .select({ cents: users.creditCents })
    .from(users)
    .where(eq(users.id, user.id));
  return row?.cents ?? -1;
}

async function useUp(user: SessionUser, feature: string, count: number) {
  await (await getDb())
    .insert(usage)
    .values({ subject: user.id, feature, period: monthKey(NOW), count })
    .onConflictDoUpdate({ target: [usage.subject, usage.feature, usage.period], set: { count } });
}

function creditOn(on = true) {
  vi.stubEnv("DODO_TOPUP_PRODUCT_ID", on ? "pdt_TopupCredit00000001" : "");
  resetEnvForTests();
}

beforeEach(async () => {
  vi.setSystemTime(NOW);
  delete process.env.OPENROUTER_API_KEY;
  creditOn();
  await resetDb();
  cookieJar.clear();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  resetEnvForTests();
});

describe("a metered call past the allowance", () => {
  it("runs on credit when the balance covers it, and says what it cost", async () => {
    const user = await setPlan(await signInAs("pro@example.com"), "pro");
    await useUp(user, "fix", PLANS.pro.limits.fix);
    await setBalance(user, 10);
    const res = await fix();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, credit: { cents: 2, balanceCents: 8 } });
    expect(await balanceOf(user)).toBe(8);
  });

  it("answers limit_reached as before when the balance doesn't cover it", async () => {
    const user = await setPlan(await signInAs("pro@example.com"), "pro");
    await useUp(user, "fix", PLANS.pro.limits.fix);
    await setBalance(user, 1);
    const res = await fix();
    expect(res.status).toBe(429);
    expect(((await res.json()) as ApiErrorBody).error.code).toBe("limit_reached");
    expect(await balanceOf(user)).toBe(1);
  });

  it("runs on credit once the AI budget is spent, and without credit says so as before", async () => {
    const user = await setPlan(await signInAs("pro@example.com"), "pro");
    await useUp(user, AI_TOKENS, AI_TOKEN_BUDGETS.pro);
    await setBalance(user, 2);
    expect((await fix()).status).toBe(200);
    expect(await balanceOf(user)).toBe(0);
    const res = await fix();
    expect(res.status).toBe(429);
    expect(((await res.json()) as ApiErrorBody).error.reason).toBe("ai_budget");
  });

  it("leaves the balance alone while the allowance lasts, and while credit is off", async () => {
    const user = await setPlan(await signInAs("pro@example.com"), "pro");
    await setBalance(user, 100);
    const res = await fix();
    expect(await res.json()).not.toHaveProperty("credit");
    creditOn(false);
    await useUp(user, "fix", PLANS.pro.limits.fix);
    expect((await fix()).status).toBe(429);
    expect(await balanceOf(user)).toBe(100);
  });

  it("never spends a Free account's balance", async () => {
    const user = await signInAs("free@example.com");
    await useUp(user, "fix", PLANS.free.limits.fix);
    await setBalance(user, 100);
    expect((await fix()).status).toBe(429);
    expect(await balanceOf(user)).toBe(100);
  });
});

describe("other metered work", () => {
  it("pays a draft from credit past its allowance", async () => {
    const user = await setPlan(await signInAs("pro@example.com"), "pro");
    await useUp(user, "draft", PLANS.pro.limits.draft);
    await setBalance(user, 100);
    const unit = await takeAccountUnit(user, "draft", NOW);
    if (unit instanceof Response) throw new Error("refused");
    expect(unit.credit).toEqual({ cents: 30, balanceCents: 70 });
    await unit.giveBack();
    expect(await balanceOf(user)).toBe(100);
  });

  it("spends credit on an AI read only when the person asked for one", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test");
    resetEnvForTests();
    const user = await setPlan(await signInAs("pro@example.com"), "pro");
    await useUp(user, "import", PLANS.pro.limits.import);
    await setBalance(user, 100);
    expect(await claimAiRead(user, NOW)).toMatchObject({ useAI: false, limited: true });
    expect(await balanceOf(user)).toBe(100);
    const asked = await claimAiRead(user, NOW, { credit: true });
    expect(asked).toMatchObject({ useAI: true, credit: { cents: 15, balanceCents: 85 } });
  });
});
