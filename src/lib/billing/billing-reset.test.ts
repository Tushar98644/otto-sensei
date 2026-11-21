import { eq, inArray } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import {
  trialHistory,
  trialReminders,
  trialReplacements,
  trialWatch,
  usage,
  users,
} from "@/db/schema";
import { insertUserRow, resetDb } from "@/lib/auth/test-helpers";
import { TRIAL_PERIOD_KEY } from "@/lib/usage";
import { parseResetArgs, RESET_USAGE, resetBilling } from "./billing-reset";

const CTM = `ctm_${"a1".repeat(13)}`;
const SUB = `sub_${"b2".repeat(13)}`;
const DODO_CUSTOMER = "cus_Ab12Cd34Ef56Gh78Ij90";
const DODO_SUBSCRIPTION = "sub_Xy34Zw56Uv78St90Qr12";
const NOW = Date.UTC(2026, 10, 20);

const PAID = {
  plan: "pro" as const,
  planInterval: "month" as const,
  planStatus: "active",
  planRenewsAt: NOW + 1,
  planPeriodStartsAt: NOW - 1,
  planPeriodEndsAt: NOW + 1,
};

const TRIAL = { ...PAID, planStatus: "trialing", trialEndsAt: NOW + 1 };

const CLEARED = {
  plan: "free",
  planInterval: null,
  planRenewsAt: null,
  trialEndsAt: null,
  planPeriodStartsAt: null,
  planPeriodEndsAt: null,
  planStatus: null,
  billingCustomerId: null,
  billingSubscriptionId: null,
  billingEventAt: null,
  updatedAt: NOW,
};

const ZERO = {
  users: 0,
  paidUsers: 0,
  trialReminders: 0,
  trialWatch: 0,
  trialReplacements: 0,
  trialHistory: 0,
  trialUsage: 0,
};

type UsageRow = typeof usage.$inferSelect;

async function addUser(
  email: string,
  row: Partial<typeof users.$inferInsert> = {},
): Promise<string> {
  const id = crypto.randomUUID();
  await insertUserRow({ id, email, plan: "free", createdAt: 1, updatedAt: 1, ...row });
  return id;
}

async function addTrialRows(userId: string): Promise<void> {
  const db = await getDb();
  await db.insert(trialReminders).values({ userId, trialEndsAt: NOW + 1, createdAt: 1 });
  await db.insert(trialWatch).values({ userId, trialEndsAt: NOW + 1, seenAt: 1 });
}

async function addTrialHistory(): Promise<void> {
  await (await getDb()).insert(trialHistory).values([
    { emailHash: "hash-owner", kind: "trial", createdAt: 1 },
    { emailHash: "hash-tester", kind: "paid", createdAt: 1 },
  ]);
}

async function addUsage(rows: UsageRow[]): Promise<void> {
  await (await getDb()).insert(usage).values(rows);
}

async function usageOf(ids: string[]): Promise<UsageRow[]> {
  return (await getDb()).select().from(usage).where(inArray(usage.subject, ids));
}

async function rowOf(id: string) {
  const [row] = await (await getDb()).select().from(users).where(eq(users.id, id));
  return row;
}

async function userIdsIn(table: typeof trialReminders | typeof trialWatch): Promise<string[]> {
  const rows = await (await getDb()).select({ userId: table.userId }).from(table);
  return rows.map((row) => row.userId).sort();
}

beforeEach(async () => {
  await resetDb();
});

