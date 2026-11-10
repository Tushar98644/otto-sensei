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

// Client-safe. What the upgrade prompt offers: Free sees Pro and Max side by side, Pro sees Max
// beside its own plan, and Max has nothing to buy. Only plans and billing options on sale here
// (billing.offer from /api/me) appear.

export type Offer = Partial<Record<PaidPlanId, readonly BillingInterval[]>>;

export type OfferCard = {
  plan: PaidPlanId;
  // The account's own plan, shown to compare against, with nothing to buy.
  current: boolean;
  // Pro next to Max, on Free.
  popular: boolean;
  // What the card's price and checkout bill for: the picked option, or monthly where the plan
  // isn't sold that way (the pricing page does the same).
  interval: BillingInterval;
  // Starts with the free trial: Pro monthly, on Free, for someone who hasn't had one.
  trial: boolean;
};

export type UpgradeOffer = {
  cards: OfferCard[];
  // The billing options on sale for the plans that can be bought here, in the pricing page's order.
  intervals: BillingInterval[];
  // The one the cards are priced for.
  interval: BillingInterval;
};

const rank = (plan: PlanId) => PLAN_ORDER.indexOf(plan);

export function upgradeOffer({
  current,
  offer,
  picked,
  trial,
}: {
  current: PlanId;
  offer: Offer;
  // The billing option asked for; one not on sale falls back to the first that is.
  picked: BillingInterval;
  // Pro monthly would start with the free trial for this account.
  trial: boolean;
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
    };
  });
  return { cards, intervals, interval };
}
