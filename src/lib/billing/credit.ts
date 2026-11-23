import { randomBytes, randomUUID } from "node:crypto";
import { and, desc, eq, gt, gte, inArray, isNull, sql } from "drizzle-orm";
import { FEATURES, isPaidPlan, isTrialing, type Feature } from "@/config/plans";
import { TOPUP_LIMITS } from "@/config/topup";
import { getDb, type Tx } from "@/db/client";
import { lockUser } from "@/db/locks";
import { billingLog, users } from "@/db/schema";
import type { CreditInfo } from "@/lib/api/types";
import type { SessionUser } from "@/lib/auth/types";
import { HOUR_MS } from "@/lib/time";
import { resolvePeriod } from "@/lib/usage";
import type { CreditEntry } from "./credit-types";
import { creditOffered } from "./intervals";

// An unpaid checkout counts toward the balance cap this long, so parallel checkouts can't pass it.
const PENDING_MS = HOUR_MS;
export const MAX_BALANCE_CENTS = TOPUP_LIMITS.maxBalanceUsd * 100;
const ACTIVITY_ROWS = 500;
const ACTIVITY_SHOWN = 30;

const { kind, key, userId: owner, ref, cents: amount, at, doneAt } = billingLog;

// Free and the trial can't buy or spend credit; a balance waits for a paid plan.
export function creditUsable(user: Pick<SessionUser, "plan" | "trialEndsAt">): boolean {
  return creditOffered() && isPaidPlan(user.plan) && !isTrialing(user);
}

// monthCents: credit bought since this allowance period began, to tell a busy Pro month that Max is cheaper.
export async function creditState(user: SessionUser, now = Date.now()): Promise<CreditInfo> {
  const db = await getDb();
  const since = resolvePeriod(user, now, { quiet: true }).startsAt ?? now;
  const [[account], [month]] = await Promise.all([
    db.select({ cents: users.creditCents }).from(users).where(eq(users.id, user.id)).limit(1),
    db
      .select({ cents: sql<number>`coalesce(sum(${amount}), 0)::int` })
      .from(billingLog)
      .where(and(eq(owner, user.id), eq(kind, "topup"), gte(at, since))),
  ]);
  return {
    balanceCents: account?.cents ?? 0,
    monthCents: Number(month?.cents ?? 0),
    usable: creditUsable(user),
  };
}

const utcDay = (ms: number) => Math.floor(ms / 86_400_000);

// Newest first; spends add up by day and feature, so a busy day of line fixes is one line.
export async function creditActivity(userId: string): Promise<CreditEntry[]> {
  const db = await getDb();
  const rows = await db
    .select({ kind, ref, cents: amount, at })
    .from(billingLog)
    .where(and(eq(owner, userId), inArray(kind, ["topup", "topup_back", "credit_spend"])))
    .orderBy(desc(at))
    .limit(ACTIVITY_ROWS);
  const entries: CreditEntry[] = [];
  const days = new Map<string, CreditEntry>();
  for (const row of rows) {
    const cents = row.cents ?? 0;
    if (row.kind !== "credit_spend") {
      const entryKind = row.kind === "topup" ? "added" : "taken_back";
      entries.push({ at: row.at, kind: entryKind, cents, feature: null, count: 1 });
      continue;
    }
    const feature = FEATURES.find((candidate) => candidate === row.ref) ?? null;
    const day = `${utcDay(row.at)}:${feature}`;
    const same = days.get(day);
    if (same) {
      same.cents += cents;
      same.count += 1;
      continue;
    }
    const entry: CreditEntry = { at: row.at, kind: "spent", cents, feature, count: 1 };
    days.set(day, entry);
    entries.push(entry);
  }
  return entries.slice(0, ACTIVITY_SHOWN);
}

export type TopupStart =
  { ok: true; id: string } | { ok: false; reason: "over_cap" | "no_user"; roomCents: number };

