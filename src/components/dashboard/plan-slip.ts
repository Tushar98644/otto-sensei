import { isTrialing, PLANS, PRO_TRIAL } from "@/config/plans";
import type { SessionUser } from "@/lib/auth/types";
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import { trialPrice } from "@/lib/billing/prices";
import type { DashboardMessages } from "./i18n";

const DAY_MS = 24 * 60 * 60 * 1000;

type SlipBilling = {
  offer: { pro: readonly unknown[] };
  trial?: boolean;
  paymentIssue?: boolean;
};

type PlanSlip = { kind: "payment" | "trial" | "offer"; label: string };

export function offerLabel(trialOnOffer: boolean, t: DashboardMessages): string {
  const plan = PLANS[PRO_TRIAL.plan].name;
  return trialOnOffer
    ? fmt(t.plan.tryFor, { plan, price: trialPrice() })
    : fmt(t.plan.upgradeTo, { plan });
}

// One line per state, so the sidebar never carries more than one plan nudge.
export function planSlip(
  user: Pick<SessionUser, "plan" | "trialEndsAt">,
  billing: SlipBilling | null | undefined,
  now: number,
  t: DashboardMessages,
  format: Format,
): PlanSlip | null {
  if (!billing) return null;
  if (billing.paymentIssue) return { kind: "payment", label: t.plan.fixPayment };
  if (isTrialing(user) && user.trialEndsAt != null) {
    if (now <= 0) return null;
    const days = Math.ceil((user.trialEndsAt - now) / DAY_MS);
    return {
      kind: "trial",
      label: days > 0 ? format.plural(t.plan.daysLeft, days) : t.plan.endsToday,
    };
  }
  if (user.plan !== "free" || billing.offer[PRO_TRIAL.plan].length === 0) return null;
  return { kind: "offer", label: offerLabel(billing.trial === true, t) };
}
