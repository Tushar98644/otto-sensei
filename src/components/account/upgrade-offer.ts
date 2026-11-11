import {
  BILLING_INTERVALS,
  isPaidPlan,
  PAID_PLANS,
  PLAN_ORDER,
  PRO_TRIAL,
  type BillingInterval,
  type PaidPlanId,
  type PlanId,
} from "@/config/plans";

export type Offer = Partial<Record<PaidPlanId, readonly BillingInterval[]>>;

export type OfferCard = {
  plan: PaidPlanId;
  current: boolean;
  popular: boolean;
  interval: BillingInterval;
  trial: boolean;
  endsTrial: boolean;
};

export type UpgradeOffer = {
  cards: OfferCard[];
  intervals: BillingInterval[];
  interval: BillingInterval;
};

const rank = (plan: PlanId) => PLAN_ORDER.indexOf(plan);

export function upgradeOffer({
  current,
  offer,
  picked,
  trial,
  onTrial = false,
}: {
  current: PlanId;
  offer: Offer;
  picked: BillingInterval;
  trial: boolean;
  onTrial?: boolean;
}): UpgradeOffer {
  const buyable = PAID_PLANS.filter(
    (plan) => rank(plan) > rank(current) && (offer[plan]?.length ?? 0) > 0,
  );
  if (buyable.length === 0) return { cards: [], intervals: [], interval: picked };
  const intervals = BILLING_INTERVALS.filter((interval) =>
    buyable.some((plan) => offer[plan]?.includes(interval)),
  );
  const interval = intervals.includes(picked) ? picked : (intervals[0] ?? "month");
  const shown: PaidPlanId[] = isPaidPlan(current) ? [current, ...buyable] : buyable;
  const cards = shown.map((plan): OfferCard => {
    const own = offer[plan]?.includes(interval) ? interval : "month";
    return {
      plan,
      current: plan === current,
      popular: current === "free" && plan === "pro" && shown.length > 1,
      interval: own,
      trial: trial && current === "free" && plan === PRO_TRIAL.plan && own === PRO_TRIAL.interval,
      endsTrial: onTrial && isPaidPlan(current) && plan !== current,
    };
  });
  return { cards, intervals, interval };
}
