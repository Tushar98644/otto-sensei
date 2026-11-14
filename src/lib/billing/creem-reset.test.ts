import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { trialReplacements, users } from "@/db/schema";
import { insertUserRow, resetDb } from "@/lib/auth/test-helpers";
import { parseResetArgs, resetCreemPlans, RESET_USAGE } from "./creem-reset";

const CTM = `ctm_${"a1".repeat(13)}`;
const SUB = `sub_${"b2".repeat(13)}`;
const NOW = Date.UTC(2026, 10, 14);

const PAID = {
  plan: "pro" as const,
  planInterval: "month" as const,
  planStatus: "active",
  planRenewsAt: NOW + 1,
  planPeriodStartsAt: NOW - 1,
  planPeriodEndsAt: NOW + 1,
};

async function addUser(email: string, row: Partial<typeof users.$inferInsert> = {}): Promise<string> {
  const id = crypto.randomUUID();
  await insertUserRow({ id, email, plan: "free", createdAt: 1, updatedAt: 1, ...row });
  return id;
}

async function rowOf(id: string) {
  const [row] = await (await getDb()).select().from(users).where(eq(users.id, id));
  return row;
}

beforeEach(async () => {
  await resetDb();
});

describe("resetCreemPlans", () => {
  it("counts Creem leftovers without changing anything, then frees them with --apply", async () => {
    const creemPaid = await addUser("a@example.com", {
      ...PAID,
      planStatus: "trialing",
      trialEndsAt: NOW + 1,
      billingCustomerId: "cust_3kKw0VQ8bY1lN3m9",
      billingSubscriptionId: "sub_7Hq2LmPz9XcV4bN1",
      billingEventAt: NOW - 1,
    });
    const creemFree = await addUser("b@example.com", {
      planStatus: "canceled",
      billingCustomerId: "cust_old",
      billingSubscriptionId: "sub_old",
    });
    const paddlePaid = await addUser("c@example.com", { ...PAID, billingCustomerId: CTM, billingSubscriptionId: SUB });
    const mock = await addUser("d@example.com", { ...PAID, planStatus: "mock_active" });
    const never = await addUser("e@example.com");
    const db = await getDb();
    await db.insert(trialReplacements).values([
      { replacedSubscriptionId: "sub_creem_trial", subscriptionId: "sub_creem_max", userId: creemPaid, createdAt: 1 },
      { replacedSubscriptionId: SUB, subscriptionId: `sub_${"c3".repeat(13)}`, userId: paddlePaid, createdAt: 1 },
    ]);

    const counts = { users: 2, paidUsers: 1, trialReplacements: 1 };
    expect(await resetCreemPlans(db, { apply: false })).toEqual(counts);
    expect(await rowOf(creemPaid)).toMatchObject({ plan: "pro", billingCustomerId: "cust_3kKw0VQ8bY1lN3m9" });
    expect(await db.select().from(trialReplacements)).toHaveLength(2);

    expect(await resetCreemPlans(db, { apply: true, now: NOW })).toEqual(counts);
    for (const id of [creemPaid, creemFree]) {
      expect(await rowOf(id)).toMatchObject({
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
      });
    }
    expect(await rowOf(paddlePaid)).toMatchObject({ plan: "pro", billingCustomerId: CTM, billingSubscriptionId: SUB });
    expect(await rowOf(mock)).toMatchObject({ plan: "pro", planStatus: "mock_active" });
    expect(await rowOf(never)).toMatchObject({ plan: "free", updatedAt: 1 });
    expect((await db.select().from(trialReplacements)).map((row) => row.replacedSubscriptionId)).toEqual([SUB]);

    expect(await resetCreemPlans(db, { apply: true })).toEqual({ users: 0, paidUsers: 0, trialReplacements: 0 });
  });

  it("leaves Paddle ids alone unless asked to go live", async () => {
    const paddlePaid = await addUser("h@example.com", { ...PAID, billingCustomerId: CTM, billingSubscriptionId: SUB });
    expect(await resetCreemPlans(await getDb(), { apply: true, goLive: false })).toMatchObject({ users: 0 });
    expect(await rowOf(paddlePaid)).toMatchObject({ plan: "pro", billingSubscriptionId: SUB });
  });

  it("treats an id with only one side in Paddle's format as a leftover", async () => {
    const mixed = await addUser("f@example.com", { ...PAID, billingCustomerId: CTM, billingSubscriptionId: "sub_Creem01" });
    const upper = await addUser("g@example.com", { ...PAID, billingCustomerId: CTM.toUpperCase() });
    expect(await resetCreemPlans(await getDb(), { apply: true })).toMatchObject({ users: 2, paidUsers: 2 });
    expect(await rowOf(mixed)).toMatchObject({ plan: "free" });
    expect(await rowOf(upper)).toMatchObject({ plan: "free" });
  });
});

