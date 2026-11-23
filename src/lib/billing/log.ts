import { and, eq, type SQL } from "drizzle-orm";
import type { RowOf } from "@/db/columns";
import { billingLog } from "@/db/schema";

// billing_log holds three kinds of do-it-once record; these name each kind's columns as its own table once did.

export function eventKey(id: string): SQL | undefined {
  return and(eq(billingLog.kind, "event"), eq(billingLog.key, id));
}

export function eventRow(id: string, type: string, at: number) {
  return { kind: "event" as const, key: id, ref: type, at };
}

export function replacementKey(replacedSubscriptionId: string): SQL | undefined {
  return and(eq(billingLog.kind, "replacement"), eq(billingLog.key, replacedSubscriptionId));
}

export function replacementRow(r: {
  replacedSubscriptionId: string;
  subscriptionId: string;
  userId: string;
  createdAt: number;
}) {
  return {
    kind: "replacement" as const,
    key: r.replacedSubscriptionId,
    ref: r.subscriptionId,
    userId: r.userId,
    at: r.createdAt,
  };
}

export const REPLACEMENT = {
  replacedSubscriptionId: billingLog.key,
  subscriptionId: billingLog.ref,
  userId: billingLog.userId,
  attempts: billingLog.attempts,
  createdAt: billingLog.at,
  cancelledAt: billingLog.doneAt,
};

export type Replacement = RowOf<typeof REPLACEMENT>;

export function trialKey(emailHash: string): SQL | undefined {
  return and(eq(billingLog.kind, "trial"), eq(billingLog.key, emailHash));
}
