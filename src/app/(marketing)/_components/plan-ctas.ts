import { upgradeOffer } from "@/components/account/upgrade-offer";
import { ROUTES, upgradeHref } from "@/components/site/routes";
import {
  isPaidPlan,
  isTrialing,
  PLAN_ORDER,
  PLANS,
  PRICES_USD,
  PRO_TRIAL,
  type BillingInterval,
  type PaidPlanId,
  type PlanId,
} from "@/config/plans";
import {
  endsTrialSentence,
  perMonth,
  planPriceLabel,
  trialHeadline,
  trialSentence,
} from "@/lib/billing/prices";
import { trialEndDay } from "@/lib/usage-copy";
import { formatUsd, planCopy, quotaLine } from "./plan-features";

export type PlanViewer = {
  plan: PlanId;
  interval: BillingInterval | null;
  trialEndsAt?: number | null;
  cancelScheduled?: boolean;
};

export type PlanCta = { href: string; label: string; primary: boolean };

export type PlanBadge = { label: string; tone: "ink" | "neutral" };

export type PlanCardState = {
  plan: PlanId;
  interval: BillingInterval;
  cta: PlanCta | null;
  manage: boolean;
  badge: PlanBadge | null;
  notes: string[];
};

export type PlanCards = {
  cards: PlanCardState[];
  intervals: BillingInterval[];
  first: PlanId | null;
};

export const TRIAL_EMAIL_NOTE = "We'll email you the day before it renews.";

const FREE_CTA = { href: ROUTES.studio, label: "Check my resume, free" } as const;

const rank = (plan: PlanId) => PLAN_ORDER.indexOf(plan);

function priceNotes(
  plan: PaidPlanId,
  interval: BillingInterval,
  picked: BillingInterval,
  choosing: boolean,
): string[] {
  if (interval === "year") {
    return [
      `About ${perMonth(plan)} a month, instead of ${formatUsd(PRICES_USD[plan].month * 12)} a year paid monthly.`,
    ];
  }
  return choosing && picked !== interval ? ["Sold monthly only, for now."] : [];
}

function currentNotes(viewer: PlanViewer, plan: PaidPlanId, interval: BillingInterval): string[] {
  const name = PLANS[plan].name;
  if (isTrialing(viewer)) {
    return viewer.cancelScheduled
      ? [`${name} won't start, so you won't pay anything more.`]
      : [`Then ${planPriceLabel(plan, interval)}, unless you cancel.`, TRIAL_EMAIL_NOTE];
  }
  return viewer.cancelScheduled ? ["Set to end, so you won't be charged again."] : [];
}

function currentBadge(viewer: PlanViewer): PlanBadge {
  if (!isPaidPlan(viewer.plan)) return { label: "Your plan", tone: "neutral" };
  return {
    label: viewer.trialEndsAt
      ? `Current plan · trial until ${trialEndDay(viewer.trialEndsAt)}`
      : "Current plan",
    tone: "neutral",
  };
}

// Mirrors the upgrade dialog's rules (upgrade-offer.ts), so a button here never offers what the account page would refuse.
export function planCards({
  plans,
  offer,
  picked,
  trial,
  viewer,
}: {
  plans: readonly PlanId[];
  offer: Record<PaidPlanId, readonly BillingInterval[]>;
  picked: BillingInterval;
  trial: boolean;
  viewer: PlanViewer | null;
}): PlanCards {
  const current = viewer?.plan ?? "free";
  const upgrade = upgradeOffer({
    current,
    offer,
    picked,
    trial: trial && current === "free",
    onTrial: viewer !== null && isTrialing(viewer),
    currentInterval: viewer?.interval ?? null,
  });
  const choosing = upgrade.intervals.length > 1;
  const base = upgrade.intervals.length > 0 ? upgrade.interval : (viewer?.interval ?? picked);
  const buyable = upgrade.cards.filter((card) => !card.current);
  const recommended: PlanId | null =
    current === "free" && buyable.some((card) => card.plan === "pro") ? "pro" : null;
  const primary = recommended ?? buyable[0]?.plan ?? null;

  const cards = plans.map((plan): PlanCardState => {
    const own = viewer !== null && viewer.plan === plan;
    if (!isPaidPlan(plan)) {
      if (viewer === null) {
        return {
          plan,
          interval: "month",
          cta: { ...FREE_CTA, primary: false },
          manage: false,
          badge: null,
          notes: [planCopy("free").note],
        };
      }
      return {
        plan,
        interval: "month",
        cta: null,
        manage: false,
        badge: own ? currentBadge(viewer) : null,
        notes: own ? [] : [`Included in ${PLANS[current].name}.`],
      };
    }
    const card = buyable.find((entry) => entry.plan === plan);
    if (card) {
      const name = PLANS[plan].name;
      const label = card.trial
        ? trialHeadline()
        : card.endsTrial
          ? `Start ${name} now`
          : viewer
            ? `Upgrade to ${name}`
            : `Get ${name}`;
      const notes = card.trial
        ? [trialSentence(), TRIAL_EMAIL_NOTE, quotaLine(PRO_TRIAL.plan, "trial")]
        : card.endsTrial
          ? [endsTrialSentence(plan, card.interval)]
          : [planCopy(plan).note];
      return {
        plan,
        interval: card.interval,
        cta: { href: upgradeHref(plan, card.interval), label, primary: plan === primary },
        manage: false,
        badge: plan === recommended ? { label: "Recommended", tone: "ink" } : null,
        notes: [...notes, ...priceNotes(plan, card.interval, base, choosing)],
      };
    }
    if (own && viewer) {
      const interval = viewer.interval ?? PRO_TRIAL.interval;
      return {
        plan,
        interval,
        cta: null,
        manage: true,
        badge: currentBadge(viewer),
        notes: currentNotes(viewer, plan, interval),
      };
    }
    const interval = offer[plan].includes(base) ? base : "month";
    return {
      plan,
      interval,
      cta: null,
      manage: false,
      badge: null,
      notes:
        rank(plan) < rank(current)
          ? [`Included in ${PLANS[current].name}.`]
          : ["Not available on your billing period yet."],
    };
  });

  const first = recommended ?? (viewer && plans.includes(current) ? current : null);
  return { cards, intervals: upgrade.intervals, first };
}

export function closingCta({
  offer,
  trial,
  viewer,
}: {
  offer: Record<PaidPlanId, readonly BillingInterval[]>;
  trial: boolean;
  viewer: PlanViewer | null;
}): PlanCta | null {
  if (viewer && isPaidPlan(viewer.plan)) return null;
  const { cards } = planCards({ plans: ["pro"], offer, picked: PRO_TRIAL.interval, trial, viewer });
  return cards[0]?.cta ?? null;
}