describe("resetBilling --paddle", () => {
  it("counts Paddle sandbox accounts without changing anything, then frees them with --apply", async () => {
    const trialist = await addUser("a@example.com", {
      ...TRIAL,
      billingCustomerId: CTM,
      billingSubscriptionId: SUB,
      billingEventAt: NOW - 1,
    });
    await addTrialRows(trialist);
    const subscriptionOnly = await addUser("b@example.com", {
      ...PAID,
      plan: "max",
      planStatus: "past_due",
      billingSubscriptionId: `sub_${"c3".repeat(13)}`,
    });
    const customerOnly = await addUser("c@example.com", {
      planStatus: "canceled",
      billingCustomerId: `ctm_${"d4".repeat(13)}`,
    });
    await (
      await getDb()
    )
      .insert(trialWatch)
      .values({ userId: customerOnly, trialEndsAt: NOW - 1, seenAt: 1 });
    const dodo = await addUser("d@example.com", {
      ...TRIAL,
      billingCustomerId: DODO_CUSTOMER,
      billingSubscriptionId: DODO_SUBSCRIPTION,
      billingEventAt: NOW - 1,
    });
    await addTrialRows(dodo);
    const mock = await addUser("e@example.com", {
      ...TRIAL,
      planStatus: "mock_trialing",
      billingCustomerId: `ctm_${"e5".repeat(13)}`,
    });
    await addTrialRows(mock);
    const comp = await addUser("f@example.com", { plan: "max", planInterval: "year" });
    const upper = await addUser("g@example.com", { ...PAID, billingCustomerId: CTM.toUpperCase() });
    const creem = await addUser("h@example.com", {
      ...PAID,
      billingCustomerId: "cust_old",
      billingSubscriptionId: "sub_old",
    });
    const never = await addUser("i@example.com");
    const trialUsage: UsageRow[] = [
      { subject: trialist, feature: "tailor", period: TRIAL_PERIOD_KEY, count: 10, bonus: 3 },
      { subject: trialist, feature: "tailor", period: "2026-11", count: 4, bonus: 1 },
      { subject: never, feature: "draft", period: TRIAL_PERIOD_KEY, count: 3, bonus: 0 },
      { subject: never, feature: "letter", period: TRIAL_PERIOD_KEY, count: 0, bonus: 5 },
    ];
    await addUsage(trialUsage);
    const db = await getDb();
    await db.insert(trialReplacements).values([
      {
        replacedSubscriptionId: SUB,
        subscriptionId: `sub_${"f6".repeat(13)}`,
        userId: trialist,
        createdAt: 1,
      },
      {
        replacedSubscriptionId: DODO_SUBSCRIPTION,
        subscriptionId: "sub_Pq56Rs78Tu90Vw12Xy34",
        userId: dodo,
        createdAt: 1,
      },
    ]);
    await addTrialHistory();

    const counts = {
      users: 3,
      paidUsers: 2,
      trialReminders: 1,
      trialWatch: 2,
      trialReplacements: 1,
      trialHistory: 2,
      trialUsage: 2,
    };
    expect(await resetBilling(db, { mode: "paddle", apply: false })).toEqual(counts);
    expect(await usageOf([trialist, never])).toEqual(expect.arrayContaining(trialUsage));
    expect(await rowOf(trialist)).toMatchObject({
      plan: "pro",
      billingCustomerId: CTM,
      billingSubscriptionId: SUB,
    });
    expect(await userIdsIn(trialReminders)).toEqual([trialist, dodo, mock].sort());
    expect(await userIdsIn(trialWatch)).toEqual([trialist, customerOnly, dodo, mock].sort());
    expect(await db.select().from(trialReplacements)).toHaveLength(2);
    expect(await db.select().from(trialHistory)).toHaveLength(2);

    expect(await resetBilling(db, { mode: "paddle", apply: true, now: NOW })).toEqual(counts);
    for (const id of [trialist, subscriptionOnly, customerOnly]) {
      expect(await rowOf(id)).toMatchObject(CLEARED);
    }
    expect(await rowOf(dodo)).toMatchObject({
      plan: "pro",
      planStatus: "trialing",
      trialEndsAt: NOW + 1,
      billingCustomerId: DODO_CUSTOMER,
      billingSubscriptionId: DODO_SUBSCRIPTION,
      billingEventAt: NOW - 1,
      updatedAt: 1,
    });
    expect(await rowOf(mock)).toMatchObject({
      plan: "pro",
      planStatus: "mock_trialing",
      updatedAt: 1,
    });
    expect(await rowOf(comp)).toMatchObject({ plan: "max", planInterval: "year", updatedAt: 1 });
    expect(await rowOf(upper)).toMatchObject({ plan: "pro", billingCustomerId: CTM.toUpperCase() });
    expect(await rowOf(creem)).toMatchObject({ plan: "pro", billingCustomerId: "cust_old" });
    expect(await rowOf(never)).toMatchObject({ plan: "free", updatedAt: 1 });
    expect(await userIdsIn(trialReminders)).toEqual([dodo, mock].sort());
    expect(await userIdsIn(trialWatch)).toEqual([dodo, mock].sort());
    expect(
      (await db.select().from(trialReplacements)).map((row) => row.replacedSubscriptionId),
    ).toEqual([DODO_SUBSCRIPTION]);
    expect(await db.select().from(trialHistory)).toEqual([]);
    const afterPaddle = await usageOf([trialist, never]);
    expect(afterPaddle).toHaveLength(4);
    expect(afterPaddle).toEqual(
      expect.arrayContaining([
        { subject: trialist, feature: "tailor", period: TRIAL_PERIOD_KEY, count: 0, bonus: 3 },
        { subject: trialist, feature: "tailor", period: "2026-11", count: 4, bonus: 1 },
        { subject: never, feature: "draft", period: TRIAL_PERIOD_KEY, count: 0, bonus: 0 },
        { subject: never, feature: "letter", period: TRIAL_PERIOD_KEY, count: 0, bonus: 5 },
      ]),
    );

    expect(await resetBilling(db, { mode: "paddle", apply: true })).toEqual(ZERO);
  });
});

