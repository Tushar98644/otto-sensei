import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { createUser, resetDb } from "@/lib/auth/test-helpers";
import type { SessionUser } from "@/lib/auth/types";
import type { BillingMode } from "@/lib/billing";
import { mePayload } from "./payload";

const mocks = vi.hoisted(() => ({ mode: "dodo" as BillingMode }));

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);
vi.mock("@/lib/billing", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/billing")>()),
  billingMode: () => mocks.mode,
}));

const DODO_CUSTOMER = "cus_0NWiGwsPBGrtsd7ZL3DJM";
const DODO_SUBSCRIPTION = "sub_0NWiGwsPBGrtsd7ZL3DJN";
const PADDLE_CUSTOMER = "ctm_01hv8x2a7b9c3d4e5f6g7h8j9k";
const TRIAL_END = Date.UTC(2026, 10, 23);

async function userWith(fields: Partial<typeof users.$inferInsert>): Promise<SessionUser> {
  const user = await createUser("ada@example.com");
  await (await getDb()).update(users).set(fields).where(eq(users.id, user.id));
  return { ...user, plan: fields.plan ?? user.plan, trialEndsAt: fields.trialEndsAt ?? null };
}

async function flags(user: SessionUser | null) {
  const { billing } = await mePayload(user);
  return { paymentIssue: billing.paymentIssue, cancelScheduled: billing.cancelScheduled };
}

const NEITHER = { paymentIssue: false, cancelScheduled: false };

beforeEach(async () => {
  await resetDb();
  mocks.mode = "dodo";
});

describe("mePayload billing hold flags", () => {
  it("flags a payment issue for a Dodo customer on hold, who is on Free until the card is fixed", async () => {
    const user = await userWith({
      plan: "free",
      planStatus: "on_hold",
      billingCustomerId: DODO_CUSTOMER,
      billingSubscriptionId: DODO_SUBSCRIPTION,
    });
    expect(await flags(user)).toEqual({ paymentIssue: true, cancelScheduled: false });
  });

  it("flags a scheduled cancel, on a trial or on a paid plan", async () => {
    const trial = await userWith({
      plan: "pro",
      planInterval: "month",
      planStatus: "scheduled_cancel",
      trialEndsAt: TRIAL_END,
      billingCustomerId: DODO_CUSTOMER,
      billingSubscriptionId: DODO_SUBSCRIPTION,
    });
    expect(await flags(trial)).toEqual({ paymentIssue: false, cancelScheduled: true });

    await resetDb();
    const paid = await userWith({
      plan: "pro",
      planInterval: "month",
      planStatus: "scheduled_cancel",
      billingCustomerId: DODO_CUSTOMER,
    });
    expect(await flags(paid)).toEqual({ paymentIssue: false, cancelScheduled: true });
  });

  it("leaves both off for a live plan, a plain Free user and a signed-out visitor", async () => {
    expect(await flags(null)).toEqual(NEITHER);
    expect(await flags(await userWith({ plan: "free" }))).toEqual(NEITHER);

    await resetDb();
    const active = await userWith({
      plan: "max",
      planInterval: "month",
      planStatus: "active",
      billingCustomerId: DODO_CUSTOMER,
    });
    expect(await flags(active)).toEqual(NEITHER);
  });

  it("leaves both off without a Dodo customer, since Manage billing can't open for them", async () => {
    const onHold = await userWith({
      plan: "free",
      planStatus: "on_hold",
      billingCustomerId: PADDLE_CUSTOMER,
    });
    expect(await flags(onHold)).toEqual(NEITHER);

    await resetDb();
    const ending = await userWith({ plan: "pro", planStatus: "scheduled_cancel" });
    expect(await flags(ending)).toEqual(NEITHER);
  });

  it("leaves both off in test mode and with billing switched off", async () => {
    const user = await userWith({
      plan: "free",
      planStatus: "on_hold",
      billingCustomerId: DODO_CUSTOMER,
    });
    mocks.mode = "mock";
    expect(await flags(user)).toEqual(NEITHER);
    mocks.mode = "disabled";
    expect(await flags(user)).toEqual(NEITHER);
  });
});