// Our own record of the checkout, written before Dodo's: the webhook credits only what it names.
export async function startTopup(
  userId: string,
  cents: number,
  now = Date.now(),
): Promise<TopupStart> {
  const db = await getDb();
  return db.transaction(async (tx): Promise<TopupStart> => {
    if (!(await lockUser(tx, userId))) return { ok: false, reason: "no_user", roomCents: 0 };
    const [[account], [pending]] = await Promise.all([
      tx.select({ cents: users.creditCents }).from(users).where(eq(users.id, userId)),
      tx
        .select({ cents: sql<number>`coalesce(sum(${amount}), 0)::int` })
        .from(billingLog)
        .where(
          and(
            eq(owner, userId),
            eq(kind, "topup_checkout"),
            isNull(doneAt),
            gt(at, now - PENDING_MS),
          ),
        ),
    ]);
    const room = MAX_BALANCE_CENTS - (account?.cents ?? 0) - Number(pending?.cents ?? 0);
    if (cents > room) return { ok: false, reason: "over_cap", roomCents: Math.max(0, room) };
    const id = randomUUID();
    await tx
      .insert(billingLog)
      .values({ kind: "topup_checkout", key: id, userId, ref: "", cents, at: now });
    return { ok: true, id };
  });
}

export async function attachCheckoutSession(id: string, sessionId: string): Promise<void> {
  const db = await getDb();
  await db
    .update(billingLog)
    .set({ ref: sessionId })
    .where(and(eq(kind, "topup_checkout"), eq(key, id)));
}

export async function dropTopup(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(billingLog).where(and(eq(kind, "topup_checkout"), eq(key, id), isNull(doneAt)));
}

export type TopupCheckout = {
  id: string;
  userId: string;
  cents: number;
  sessionId: string | null;
};

export async function findTopupCheckout(id: string): Promise<TopupCheckout | null> {
  const db = await getDb();
  const [row] = await db
    .select({ userId: owner, cents: amount, sessionId: ref })
    .from(billingLog)
    .where(and(eq(kind, "topup_checkout"), eq(key, id)))
    .limit(1);
  if (!row?.userId || row.cents === null) return null;
  return { id, userId: row.userId, cents: row.cents, sessionId: row.sessionId || null };
}

// What the payment charged, tax included, as the topup row's ref keeps it for partial refunds.
export function chargedRef(totalMinor: number, currency: string): string {
  return `${totalMinor} ${currency.toUpperCase()}`;
}

function parseCharged(value: string): { minor: number; currency: string } | null {
  const match = /^(\d{1,12}) ([A-Z]{3})$/.exec(value);
  return match ? { minor: Number(match[1]), currency: match[2] ?? "" } : null;
}

export type TopupCredit = {
  checkoutId: string;
  userId: string;
  paymentId: string;
  cents: number;
  charged: string;
};

export type CreditOutcome =
  | { outcome: "credited"; balanceCents: number }
  | { outcome: "duplicate" | "already_paid" | "no_user" };

// Once per payment id, and once per checkout, under the user's lock.
export async function creditTopup(input: TopupCredit, now = Date.now()): Promise<CreditOutcome> {
  const db = await getDb();
  return db.transaction(async (tx): Promise<CreditOutcome> => {
    if (!(await lockUser(tx, input.userId))) return { outcome: "no_user" };
    const [seen] = await tx
      .select({ key })
      .from(billingLog)
      .where(and(eq(kind, "topup"), eq(key, input.paymentId)))
      .limit(1);
    if (seen) return { outcome: "duplicate" };
    const paid = await tx
      .update(billingLog)
      .set({ doneAt: now })
      .where(
        and(
          eq(kind, "topup_checkout"),
          eq(key, input.checkoutId),
          eq(owner, input.userId),
          isNull(doneAt),
        ),
      )
      .returning({ key });
    if (paid.length === 0) return { outcome: "already_paid" };
    await tx.insert(billingLog).values({
      kind: "topup",
      key: input.paymentId,
      userId: input.userId,
      ref: input.charged,
      cents: input.cents,
      at: now,
    });
    const [row] = await tx
      .update(users)
      .set({ creditCents: sql`${users.creditCents} + ${input.cents}` })
      .where(eq(users.id, input.userId))
      .returning({ cents: users.creditCents });
    return { outcome: "credited", balanceCents: row?.cents ?? input.cents };
  });
}

