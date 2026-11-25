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
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import { priceCopy, usd, type PriceCopy, type PricingMessages } from "./price-copy";
import { quotaLine } from "./plan-features";

// What the plan cards read; the pricing page hands these to its client islands.
export type PlanMessages = Pick<PricingMessages, "prices" | "features" | "plans" | "copy">;

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

type Words = { t: PlanMessages; format: Format; prices: PriceCopy };

const rank = (plan: PlanId) => PLAN_ORDER.indexOf(plan);

function priceNotes(
  { t, format, prices }: Words,
  plan: PaidPlanId,
  interval: BillingInterval,
  picked: BillingInterval,
  choosing: boolean,
): string[] {
  if (interval === "year") {
    return [
      fmt(t.plans.yearlyNote, {
        perMonth: prices.perMonth(plan),
        yearly: usd(format, PRICES_USD[plan].month * 12),
      }),
    ];
  }
  return choosing && picked !== interval ? [t.plans.monthlyOnly] : [];
}

function currentNotes(
  { t, prices }: Words,
  viewer: PlanViewer,
  plan: PaidPlanId,
  interval: BillingInterval,
): string[] {
  if (isTrialing(viewer)) {
    return viewer.cancelScheduled
      ? [fmt(t.plans.wontStart, { plan: PLANS[plan].name })]
      : [
          fmt(t.plans.thenPrice, { priceLabel: prices.planPriceLabel(plan, interval) }),
          t.plans.trialEmail,
        ];
  }
  return viewer.cancelScheduled ? [t.plans.setToEnd] : [];
}

function currentBadge({ t, prices }: Words, viewer: PlanViewer): PlanBadge {
  if (!isPaidPlan(viewer.plan)) return { label: t.plans.yourPlan, tone: "neutral" };
  return {
    label: viewer.trialEndsAt
      ? fmt(t.plans.currentTrial, { day: prices.trialEndDay(viewer.trialEndsAt) })
      : t.plans.currentPlan,
    tone: "neutral",
  };
}

// Mirrors the upgrade dialog's rules (upgrade-offer.ts), so a button here never offers what the account page would refuse.
export function planCards({
  t,
  format,
  plans,
  offer,
  picked,
  trial,
  viewer,
}: {
  t: PlanMessages;
  format: Format;
  plans: readonly PlanId[];
  offer: Record<PaidPlanId, readonly BillingInterval[]>;
  picked: BillingInterval;
  trial: boolean;
  viewer: PlanViewer | null;
}): PlanCards {
  const prices = priceCopy(t, format);
  const words: Words = { t, format, prices };
  const popular: PlanBadge = { label: t.plans.popular, tone: "ink" };
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
  const includedIn = fmt(t.plans.includedIn, { plan: PLANS[current].name });

  const cards = plans.map((plan): PlanCardState => {
    const own = viewer !== null && viewer.plan === plan;
    if (!isPaidPlan(plan)) {
      if (viewer === null) {
        return {
          plan,
          interval: "month",
          cta: { href: ROUTES.studio, label: t.plans.freeCta, primary: false },
          manage: false,
          badge: null,
          notes: [t.copy.free.note],
        };
      }
      return {
        plan,
        interval: "month",
        cta: null,
        manage: false,
        badge: own ? currentBadge(words, viewer) : null,
        notes: own ? [] : [includedIn],
      };
    }
    const card = buyable.find((entry) => entry.plan === plan);
    if (card) {
      const name = PLANS[plan].name;
      const label = card.trial
        ? prices.trialHeadline()
        : card.endsTrial
          ? fmt(t.plans.startNow, { plan: name })
          : viewer
            ? fmt(t.plans.upgradeTo, { plan: name })
            : fmt(t.plans.get, { plan: name });
      const notes = card.trial
        ? [
            prices.trialSentence(),
            t.plans.trialEmail,
            quotaLine(t, format, PRO_TRIAL.plan, "trial"),
          ]
        : card.endsTrial
          ? [prices.endsTrialSentence(plan, card.interval)]
          : [t.copy[plan].note];
      return {
        plan,
        interval: card.interval,
        cta: { href: upgradeHref(plan, card.interval), label, primary: plan === primary },
        manage: false,
        badge: plan === "pro" ? popular : null,
        notes: [...notes, ...priceNotes(words, plan, card.interval, base, choosing)],
      };
    }
    if (own && viewer) {
      const interval = viewer.interval ?? PRO_TRIAL.interval;
      return {
        plan,
        interval,
        cta: null,
        manage: true,
        badge: currentBadge(words, viewer),
        notes: currentNotes(words, viewer, plan, interval),
      };
    }
    const interval = offer[plan].includes(base) ? base : "month";
    return {
      plan,
      interval,
      cta: null,
      manage: false,
      badge: plan === "pro" ? popular : null,
      notes: rank(plan) < rank(current) ? [includedIn] : [t.plans.notOnPeriod],
    };
  });

  const first = recommended ?? (viewer && plans.includes(current) ? current : null);
  return { cards, intervals: upgrade.intervals, first };
}

export function closingCta({
  t,
  format,
  offer,
  trial,
  viewer,
}: {
  t: PlanMessages;
  format: Format;
  offer: Record<PaidPlanId, readonly BillingInterval[]>;
  trial: boolean;
  viewer: PlanViewer | null;
}): PlanCta | null {
  if (viewer && isPaidPlan(viewer.plan)) return null;
  const { cards } = planCards({
    t,
    format,
    plans: ["pro"],
    offer,
    picked: PRO_TRIAL.interval,
    trial,
    viewer,
  });
  return cards[0]?.cta ?? null;
}
