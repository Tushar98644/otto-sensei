import type { Feature, UsagePeriod, UsageSnapshot } from "@/config/plans";
import { creditCents } from "@/config/topup";
import type { CreditNote } from "@/lib/api/types";
import type { SessionUser } from "@/lib/auth/types";
import { creditUsable, returnCredit, spendCredit } from "@/lib/billing/credit";
import {
  consumeUsage,
  getUsage,
  publicPeriod,
  refundUsage,
  resolvePeriod,
  takeAllowanceUnit,
} from "@/lib/usage";

export type TakenUnit = {
  allowed: true;
  usage: UsageSnapshot;
  period: UsagePeriod;
  giveBack: () => Promise<void>;
  credit: CreditNote | null;
};

export type RefusedUnit = {
  allowed: false;
  usage: UsageSnapshot | null;
  period: UsagePeriod;
  budget: boolean;
};

// The month's allowance first; past it, or past the AI budget, a paid plan's credit pays.
export async function takeUnitOrCredit(
  user: SessionUser,
  feature: Feature,
  now: number,
  { budgetAllowed }: { budgetAllowed: boolean },
): Promise<TakenUnit | RefusedUnit> {
  let refused: RefusedUnit | null = null;
  if (budgetAllowed) {
    const taken = await consumeUsage(user, feature, now);
    if (taken.allowed) {
      const giveBack = () => refundUsage(user, feature, now);
      return { allowed: true, usage: taken.usage, period: taken.period, giveBack, credit: null };
    }
    refused = { allowed: false, usage: taken.usage, period: taken.period, budget: false };
  }
  refused ??= {
    allowed: false,
    usage: null,
    period: publicPeriod(resolvePeriod(user, now, { quiet: true })),
    budget: true,
  };
  const price = creditCents(feature);
  if (price === null || !creditUsable(user)) return refused;
  // Read before anything is spent: after the spend, nothing may throw and lose it.
  const before = refused.usage ?? (await getUsage(user, now));
  const paid = await spendCredit(
    user.id,
    feature,
    price,
    now,
    budgetAllowed ? (tx) => takeAllowanceUnit(tx, user, feature, now) : null,
  );
  if (paid === null) return refused;
  if (paid === "allowance") {
    const giveBack = () => refundUsage(user, feature, now);
    const usage = await getUsage(user, now).catch(() => before);
    return { allowed: true, usage, period: refused.period, giveBack, credit: null };
  }
  return {
    allowed: true,
    usage: before,
    period: refused.period,
    giveBack: () => returnCredit(user.id, paid.key),
    credit: { cents: paid.cents, balanceCents: paid.balanceCents },
  };
}

// Its own name, so no other answer's credit field reads as a spend.
export function creditField(credit: CreditNote | null | undefined): { creditSpent?: CreditNote } {
  return credit ? { creditSpent: credit } : {};
}