describe("resetCreemPlans before going live", () => {
  it("counts every account with billing state, sandbox Paddle ids included, then frees them all with --apply", async () => {
    const sandboxPaid = await addUser("a@example.com", {
      ...PAID,
      billingCustomerId: CTM,
      billingSubscriptionId: SUB,
      billingEventAt: NOW - 1,
    });
    const sandboxTrial = await addUser("b@example.com", {
      ...PAID,
      planStatus: "trialing",
      trialEndsAt: NOW + 1,
      billingCustomerId: `ctm_${"d4".repeat(13)}`,
      billingSubscriptionId: `sub_${"e5".repeat(13)}`,
    });
    const sandboxEnded = await addUser("c@example.com", {
      planStatus: "canceled",
      billingCustomerId: `ctm_${"f6".repeat(13)}`,
      billingSubscriptionId: `sub_${"a7".repeat(13)}`,
    });
    const customerOnly = await addUser("d@example.com", { billingCustomerId: `ctm_${"b8".repeat(13)}` });
    const creem = await addUser("e@example.com", { ...PAID, billingCustomerId: "cust_old", billingSubscriptionId: "sub_old" });
    const mock = await addUser("f@example.com", { ...PAID, planStatus: "mock_trialing", trialEndsAt: NOW + 1 });
    const never = await addUser("g@example.com");
    const db = await getDb();
    await db.insert(trialReplacements).values([
      { replacedSubscriptionId: `sub_${"e5".repeat(13)}`, subscriptionId: `sub_${"c9".repeat(13)}`, userId: sandboxTrial, createdAt: 1 },
      { replacedSubscriptionId: "sub_creem_trial", subscriptionId: "sub_creem_max", userId: creem, createdAt: 1 },
    ]);

    const counts = { users: 5, paidUsers: 3, trialReplacements: 2 };
    expect(await resetCreemPlans(db, { apply: false, goLive: true })).toEqual(counts);
    expect(await rowOf(sandboxPaid)).toMatchObject({ plan: "pro", billingSubscriptionId: SUB });
    expect(await db.select().from(trialReplacements)).toHaveLength(2);

    expect(await resetCreemPlans(db, { apply: true, goLive: true, now: NOW })).toEqual(counts);
    for (const id of [sandboxPaid, sandboxTrial, sandboxEnded, customerOnly, creem]) {
      expect(await rowOf(id)).toMatchObject({
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
      });
    }
    expect(await rowOf(mock)).toMatchObject({ plan: "pro", planStatus: "mock_trialing", trialEndsAt: NOW + 1 });
    expect(await rowOf(never)).toMatchObject({ plan: "free", updatedAt: 1 });
    expect(await db.select().from(trialReplacements)).toEqual([]);

    expect(await resetCreemPlans(db, { apply: true, goLive: true })).toEqual({
      users: 0,
      paidUsers: 0,
      trialReplacements: 0,
    });
  });
});

describe("parseResetArgs", () => {
  it("is a dry run of the Creem reset unless told otherwise, in any order", () => {
    expect(parseResetArgs([])).toEqual({ apply: false, goLive: false, unknown: [] });
    expect(parseResetArgs(["--apply"])).toEqual({ apply: true, goLive: false, unknown: [] });
    expect(parseResetArgs(["--go-live"])).toEqual({ apply: false, goLive: true, unknown: [] });
    expect(parseResetArgs(["--apply", "--go-live"])).toEqual({ apply: true, goLive: true, unknown: [] });
    expect(parseResetArgs(["--golive", "--apply"])).toEqual({ apply: true, goLive: false, unknown: ["--golive"] });
  });

  it("documents both modes, dry run and apply", () => {
    for (const text of ["(no flags)", "--apply", "--go-live", "--go-live --apply", "Dry run", "sandbox", "Never run it once production is on live"]) {
      expect(RESET_USAGE).toContain(text);
    }
  });
});
