import type { Me } from "@/components/account/use-me";
import {
  FREE_APPLICATIONS,
  FREE_JOB_MATCHES,
  isPaidPlan,
  isTrialing,
  PLANS,
  type BillingInterval,
  type PaidPlanId,
} from "@/config/plans";
import { planPrice, trialPrice, trialSentence, yearlySavingsPercent } from "@/lib/billing/prices";
import { DAY_MS } from "@/lib/time";
import { trialEndDay } from "@/lib/usage-copy";

export type PlanView =
  | { kind: "free"; trialOffered: boolean }
  | { kind: "held" }
  | { kind: "trial"; plan: PaidPlanId; interval: BillingInterval; endsAt: number; ending: boolean }
  | {
      kind: "paid";
      plan: PaidPlanId;
      interval: BillingInterval;
      renewsAt: number | null;
      endsAt: number | null;
      ending: boolean;
    };

export type PillTone = "live" | "pass" | "warn" | "fail" | "neutral";
export type Pill = { label: string; tone: PillTone };
export type PriceParts = { amount: string; per: string | null; note: string | null };

export function planView(me: Me): PlanView | null {
  const user = me.user;
  if (!user) return null;
  if (me.billing.paymentIssue === true) return { kind: "held" };
  if (!isPaidPlan(user.plan)) {
    return {
      kind: "free",
      trialOffered: me.billing.trial === true && me.billing.mode !== "disabled",
    };
  }
  const ending = me.billing.cancelScheduled === true;
  const interval = user.planInterval ?? "month";
  if (isTrialing(user) && user.trialEndsAt != null) {
    return { kind: "trial", plan: user.plan, interval, endsAt: user.trialEndsAt, ending };
  }
  const endsAt = user.planPeriodEndsAt ?? null;
  return {
    kind: "paid",
    plan: user.plan,
    interval,
    renewsAt: ending ? null : (user.planRenewsAt ?? endsAt),
    endsAt,
    ending,
  };
}

export function planName(view: PlanView): string {
  return view.kind === "trial" || view.kind === "paid" ? PLANS[view.plan].name : PLANS.free.name;
}

function daysLeft(endsAt: number, now: number): string {
  const days = Math.max(0, Math.ceil((endsAt - now) / DAY_MS));
  if (days === 0) return "ends today";
  return days === 1 ? "1 day left" : `${days} days left`;
}

// `now` is 0 until the browser's clock is read, and then the pill says only "Trial". Free needs no pill.
export function planPill(view: PlanView, now: number): Pill | null {
  switch (view.kind) {
    case "free":
      return null;
    case "held":
      return { label: "Payment failed", tone: "fail" };
    case "trial":
      if (view.ending) return { label: `Ends ${trialEndDay(view.endsAt)}`, tone: "warn" };
      return { label: now > 0 ? `Trial · ${daysLeft(view.endsAt, now)}` : "Trial", tone: "live" };
    case "paid":
      if (!view.ending) return { label: "Active", tone: "pass" };
      return { label: view.endsAt ? `Ends ${trialEndDay(view.endsAt)}` : "Set to end", tone: "warn" };
  }
}

export function priceParts(view: PlanView): PriceParts | null {
  switch (view.kind) {
    case "free":
    case "held":
      return null;
    case "trial":
      return view.ending
        ? { amount: trialPrice(), per: null, note: "Nothing more to pay" }
        : {
            amount: planPrice(view.plan, view.interval),
            per: `/${view.interval}`,
            note: `from ${trialEndDay(view.endsAt)}`,
          };
    case "paid": {
      const day = view.ending ? view.endsAt : view.renewsAt;
      const note = day ? `${view.ending ? "until" : "renews"} ${trialEndDay(day)}` : null;
      return { amount: planPrice(view.plan, view.interval), per: `/${view.interval}`, note };
    }
  }
}

export const HELD_TITLE = "Your last payment didn't go through";
export const HELD_DETAIL = "You're on Free for now. Update your card to get your plan back.";

// The pill and the price beside this line already carry the dates and amounts, so it says only what they can't.
export function nextStep(view: PlanView): string {
  switch (view.kind) {
    case "free": {
      const tracked = FREE_APPLICATIONS === 1 ? "one tracked application" : `${FREE_APPLICATIONS} tracked applications`;
      const base = `Free includes the recruiter view, editing, PDF downloads, your ${FREE_JOB_MATCHES} closest job matches and ${tracked}.`;
      return view.trialOffered ? `${base} Try ${PLANS.pro.name}: ${trialSentence()}` : base;
    }
    case "held":
      return `${HELD_TITLE}. ${HELD_DETAIL}`;
    case "trial": {
      const name = PLANS[view.plan].name;
      return view.ending
        ? `${name} won't start after your trial. Resume it before the trial ends to keep ${name}.`
        : `You paid ${trialPrice()} for the trial. We remind you the day before ${name} starts, and you can cancel until then.`;
    }
    case "paid": {
      const name = PLANS[view.plan].name;
      if (view.ending) return "When it ends, your account moves to Free. You won't be charged again.";
      return `Cancel anytime. You keep ${name} until the end of the ${view.interval} you paid for.`;
    }
  }
}

export type YearlyOffer = { line: string; how: string };

// The app never moves a plan between monthly and yearly mid-period, so this says how instead of offering a charge.
export function yearlyOffer(
  view: PlanView,
  offer: Me["billing"]["offer"],
): YearlyOffer | null {
  if (view.kind !== "trial" && view.kind !== "paid") return null;
  if (view.ending || view.interval !== "month" || !offer[view.plan].includes("year")) return null;
  const savings = yearlySavingsPercent(view.plan);
  const until = view.kind === "trial" ? view.endsAt : view.renewsAt;
  const what = view.kind === "trial" ? "your trial" : "monthly";
  return {
    line: `Pay yearly instead: ${planPrice(view.plan, "year")} a year${savings > 0 ? `, ${savings}% less than monthly` : ""}.`,
    how: `A plan can't move between monthly and yearly partway through. Cancel ${what}${until ? ` before ${trialEndDay(until)}` : ""}, then pick yearly on the pricing page once it ends.`,
  };
}

// Max's smallest step up over Pro, so the line never claims more than every limit backs.
export function maxMultiple(): number {
  const features = Object.keys(PLANS.pro.limits) as (keyof typeof PLANS.pro.limits)[];
  return Math.min(...features.map((feature) => PLANS.max.limits[feature] / PLANS.pro.limits[feature]));
}

export function maxLine(): string {
  const multiple = maxMultiple();
  const claim =
    multiple >= 3 ? "at least triple" : multiple >= 2 ? "at least double" : "more than";
  return `Need more? ${PLANS.max.name} has ${claim} every ${PLANS.pro.name} limit, for ${planPrice("max", "month")} a month.`;
}
