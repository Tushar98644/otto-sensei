import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AI_TOKEN_BUDGETS, PLANS } from "@/config/plans";
import { creditCents } from "@/config/topup";
import { getDb } from "@/db/client";
import { usage, users } from "@/db/schema";
import { createUser, resetDb, setPlan } from "@/lib/auth/test-helpers";
import type { SessionUser } from "@/lib/auth/types";
import { resetEnvForTests } from "@/lib/env";
import { AI_TOKENS, getUsage, resolvePeriod } from "@/lib/usage";
import { takeUnitOrCredit } from "./usage-credit";

vi.mock("@/lib/usage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/usage")>();
  return { ...actual, getUsage: vi.fn(actual.getUsage) };
});

const NOW = Date.UTC(2026, 10, 23, 12);
const DAY = 86_400_000;
const TAILOR = creditCents("tailor") ?? 0;
const readUsage = vi.mocked(getUsage);

async function paidUser(): Promise<SessionUser> {
  const user = await setPlan(await createUser("pro@example.com"), "pro");
  const period = { planPeriodStartsAt: NOW - DAY, planPeriodEndsAt: NOW + 29 * DAY };
  await (await getDb()).update(users).set(period).where(eq(users.id, user.id));
  return { ...user, ...period };
}

async function setBalance(user: SessionUser, cents: number) {
  await (await getDb()).update(users).set({ creditCents: cents }).where(eq(users.id, user.id));
}

async function balanceOf(user: SessionUser): Promise<number> {
  const [row] = await (
    await getDb()
  )
    .select({ cents: users.creditCents })
    .from(users)
    .where(eq(users.id, user.id));
  return row?.cents ?? -1;
}

async function spendAllowance(user: SessionUser, feature: string, count: number) {
  const period = resolvePeriod(user, NOW).key;
  await (await getDb()).insert(usage).values({ subject: user.id, feature, period, count });
}

beforeEach(async () => {
  vi.stubEnv("DODO_TOPUP_PRODUCT_ID", "pdt_TopupCredit00000001");
  resetEnvForTests();
  await resetDb();
  const actual = await vi.importActual<typeof import("@/lib/usage")>("@/lib/usage");
  readUsage.mockReset();
  readUsage.mockImplementation(actual.getUsage);
});

afterEach(() => {
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("a spend that can't be lost", () => {
  it("reads nothing after spending credit, so a failing read can't strand the cents", async () => {
    const pro = await paidUser();
    await setBalance(pro, 100);
    await spendAllowance(pro, "tailor", PLANS.pro.limits.tailor);
    readUsage.mockRejectedValue(new Error("database down"));
    const paid = await takeUnitOrCredit(pro, "tailor", NOW, { budgetAllowed: true });
    expect(paid).toMatchObject({ allowed: true, credit: { cents: TAILOR } });
    expect(readUsage).not.toHaveBeenCalled();
    expect(await balanceOf(pro)).toBe(100 - TAILOR);
    if (!paid.allowed) throw new Error("not allowed");
    await paid.giveBack();
    expect(await balanceOf(pro)).toBe(100);
  });

  it("reads the allowance before spending once the AI budget is out, and spends nothing if that fails", async () => {
    const pro = await paidUser();
    await setBalance(pro, 100);
    await spendAllowance(pro, AI_TOKENS, AI_TOKEN_BUDGETS.pro);
    readUsage.mockRejectedValueOnce(new Error("database down"));
    await expect(takeUnitOrCredit(pro, "fix", NOW, { budgetAllowed: false })).rejects.toThrow(
      "database down",
    );
    expect(await balanceOf(pro)).toBe(100);
    const paid = await takeUnitOrCredit(pro, "fix", NOW, { budgetAllowed: false });
    expect(paid).toMatchObject({ allowed: true, credit: { cents: creditCents("fix") } });
  });
});
