import { isTrialing, PLANS, PRO_TRIAL } from "@/config/plans";
import type { SessionUser } from "@/lib/auth/types";
import { trialPrice } from "@/lib/billing/prices";
import { pluralize } from "@/lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;

type SlipBilling = {
  offer: { pro: readonly unknown[] };
  trial?: boolean;
  paymentIssue?: boolean;
};

type PlanSlip = { kind: "payment" | "trial" | "offer"; label: string };

export function offerLabel(trialOnOffer: boolean): string {
  const pro = PLANS[PRO_TRIAL.plan].name;
  return trialOnOffer ? `Try ${pro} for ${trialPrice()}` : `Upgrade to ${pro}`;
}

// One line per state, so the sidebar never carries more than one plan nudge.
export function planSlip(
  user: Pick<SessionUser, "plan" | "trialEndsAt">,
  billing: SlipBilling | null | undefined,
  now: number,
): PlanSlip | null {
  if (!billing) return null;
  if (billing.paymentIssue) return { kind: "payment", label: "Fix payment" };
  if (isTrialing(user) && user.trialEndsAt != null) {
    if (now <= 0) return null;
    const days = Math.ceil((user.trialEndsAt - now) / DAY_MS);
    return { kind: "trial", label: days > 0 ? `${pluralize(days, "day")} left` : "Trial ends today" };
  }
  if (user.plan !== "free" || billing.offer[PRO_TRIAL.plan].length === 0) return null;
  return { kind: "offer", label: offerLabel(billing.trial === true) };
}