describe("resetBilling --go-live", () => {
  it("counts every billed account, Dodo test-mode ids included, then frees them all with --apply", async () => {
    const dodoTrial = await addUser("a@example.com", {
      ...TRIAL,
      billingCustomerId: DODO_CUSTOMER,
      billingSubscriptionId: DODO_SUBSCRIPTION,
      billingEventAt: NOW - 1,
    });
    await addTrialRows(dodoTrial);
    const dodoMax = await addUser("b@example.com", {
      ...PAID,
      plan: "max",
      planInterval: "year",
      planStatus: "on_hold",
      billingCustomerId: "cus_Zz98Yy76Xx54Ww32Vv10",
      billingSubscriptionId: "sub_Mn12Op34Qr56St78Uv90",
    });
    const customerOnly = await addUser("c@example.com", {
      billingCustomerId: "cus_Gh12Ij34Kl56Mn78Op90",
    });
    const statusOnly = await addUser("d@example.com", { planStatus: "canceled" });
    const eventOnly = await addUser("e@example.com", { billingEventAt: NOW - 1 });
    const paddle = await addUser("f@example.com", {
      ...PAID,
      billingCustomerId: CTM,
      billingSubscriptionId: SUB,
    });
    await addTrialRows(paddle);
    const mock = await addUser("g@example.com", { ...TRIAL, planStatus: "mock_trialing" });
    await addTrialRows(mock);
    const comp = await addUser("h@example.com", { plan: "max", planInterval: "month" });
    const never = await addUser("i@example.com");
    const cycle = "cycle:2026-11-01T00:00:00.000Z";
    await addUsage([
      { subject: dodoTrial, feature: "tailor", period: TRIAL_PERIOD_KEY, count: 10, bonus: 3 },
      {
        subject: dodoTrial,
        feature: "ai_tokens",
        period: TRIAL_PERIOD_KEY,
        count: 480_000,
        bonus: 0,
      },
      { subject: comp, feature: "tailor", period: cycle, count: 7, bonus: 2 },
    ]);
    const db = await getDb();
    await db.insert(trialReplacements).values([
      {
        replacedSubscriptionId: DODO_SUBSCRIPTION,
        subscriptionId: "sub_Pq56Rs78Tu90Vw12Xy34",
        userId: dodoTrial,
        createdAt: 1,
      },
      {
        replacedSubscriptionId: SUB,
        subscriptionId: `sub_${"c9".repeat(13)}`,
        userId: paddle,
        createdAt: 1,
      },
    ]);
    await addTrialHistory();

    const counts = {
      users: 6,
      paidUsers: 3,
      trialReminders: 2,
      trialWatch: 2,
      trialReplacements: 2,
      trialHistory: 2,
      trialUsage: 2,
    };
    expect(await resetBilling(db, { mode: "go-live", apply: false })).toEqual(counts);
    expect(await rowOf(dodoTrial)).toMatchObject({
      plan: "pro",
      billingSubscriptionId: DODO_SUBSCRIPTION,
    });
    expect(await userIdsIn(trialReminders)).toHaveLength(3);
    expect(await db.select().from(trialReplacements)).toHaveLength(2);
    expect(await db.select().from(trialHistory)).toHaveLength(2);

    expect(await resetBilling(db, { mode: "go-live", apply: true, now: NOW })).toEqual(counts);
    for (const id of [dodoTrial, dodoMax, customerOnly, statusOnly, eventOnly, paddle]) {
      expect(await rowOf(id)).toMatchObject(CLEARED);
    }
    expect(await rowOf(mock)).toMatchObject({
      plan: "pro",
      planStatus: "mock_trialing",
      trialEndsAt: NOW + 1,
    });
    expect(await rowOf(comp)).toMatchObject({ plan: "max", planInterval: "month", updatedAt: 1 });
    expect(await rowOf(never)).toMatchObject({ plan: "free", updatedAt: 1 });
    expect(await userIdsIn(trialReminders)).toEqual([mock]);
    expect(await userIdsIn(trialWatch)).toEqual([mock]);
    expect(await db.select().from(trialReplacements)).toEqual([]);
    expect(await db.select().from(trialHistory)).toEqual([]);
    const afterGoLive = await usageOf([dodoTrial, comp]);
    expect(afterGoLive).toHaveLength(3);
    expect(afterGoLive).toEqual(
      expect.arrayContaining([
        { subject: dodoTrial, feature: "tailor", period: TRIAL_PERIOD_KEY, count: 0, bonus: 3 },
        { subject: dodoTrial, feature: "ai_tokens", period: TRIAL_PERIOD_KEY, count: 0, bonus: 0 },
        { subject: comp, feature: "tailor", period: cycle, count: 7, bonus: 2 },
      ]),
    );

    expect(await resetBilling(db, { mode: "go-live", apply: true })).toEqual(ZERO);
  });
});