// Mock billing's "payment": the same pending record and credit a Dodo payment goes through.
export async function mockTopup(
  user: SessionUser,
  usd: number,
  now = Date.now(),
): Promise<Extract<TopupStart, { ok: false }> | CreditOutcome> {
  const cents = usd * 100;
  const started = await startTopup(user.id, cents, now);
  if (!started.ok) return started;
  return creditTopup(
    {
      checkoutId: started.id,
      userId: user.id,
      paymentId: `pay_mock${randomBytes(10).toString("hex")}`,
      cents,
      charged: chargedRef(cents, "USD"),
    },
    now,
  );
}

export type TakeBack = {
  paymentId: string;
  key: string;
  share: "all" | { amount: number; currency: string | null };
};

export type TakeBackOutcome =
  | {
      outcome: "taken";
      userId: string;
      wantedCents: number;
      removedCents: number;
      balanceCents: number;
    }
  | { outcome: "duplicate" | "not_topup" };

function shareCents(credited: number, charged: string, share: TakeBack["share"]): number {
  if (share === "all") return credited;
  const paid = parseCharged(charged);
  const sameCurrency = !share.currency || share.currency.toUpperCase() === paid?.currency;
  // A refund we can't weigh against the charge takes the whole credit back.
  if (!paid || paid.minor <= 0 || !sameCurrency || !Number.isFinite(share.amount)) return credited;
  return Math.min(credited, Math.max(0, Math.round((credited * share.amount) / paid.minor)));
}

// A refund or lost dispute takes its share of the credit back once, never below a zero balance.
export async function takeBackTopup(input: TakeBack, now = Date.now()): Promise<TakeBackOutcome> {
  const db = await getDb();
  const [purchase] = await db
    .select({ userId: owner, cents: amount, charged: ref })
    .from(billingLog)
    .where(and(eq(kind, "topup"), eq(key, input.paymentId)))
    .limit(1);
  const buyer = purchase?.userId;
  if (!buyer || purchase.cents === null) return { outcome: "not_topup" };
  const credited = purchase.cents;
  return db.transaction(async (tx): Promise<TakeBackOutcome> => {
    if (!(await lockUser(tx, buyer))) return { outcome: "not_topup" };
    const backs = await tx
      .select({ key, cents: amount })
      .from(billingLog)
      .where(and(eq(owner, buyer), eq(kind, "topup_back"), eq(ref, input.paymentId)));
    if (backs.some((back) => back.key === input.key)) return { outcome: "duplicate" };
    const already = backs.reduce((total, back) => total + (back.cents ?? 0), 0);
    const wanted = Math.min(
      Math.max(0, credited - already),
      shareCents(credited, purchase.charged, input.share),
    );
    await tx.insert(billingLog).values({
      kind: "topup_back",
      key: input.key,
      userId: buyer,
      ref: input.paymentId,
      cents: wanted,
      at: now,
    });
    const [before] = await tx
      .select({ cents: users.creditCents })
      .from(users)
      .where(eq(users.id, buyer));
    const [after] = await tx
      .update(users)
      .set({ creditCents: sql`greatest(0, ${users.creditCents} - ${wanted})` })
      .where(eq(users.id, buyer))
      .returning({ cents: users.creditCents });
    if (already + wanted >= credited) {
      await tx
        .update(billingLog)
        .set({ doneAt: now })
        .where(and(eq(kind, "topup"), eq(key, input.paymentId)));
    }
    const balance = after?.cents ?? 0;
    return {
      outcome: "taken",
      userId: buyer,
      wantedCents: wanted,
      removedCents: Math.max(0, (before?.cents ?? 0) - balance),
      balanceCents: balance,
    };
  });
}

