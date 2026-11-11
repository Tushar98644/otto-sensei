import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { trialReplacements } from "@/db/schema";
import { env } from "@/lib/env";
import { log } from "@/lib/log";
import { cancelCreemSubscription } from "./creem";
import { BillingError } from "./errors";

// Creem won't change a trialing subscription's product, so another plan is its own checkout.

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
  };
  const attempted = { attempts: sql`${trialReplacements.attempts} + 1` };
  const row = eq(trialReplacements.replacedSubscriptionId, replacement.replacedSubscriptionId);
  if (!env().CREEM_API_KEY) {
    log.error("billing.replace_cancel_failed", new Error("CREEM_API_KEY is not set"), fields);
    return false;
  }
  try {
    const result = await cancelCreemSubscription(replacement.replacedSubscriptionId);
    await db
      .update(trialReplacements)
      .set({ ...attempted, cancelledAt: now })
      .where(row);
    log.info("billing.replaced_trial_cancelled", { ...fields, result });
    return true;
  } catch (error) {
    if (!(error instanceof BillingError)) throw error;
    await db.update(trialReplacements).set(attempted).where(row);
    log.error("billing.replace_cancel_failed", error, fields);
    return false;
  }
}