describe("parseResetArgs", () => {
  it("needs exactly one mode and is a dry run without --apply, in any order", () => {
    expect(parseResetArgs(["--paddle"])).toEqual({ action: "run", mode: "paddle", apply: false });
    expect(parseResetArgs(["--apply", "--paddle"])).toEqual({
      action: "run",
      mode: "paddle",
      apply: true,
    });
    expect(parseResetArgs(["--go-live"])).toEqual({ action: "run", mode: "go-live", apply: false });
    expect(parseResetArgs(["--go-live", "--apply"])).toEqual({
      action: "run",
      mode: "go-live",
      apply: true,
    });
    expect(parseResetArgs(["--go-live", "--go-live"])).toEqual({
      action: "run",
      mode: "go-live",
      apply: false,
    });
  });

  it("prints usage instead of running when no mode is given, so the old Creem default can't run", () => {
    for (const args of [[], ["--apply"]]) {
      expect(parseResetArgs(args)).toEqual({
        action: "error",
        message: "Choose a mode: --paddle or --go-live.",
      });
    }
    expect(parseResetArgs(["--paddle", "--go-live", "--apply"])).toEqual({
      action: "error",
      message: "Choose one mode: --paddle or --go-live, not both.",
    });
  });

  it("rejects unknown flags", () => {
    for (const flag of [
      "--golive",
      "--creem",
      "--apply=true",
      "-a",
      "paddle",
      "constructor",
      "toString",
    ]) {
      expect(parseResetArgs(["--paddle", flag, "--apply"])).toEqual({
        action: "error",
        message: `Unknown option: ${flag}`,
      });
    }
    expect(parseResetArgs(["--Paddle", "--GO-LIVE"])).toEqual({
      action: "error",
      message: "Unknown option: --Paddle --GO-LIVE",
    });
  });

  it("shows help on --help or -h", () => {
    expect(parseResetArgs(["--help"])).toEqual({ action: "help" });
    expect(parseResetArgs(["--go-live", "-h", "--apply"])).toEqual({ action: "help" });
  });

  it("documents both modes and that --go-live --apply runs exactly once, before switching to live", () => {
    for (const text of [
      "--paddle ",
      "--paddle --apply",
      "--go-live ",
      "--go-live --apply",
      "Dry run",
      "20261120000100_reset_paddle_plans.sql",
      "Run it exactly once",
      "cancelling every Dodo test subscription",
      "before switching DODO_ENVIRONMENT to live",
      "Never run it after that",
      "trial usage back to zero (invite",
      "never emails",
    ]) {
      expect(RESET_USAGE).toContain(text);
    }
    expect(RESET_USAGE).not.toMatch(/creem/i);
  });
});