export type CreditCharge = { key: string; cents: number; balanceCents: number };

// Under the user's lock, the allowance is tried once more first, so a unit given back meanwhile goes before credit.
export async function spendCredit(
  userId: string,
  feature: Feature,
  cents: number,
  now: number,
  allowance: ((tx: Tx) => Promise<boolean>) | null,
): Promise<"allowance" | CreditCharge | null> {
  const db = await getDb();
  return db.transaction(async (tx): Promise<"allowance" | CreditCharge | null> => {
    if (!(await lockUser(tx, userId))) return null;
    if (allowance && (await allowance(tx))) return "allowance";
    const [row] = await tx
      .update(users)
      .set({ creditCents: sql`${users.creditCents} - ${cents}` })
      .where(and(eq(users.id, userId), gte(users.creditCents, cents)))
      .returning({ cents: users.creditCents });
    if (!row) return null;
    const spendKey = randomUUID();
    await tx
      .insert(billingLog)
      .values({ kind: "credit_spend", key: spendKey, userId, ref: feature, cents, at: now });
    return { key: spendKey, cents, balanceCents: row.cents };
  });
}

// A failed call's credit comes back once: its spend row goes, and the cents with it.
export async function returnCredit(userId: string, spendKey: string): Promise<void> {
  const db = await getDb();
  await db.transaction(async (tx) => {
    if (!(await lockUser(tx, userId))) return;
    const [spend] = await tx
      .delete(billingLog)
      .where(and(eq(kind, "credit_spend"), eq(key, spendKey), eq(owner, userId)))
      .returning({ cents: amount });
    if (!spend?.cents) return;
    await tx
      .update(users)
      .set({ creditCents: sql`${users.creditCents} + ${spend.cents}` })
      .where(eq(users.id, userId));
  });
}

export type CreditPurchase = { paymentId: string; at: number; cents: number; takenBack: boolean };

export async function creditPurchases(userId: string): Promise<CreditPurchase[]> {
  const db = await getDb();
  const rows = await db
    .select({ paymentId: key, at, cents: amount, doneAt })
    .from(billingLog)
    .where(and(eq(owner, userId), eq(kind, "topup")))
    .orderBy(desc(at))
    .limit(ACTIVITY_ROWS);
  return rows.map((row) => ({
    paymentId: row.paymentId,
    at: row.at,
    cents: row.cents ?? 0,
    takenBack: row.doneAt !== null,
  }));
}

const EXPORT_ROWS = 20_000;

export type CreditExport = {
  balanceCents: number;
  entries: { at: number; kind: CreditEntry["kind"]; cents: number; what: string }[];
};

// The data export's credit.json: the balance and every purchase, take-back and spend still kept.
export async function creditExport(userId: string): Promise<CreditExport | null> {
  const db = await getDb();
  const [[account], rows] = await Promise.all([
    db.select({ cents: users.creditCents }).from(users).where(eq(users.id, userId)).limit(1),
    db
      .select({ kind, key, ref, cents: amount, at })
      .from(billingLog)
      .where(and(eq(owner, userId), inArray(kind, ["topup", "topup_back", "credit_spend"])))
      .orderBy(at)
      .limit(EXPORT_ROWS),
  ]);
  const balanceCents = account?.cents ?? 0;
  if (balanceCents === 0 && rows.length === 0) return null;
  const entries = rows.map((row): CreditExport["entries"][number] => ({
    at: row.at,
    kind: row.kind === "topup" ? "added" : row.kind === "topup_back" ? "taken_back" : "spent",
    cents: row.cents ?? 0,
    // The payment id for a top-up and a take-back, the feature for a spend.
    what: row.kind === "topup" ? row.key : row.ref,
  }));
  return { balanceCents, entries };
}
