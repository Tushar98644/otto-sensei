import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { billingLog } from "@/db/schema";
import { REPLACEMENT } from "./log";

// billing_log read and written in the shapes of the three tables it replaced, for tests.

export async function eventRows() {
  return (await getDb())
    .select({ id: billingLog.key, type: billingLog.ref, receivedAt: billingLog.at })
    .from(billingLog)
    .where(eq(billingLog.kind, "event"))
    .orderBy(asc(billingLog.at), asc(billingLog.key));
}

export async function trialRows() {
  return (await getDb())
    .select({ emailHash: billingLog.key, kind: billingLog.ref, createdAt: billingLog.at })
    .from(billingLog)
    .where(eq(billingLog.kind, "trial"));
}

export async function replacementRows() {
  return (await getDb())
    .select(REPLACEMENT)
    .from(billingLog)
    .where(eq(billingLog.kind, "replacement"))
    .orderBy(asc(billingLog.at), asc(billingLog.key));
}

export async function addTrialHistory(row: {
  emailHash: string;
  kind: "trial" | "paid";
  createdAt: number;
}) {
  await (
    await getDb()
  )
    .insert(billingLog)
    .values({ kind: "trial", key: row.emailHash, ref: row.kind, at: row.createdAt });
}
