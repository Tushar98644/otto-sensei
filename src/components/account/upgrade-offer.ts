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
  currentInterval = null,
}: {
  current: PlanId;
  offer: Offer;
  picked: BillingInterval;
  trial: boolean;
  onTrial?: boolean;
  currentInterval?: BillingInterval | null;
}): UpgradeOffer {
  // A paid plan moves up only on the billing period it already has.
  const lockedTo = isPaidPlan(current) && !onTrial ? currentInterval : null;
  const sells = (plan: PaidPlanId, interval?: BillingInterval) =>
    interval ? (offer[plan]?.includes(interval) ?? false) : (offer[plan]?.length ?? 0) > 0;
  const buyable = PAID_PLANS.filter(
    (plan) => rank(plan) > rank(current) && sells(plan, lockedTo ?? undefined),
  );
  if (buyable.length === 0) return { cards: [], intervals: [], interval: picked };
  const intervals = lockedTo
    ? [lockedTo]
    : BILLING_INTERVALS.filter((interval) => buyable.some((plan) => sells(plan, interval)));
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
