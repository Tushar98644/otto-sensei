import { and, eq } from "drizzle-orm";
import JSZip from "jszip";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AI_TOKEN_BUDGETS, PLANS } from "@/config/plans";
import { creditCents } from "@/config/topup";
import { getDb } from "@/db/client";
import { billingLog, usage, users } from "@/db/schema";
import { mePayload } from "@/app/api/me/payload";
import { buildDataExport } from "@/lib/account/data-export";
import type { SessionUser } from "@/lib/auth/types";
import { createUser, resetDb, setPlan } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import { AI_TOKENS, resolvePeriod } from "@/lib/usage";
import { takeUnitOrCredit } from "@/lib/usage-credit";
import { deleteUserData } from "@/lib/users";
import {
  chargedRef,
  creditActivity,
  creditState,
  creditTopup,
  creditUsable,
  MAX_BALANCE_CENTS,
  mockTopup,
  startTopup,
  takeBackTopup,
} from "./credit";
import { creditOffered } from "./intervals";

const NOW = Date.UTC(2026, 10, 23, 12);
const DAY = 86_400_000;
const TAILOR = creditCents("tailor") ?? 0;

function useEnv(values: Record<string, string | undefined>) {
  for (const [name, value] of Object.entries(values)) vi.stubEnv(name, value);
  resetEnvForTests();
}

// A paid month that started yesterday, so the allowance period is the plan's own.
async function paidUser(email: string, plan: "pro" | "max" = "pro"): Promise<SessionUser> {
  const user = await setPlan(await createUser(email), plan);
  const db = await getDb();
  await db
    .update(users)
    .set({ planPeriodStartsAt: NOW - DAY, planPeriodEndsAt: NOW + 29 * DAY })
    .where(eq(users.id, user.id));
  return { ...user, planPeriodStartsAt: NOW - DAY, planPeriodEndsAt: NOW + 29 * DAY };
}

async function balanceOf(userId: string): Promise<number> {
  const [row] = await (await getDb())
    .select({ cents: users.creditCents })
    .from(users)
    .where(eq(users.id, userId));
  return row?.cents ?? -1;
}

async function setBalance(userId: string, cents: number): Promise<void> {
  await (await getDb()).update(users).set({ creditCents: cents }).where(eq(users.id, userId));
}

async function useUp(user: SessionUser, feature: string, count: number): Promise<void> {
  const period = resolvePeriod(user, NOW).key;
  await (await getDb()).insert(usage).values({ subject: user.id, feature, period, count });
}

async function paidTopup(user: SessionUser, usd: number, paymentId: string) {
  const started = await startTopup(user.id, usd * 100, NOW);
  if (!started.ok) throw new Error("not started");
  return {
    checkoutId: started.id,
    result: await creditTopup(
      {
        checkoutId: started.id,
        userId: user.id,
        paymentId,
        cents: usd * 100,
        charged: chargedRef(usd * 100 + 50, "USD"),
      },
      NOW,
    ),
  };
}

beforeEach(async () => {
  useEnv({ DODO_TOPUP_PRODUCT_ID: "pdt_TopupCredit00000001" });
  await resetDb();
});

