import { randomUUID } from "node:crypto";
import { and, asc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import {
  BILLING_INTERVALS,
  PAID_PLANS,
  type BillingInterval,
  type PaidPlanId,
} from "@/config/plans";
import { getDb, type Tx } from "@/db/client";
import { lockUser } from "@/db/locks";
import { billingLog } from "@/db/schema";
import { DAY_MS } from "@/lib/time";
import { eventRow } from "./log";

// A plan change and its charge arrive as separate events in either order; the second pairs them.

export type PlanChange = { from_plan: PaidPlanId; to_plan: PaidPlanId; interval: BillingInterval };

export type ChangeCharge =
  { outcome: "charged"; cents: number | null } | { outcome: "uncharged" } | { outcome: "waiting" };

export type ChargeMatch =
  | { outcome: "matched"; change: PlanChange }
  | { outcome: "waiting" }
  | { outcome: "duplicate" }
  | { outcome: "no_user" };

export const UNCHARGED: ChangeCharge = { outcome: "uncharged" };

const MAX_KEY_CHARS = 200;
// Dodo redelivers for about 27 hours, so a half left open longer never pairs with a later change.
const PAIR_WINDOW_MS = 2 * DAY_MS;
const CENTS = /^\d{1,9}$/;

const chargePrefix = (subscriptionId: string) => `plan_change_charge:${subscriptionId}:`;
const changePrefix = (subscriptionId: string) => `plan_change:${subscriptionId}:`;

function changeRef({ from_plan, to_plan, interval }: PlanChange): string {
  return `${from_plan}>${to_plan}:${interval}`;
}

function changeOf(ref: string): PlanChange | null {
  const [plans = "", period] = ref.split(":");
  const [from, to] = plans.split(">");
  const from_plan = PAID_PLANS.find((plan) => plan === from);
  const to_plan = PAID_PLANS.find((plan) => plan === to);
  const interval = BILLING_INTERVALS.find((candidate) => candidate === period);
  return from_plan && to_plan && interval ? { from_plan, to_plan, interval } : null;
}

async function oldestOpen(tx: Tx, prefix: string, now: number) {
  const [row] = await tx
    .select({ key: billingLog.key, ref: billingLog.ref })
    .from(billingLog)
    .where(
      and(
        eq(billingLog.kind, "event"),
        sql`starts_with(${billingLog.key}, ${prefix})`,
        isNull(billingLog.doneAt),
        gte(billingLog.at, now - PAIR_WINDOW_MS),
      ),
    )
    .orderBy(asc(billingLog.at), asc(billingLog.key))
    .limit(1);
  return row ?? null;
}

async function close(tx: Tx, keys: string[], now: number): Promise<void> {
  await tx
    .update(billingLog)
    .set({ doneAt: now })
    .where(and(eq(billingLog.kind, "event"), inArray(billingLog.key, keys)));
}

// From the subscription event: takes a charge already in, or waits for one when the change should bring one.
export async function chargeForChange(
  input: { userId: string; subscriptionId: string; change: PlanChange; charges: boolean },
  now = Date.now(),
): Promise<ChangeCharge> {
  const key = `${changePrefix(input.subscriptionId)}${randomUUID()}`;
  if (key.length > MAX_KEY_CHARS) return UNCHARGED;
  const db = await getDb();
  return db.transaction(async (tx): Promise<ChangeCharge> => {
    if (!(await lockUser(tx, input.userId))) return UNCHARGED;
    const charge = await oldestOpen(tx, chargePrefix(input.subscriptionId), now);
    if (charge) {
      await close(tx, [charge.key], now);
      return { outcome: "charged", cents: CENTS.test(charge.ref) ? Number(charge.ref) : null };
    }
    if (!input.charges) return UNCHARGED;
    await tx.insert(billingLog).values(eventRow(key, changeRef(input.change), now));
    return { outcome: "waiting" };
  });
}

// From the payment: once per payment, it completes a change already applied or waits for it.
export async function changeForCharge(
  input: { userId: string; subscriptionId: string; paymentId: string; cents: number | null },
  now = Date.now(),
): Promise<ChargeMatch> {
  const key = `${chargePrefix(input.subscriptionId)}${input.paymentId}`;
  if (key.length > MAX_KEY_CHARS) return { outcome: "waiting" };
  const db = await getDb();
  return db.transaction(async (tx): Promise<ChargeMatch> => {
    if (!(await lockUser(tx, input.userId))) return { outcome: "no_user" };
    const claimed = await tx
      .insert(billingLog)
      .values(eventRow(key, input.cents === null ? "" : String(input.cents), now))
      .onConflictDoNothing()
      .returning({ key: billingLog.key });
    if (claimed.length === 0) return { outcome: "duplicate" };
    const open = await oldestOpen(tx, changePrefix(input.subscriptionId), now);
    if (!open) return { outcome: "waiting" };
    await close(tx, [open.key, key], now);
    const change = changeOf(open.ref);
    return change ? { outcome: "matched", change } : { outcome: "waiting" };
  });
}
