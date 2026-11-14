import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { trialReplacements, users } from "@/db/schema";
import { insertUserRow, resetDb } from "@/lib/auth/test-helpers";
import { resetCreemPlans } from "./creem-reset";

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

  it("treats an id with only one side in Paddle's format as a leftover", async () => {
    const mixed = await addUser("f@example.com", { ...PAID, billingCustomerId: CTM, billingSubscriptionId: "sub_Creem01" });
    const upper = await addUser("g@example.com", { ...PAID, billingCustomerId: CTM.toUpperCase() });
    expect(await resetCreemPlans(await getDb(), { apply: true })).toMatchObject({ users: 2, paidUsers: 2 });
    expect(await rowOf(mixed)).toMatchObject({ plan: "free" });
    expect(await rowOf(upper)).toMatchObject({ plan: "free" });
  });
});