afterEach(() => {
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("who can use credit", () => {
  it("stays hidden until the top-up product is set", async () => {
    const pro = await paidUser("pro@example.com");
    useEnv({ DODO_TOPUP_PRODUCT_ID: undefined });
    expect(creditOffered()).toBe(false);
    expect(creditUsable(pro)).toBe(false);
    useEnv({ DODO_TOPUP_PRODUCT_ID: "pdt_TopupCredit00000001" });
    expect(creditOffered()).toBe(true);
    expect(creditUsable(pro)).toBe(true);
  });

  it("is only for Pro and Max past any trial, never Free or the trial", async () => {
    const free = await createUser("free@example.com");
    const trial = await setPlan(await createUser("trial@example.com"), "trial", NOW + DAY);
    const max = await paidUser("max@example.com", "max");
    expect(creditUsable(free)).toBe(false);
    expect(creditUsable(trial)).toBe(false);
    expect(creditUsable(max)).toBe(true);
  });
});

describe("buying credit", () => {
  it("credits a paid top-up once per payment, and a checkout only once", async () => {
    const pro = await paidUser("pro@example.com");
    const first = await paidTopup(pro, 10, "pay_TopupPayment00000001");
    expect(first.result).toEqual({ outcome: "credited", balanceCents: 1000 });
    const again = await creditTopup(
      {
        checkoutId: first.checkoutId,
        userId: pro.id,
        paymentId: "pay_TopupPayment00000001",
        cents: 1000,
        charged: chargedRef(1050, "USD"),
      },
      NOW,
    );
    expect(again).toEqual({ outcome: "duplicate" });
    const second = await creditTopup(
      {
        checkoutId: first.checkoutId,
        userId: pro.id,
        paymentId: "pay_TopupPayment00000002",
        cents: 1000,
        charged: chargedRef(1050, "USD"),
      },
      NOW,
    );
    expect(second).toEqual({ outcome: "already_paid" });
    expect(await balanceOf(pro.id)).toBe(1000);
    expect((await creditState(pro, NOW)).monthCents).toBe(1000);
  });

  it("keeps the balance under the cap, counting checkouts still open", async () => {
    const pro = await paidUser("pro@example.com");
    await setBalance(pro.id, MAX_BALANCE_CENTS - 6000);
    expect(await startTopup(pro.id, 5000, NOW)).toMatchObject({ ok: true });
    expect(await startTopup(pro.id, 2000, NOW)).toEqual({
      ok: false,
      reason: "over_cap",
      roomCents: 1000,
    });
    // An hour on, the open checkout no longer holds its room.
    expect(await startTopup(pro.id, 2000, NOW + 2 * 3_600_000)).toMatchObject({ ok: true });
  });

  it("credits mock billing right away through the same records", async () => {
    const pro = await paidUser("pro@example.com");
    expect(await mockTopup(pro, 20, NOW)).toEqual({ outcome: "credited", balanceCents: 2000 });
    const rows = await (await getDb())
      .select({ kind: billingLog.kind, doneAt: billingLog.doneAt })
      .from(billingLog)
      .where(eq(billingLog.userId, pro.id));
    expect(rows.map((row) => row.kind).sort()).toEqual(["topup", "topup_checkout"]);
  });
});

describe("taking credit back", () => {
  it("takes a full refund's credit back once, never below zero", async () => {
    const pro = await paidUser("pro@example.com");
    await paidTopup(pro, 10, "pay_TopupPayment00000001");
    await setBalance(pro.id, 300);
    const taken = await takeBackTopup(
      { paymentId: "pay_TopupPayment00000001", key: "refund:ref_1", share: "all" },
      NOW,
    );
    expect(taken).toEqual({
      outcome: "taken",
      userId: pro.id,
      wantedCents: 1000,
      removedCents: 300,
      balanceCents: 0,
    });
    expect(
      await takeBackTopup(
        { paymentId: "pay_TopupPayment00000001", key: "refund:ref_1", share: "all" },
        NOW,
      ),
    ).toEqual({ outcome: "duplicate" });
    expect(await balanceOf(pro.id)).toBe(0);
  });

  it("takes a partial refund's share, and never more than was credited", async () => {
    const pro = await paidUser("pro@example.com");
    await paidTopup(pro, 10, "pay_TopupPayment00000001");
    // Half of the 1,050 charged with tax is half the credit.
    const half = await takeBackTopup(
      {
        paymentId: "pay_TopupPayment00000001",
        key: "refund:ref_1",
        share: { amount: 525, currency: "USD" },
      },
      NOW,
    );
    expect(half).toMatchObject({ outcome: "taken", wantedCents: 500, balanceCents: 500 });
    const rest = await takeBackTopup(
      { paymentId: "pay_TopupPayment00000001", key: "dispute:dsp_1", share: "all" },
      NOW,
    );
    expect(rest).toMatchObject({ outcome: "taken", wantedCents: 500, balanceCents: 0 });
  });

  it("leaves payments that weren't top-ups alone", async () => {
    expect(
      await takeBackTopup(
        { paymentId: "pay_Subscription0000001", key: "refund:ref_2", share: "all" },
        NOW,
      ),
    ).toEqual({ outcome: "not_topup" });
  });
});

describe("spending credit", () => {
  it("uses the month's allowance first, then credit, and gives a failed call's credit back once", async () => {
    const pro = await paidUser("pro@example.com");
    await setBalance(pro.id, 100);
    const fromPlan = await takeUnitOrCredit(pro, "tailor", NOW, { budgetAllowed: true });
    expect(fromPlan).toMatchObject({ allowed: true, credit: null });
    expect(await balanceOf(pro.id)).toBe(100);

    await (await getDb())
      .update(usage)
      .set({ count: PLANS.pro.limits.tailor })
      .where(and(eq(usage.subject, pro.id), eq(usage.feature, "tailor")));
    const paid = await takeUnitOrCredit(pro, "tailor", NOW, { budgetAllowed: true });
    expect(paid).toMatchObject({ allowed: true, credit: { cents: TAILOR, balanceCents: 90 } });
    expect(await balanceOf(pro.id)).toBe(100 - TAILOR);
    if (!paid.allowed) throw new Error("not allowed");
    await paid.giveBack();
    await paid.giveBack();
    expect(await balanceOf(pro.id)).toBe(100);
  });

  it("pays from credit once the AI budget runs out, even with allowance left", async () => {
    const pro = await paidUser("pro@example.com");
    await setBalance(pro.id, 50);
    await useUp(pro, AI_TOKENS, AI_TOKEN_BUDGETS.pro);
    const paid = await takeUnitOrCredit(pro, "fix", NOW, { budgetAllowed: false });
    expect(paid).toMatchObject({ allowed: true, credit: { cents: creditCents("fix") } });
    await setBalance(pro.id, 0);
    expect(await takeUnitOrCredit(pro, "fix", NOW, { budgetAllowed: false })).toMatchObject({
      allowed: false,
      budget: true,
    });
  });

  it("refuses Free and the trial even with a balance", async () => {
    const free = await createUser("free@example.com");
    const trial = await setPlan(await createUser("trial@example.com"), "trial", NOW + DAY);
    for (const user of [free, trial]) {
      await setBalance(user.id, 1000);
      await useUp(user, "fix", 1_000);
      const taken = await takeUnitOrCredit(user, "fix", NOW, { budgetAllowed: true });
      expect(taken).toMatchObject({ allowed: false });
      expect(await balanceOf(user.id)).toBe(1000);
    }
  });

  it("never lets two requests spend the same cents", async () => {
    const pro = await paidUser("pro@example.com");
    await setBalance(pro.id, TAILOR);
    await useUp(pro, "tailor", PLANS.pro.limits.tailor);
    const results = await Promise.all(
      [1, 2, 3].map(() => takeUnitOrCredit(pro, "tailor", NOW, { budgetAllowed: true })),
    );
    expect(results.filter((result) => result.allowed)).toHaveLength(1);
    expect(await balanceOf(pro.id)).toBe(0);
    const spends = await (await getDb())
      .select()
      .from(billingLog)
      .where(and(eq(billingLog.userId, pro.id), eq(billingLog.kind, "credit_spend")));
    expect(spends).toHaveLength(1);
  });

  it("lists the history newest first, adding up a day's spends of one feature", async () => {
    const pro = await paidUser("pro@example.com");
    await paidTopup(pro, 5, "pay_TopupPayment00000001");
    await useUp(pro, "fix", PLANS.pro.limits.fix);
    for (let i = 0; i < 3; i++) {
      await takeUnitOrCredit(pro, "fix", NOW + 1_000 + i, { budgetAllowed: true });
    }
    expect(await creditActivity(pro.id)).toEqual([
      { at: NOW + 1_002, kind: "spent", cents: 6, feature: "fix", count: 3 },
      { at: NOW, kind: "added", cents: 500, feature: null, count: 1 },
    ]);
  });
});

describe("the account's credit", () => {
  it("comes with /api/me only while credit is on sale", async () => {
    const pro = await paidUser("pro@example.com");
    await paidTopup(pro, 10, "pay_TopupPayment00000001");
    vi.setSystemTime(NOW + 1_000);
    expect((await mePayload(pro)).billing.credit).toEqual({
      balanceCents: 1000,
      monthCents: 1000,
      usable: true,
    });
    useEnv({ DODO_TOPUP_PRODUCT_ID: undefined });
    expect((await mePayload(pro)).billing).not.toHaveProperty("credit");
    vi.useRealTimers();
  });

  it("is in the data export, and goes with the account", async () => {
    const pro = await paidUser("pro@example.com");
    await paidTopup(pro, 10, "pay_TopupPayment00000001");
    await useUp(pro, "tailor", PLANS.pro.limits.tailor);
    await takeUnitOrCredit(pro, "tailor", NOW + 5, { budgetAllowed: true });

    const zip = await JSZip.loadAsync(await buildDataExport(pro.id, NOW));
    const credit = JSON.parse((await zip.file("credit.json")?.async("string")) ?? "null");
    expect(credit).toEqual({
      balanceCents: 1000 - TAILOR,
      entries: [
        { at: NOW, kind: "added", cents: 1000, what: "pay_TopupPayment00000001" },
        { at: NOW + 5, kind: "spent", cents: TAILOR, what: "tailor" },
      ],
    });

    await deleteUserData(pro.id);
    const left = await (await getDb())
      .select()
      .from(billingLog)
      .where(eq(billingLog.userId, pro.id));
    expect(left).toEqual([]);
  });

  it("leaves credit.json out of an export with no credit", async () => {
    const pro = await paidUser("pro@example.com");
    const zip = await JSZip.loadAsync(await buildDataExport(pro.id, NOW));
    expect(zip.file("credit.json")).toBeNull();
  });
});
