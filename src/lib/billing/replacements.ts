import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { billingEvents, trialReplacements } from "@/db/schema";
import { env } from "@/lib/env";
import { log } from "@/lib/log";
import { claimBillingEvent } from "./entitlements";
import { BillingError } from "./errors";
import {
  cancelPaddleSubscription,
  completedPaddleTransactions,
  getPaddleSubscription,
  refundPaddleTransaction,
} from "./paddle";

// A plan bought during the trial is its own subscription; the trial is cancelled once it's paid.

type Replacement = typeof trialReplacements.$inferSelect;

export async function settleReplacement(
  replacedSubscriptionId: string,
  now = Date.now(),
): Promise<boolean> {
  const db = await getDb();
  const [pending] = await db
    .select()
    .from(trialReplacements)
    .where(
      and(
        eq(trialReplacements.replacedSubscriptionId, replacedSubscriptionId),
        isNull(trialReplacements.cancelledAt),
      ),
    )
    .limit(1);
  return pending ? cancelReplaced(pending, now) : true;
}

export async function retryPendingReplacements({
  now,
  deadline,
  limit,
}: {
  now: number;
  deadline: number;
  limit: number;
}): Promise<number> {
  const db = await getDb();
  const pending = await db
    .select()
    .from(trialReplacements)
    .where(isNull(trialReplacements.cancelledAt))
    .orderBy(asc(trialReplacements.createdAt))
    .limit(limit);
  let cancelled = 0;
  for (const replacement of pending) {
    if (Date.now() >= deadline) break;
    if (await cancelReplaced(replacement, now)) cancelled += 1;
  }
  return cancelled;
}

async function cancelReplaced(replacement: Replacement, now: number): Promise<boolean> {
  const db = await getDb();
  const fields = {
    userId: replacement.userId,
    subscriptionId: replacement.replacedSubscriptionId,
    replacedBy: replacement.subscriptionId,
    attempt: replacement.attempts + 1,
    // A refused second trial is recorded as replaced by itself.
    reason:
      replacement.subscriptionId === replacement.replacedSubscriptionId
        ? "trial_reused"
        : "replaced",
  };
  const attempted = { attempts: sql`${trialReplacements.attempts} + 1` };
  const row = eq(trialReplacements.replacedSubscriptionId, replacement.replacedSubscriptionId);
  if (!env().PADDLE_API_KEY) {
    log.error("billing.replace_cancel_failed", new Error("PADDLE_API_KEY is not set"), fields);
    return false;
  }
  try {
    const result = await cancelTrial(replacement.replacedSubscriptionId);
    await db
      .update(trialReplacements)
      .set({ ...attempted, cancelledAt: now })
      .where(row);
    log.info("billing.replaced_trial_cancelled", { ...fields, result });
    if (fields.reason === "trial_reused") {
      await refundRefusedTrial(fields.subscriptionId, fields.userId, undefined, now);
    }
    return true;
  } catch (error) {
    if (!(error instanceof BillingError)) throw error;
    await db.update(trialReplacements).set(attempted).where(row);
    log.error("billing.replace_cancel_failed", error, fields);
    return false;
  }
}

async function cancelTrial(subscriptionId: string): Promise<"cancelled" | "already_ended"> {
  try {
    await cancelPaddleSubscription(subscriptionId, { immediately: true });
    return "cancelled";
  } catch (error) {
    if (!(error instanceof BillingError) || error.code !== "refused") throw error;
    // Paddle refuses to cancel a subscription that has already ended.
    const current = await getPaddleSubscription(subscriptionId);
    if (current.status === "canceled") return "already_ended";
    throw error;
  }
}

// Refunds each completed charge of a refused second trial once, whether the cancel or Paddle's
// transaction.completed gets there first; a failed refund frees its claim and is logged for a refund by hand.
export async function refundRefusedTrial(
  subscriptionId: string,
  userId: string,
  known?: readonly string[],
  now = Date.now(),
): Promise<number> {
  const fields = { userId, subscriptionId };
  let ids: readonly string[];
  try {
    ids = known ?? (await completedPaddleTransactions(subscriptionId));
  } catch (error) {
    log.error("billing.reused_trial_refund_failed", error, fields);
    return 0;
  }
  const db = await getDb();
  let refunded = 0;
  for (const transactionId of ids) {
    const claim = `refund:${transactionId}`;
    if (!(await claimBillingEvent(claim, "trial_refund", now))) continue;
    try {
      await refundPaddleTransaction(transactionId);
      refunded += 1;
      log.info("billing.reused_trial_refunded", { ...fields, transactionId });
    } catch (error) {
      await db.delete(billingEvents).where(eq(billingEvents.id, claim));
      log.error("billing.reused_trial_refund_failed", error, { ...fields, transactionId });
    }
  }
  return refunded;
}

export async function isRefusedTrial(subscriptionId: string): Promise<string | null> {
  const db = await getDb();
  const [row] = await db
    .select({ userId: trialReplacements.userId, by: trialReplacements.subscriptionId })
    .from(trialReplacements)
    .where(eq(trialReplacements.replacedSubscriptionId, subscriptionId))
    .limit(1);
  return row && row.by === subscriptionId ? row.userId : null;
}
