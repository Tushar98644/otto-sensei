import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { billingLog } from "@/db/schema";
import { env } from "@/lib/env";
import { log } from "@/lib/log";
import { cancelSubscription, getSubscription, refundPayment, succeededPayments } from "./dodo";
import { internalStatus } from "./dodo-status";
import { claimBillingEvent, isLiveStatus } from "./entitlements";
import { BillingError } from "./errors";
import { eventKey, REPLACEMENT, replacementKey, type Replacement } from "./log";

// A refused second trial, or a trial a separately bought plan replaced, is cancelled here; the cron retries.

export async function settleReplacement(
  replacedSubscriptionId: string,
  now = Date.now(),
): Promise<boolean> {
  const db = await getDb();
  const [pending] = await db
    .select(REPLACEMENT)
    .from(billingLog)
    .where(and(replacementKey(replacedSubscriptionId), isNull(billingLog.doneAt)))
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
    .select(REPLACEMENT)
    .from(billingLog)
    .where(and(eq(billingLog.kind, "replacement"), isNull(billingLog.doneAt)))
    .orderBy(asc(billingLog.at))
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
  const attempted = { attempts: sql`${billingLog.attempts} + 1` };
  const row = replacementKey(replacement.replacedSubscriptionId);
  if (!env().DODO_API_KEY) {
    log.error("billing.replace_cancel_failed", new Error("DODO_API_KEY is not set"), fields);
    return false;
  }
  try {
    const result = await cancelTrial(replacement.replacedSubscriptionId);
    await db
      .update(billingLog)
      .set({ ...attempted, doneAt: now })
      .where(row);
    log.info("billing.replaced_trial_cancelled", { ...fields, result });
    if (fields.reason === "trial_reused") {
      await refundRefusedTrial(fields.subscriptionId, fields.userId, undefined, now);
    }
    return true;
  } catch (error) {
    if (!(error instanceof BillingError)) throw error;
    await db.update(billingLog).set(attempted).where(row);
    log.error("billing.replace_cancel_failed", error, fields);
    return false;
  }
}

async function cancelTrial(subscriptionId: string): Promise<"cancelled" | "already_ended"> {
  try {
    return await cancelSubscription(subscriptionId, { immediately: true });
  } catch (error) {
    if (!(error instanceof BillingError) || error.code !== "refused") throw error;
    // Dodo refuses to cancel a subscription that has already ended.
    const current = await getSubscription(subscriptionId);
    if (internalStatus(current) === "canceled" || current.status === "failed")
      return "already_ended";
    throw error;
  }
}

// Refunds each succeeded charge of a refused second trial once, whether the cancel or Dodo's
// payment.succeeded gets there first; a failed refund frees its claim and is logged for a refund by hand.
export async function refundRefusedTrial(
  subscriptionId: string,
  userId: string | null,
  known?: readonly string[],
  now = Date.now(),
): Promise<number> {
  const fields = { userId, subscriptionId };
  let ids: readonly string[];
  try {
    ids = known ?? (await succeededPayments(subscriptionId));
  } catch (error) {
    log.error("billing.reused_trial_refund_failed", error, fields);
    return 0;
  }
  const db = await getDb();
  let refunded = 0;
  for (const paymentId of ids) {
    const claim = `refund:${paymentId}`;
    if (!(await claimBillingEvent(claim, "trial_refund", now))) continue;
    try {
      // Already refunded, or a refund under way, keeps the claim: asking again would add nothing.
      const outcome = await refundPayment(paymentId);
      if (outcome === "refunded") refunded += 1;
      log.info("billing.reused_trial_refunded", { ...fields, paymentId, outcome });
    } catch (error) {
      await db.delete(billingLog).where(eventKey(claim));
      log.error("billing.reused_trial_refund_failed", error, { ...fields, paymentId });
    }
  }
  return refunded;
}

export type OrphanOutcome = "cancelled" | "rechecked" | "kept";

const orphanKey = (subscriptionId: string) => `orphan:${subscriptionId}`;

// Replacement rows go with the account, so an event key marks the ones cancelled here.
export async function settleOrphan(
  subscriptionId: string,
  userId: string | null,
  now = Date.now(),
): Promise<OrphanOutcome> {
  const status = internalStatus(await getSubscription(subscriptionId));
  const chargeable = status !== null && status !== "scheduled_cancel" && isLiveStatus(status);
  // One that ended or is set to end without us, as after the deletion's own cancel, keeps its charges.
  if (!chargeable && !(await isOrphan(subscriptionId))) return "kept";
  if (chargeable) {
    await claimBillingEvent(orphanKey(subscriptionId), "orphan_subscription", now);
    await cancelTrial(subscriptionId);
  }
  await refundRefusedTrial(subscriptionId, userId, undefined, now);
  return chargeable ? "cancelled" : "rechecked";
}

export async function isOrphan(subscriptionId: string): Promise<boolean> {
  const db = await getDb();
  const [row] = await db
    .select({ id: billingLog.key })
    .from(billingLog)
    .where(eventKey(orphanKey(subscriptionId)))
    .limit(1);
  return row !== undefined;
}

export async function isRefusedTrial(subscriptionId: string): Promise<string | null> {
  const db = await getDb();
  const [row] = await db
    .select({ userId: billingLog.userId, by: billingLog.ref })
    .from(billingLog)
    .where(replacementKey(subscriptionId))
    .limit(1);
  return row && row.by === subscriptionId ? row.userId : null;
}
