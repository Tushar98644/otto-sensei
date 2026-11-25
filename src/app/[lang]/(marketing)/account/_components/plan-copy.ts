import type { Me } from "@/components/account/use-me";
import {
  applicationLimit,
  isPaidPlan,
  isTrialing,
  PLANS,
  PRO_TRIAL,
  resumeLimit,
  type BillingInterval,
  type PaidPlanId,
} from "@/config/plans";
import { planPriceIn, trialPriceIn } from "@/components/account/local-prices";
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import type { Messages } from "@/i18n/messages";
import { yearlySavingsPercent } from "@/lib/billing/prices";
import { DAY_MS } from "@/lib/time";

export type PlanWords = Messages["account"]["plan"];

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

const SHORT_DAY = { month: "short", day: "numeric" } as const;

// "Nov 23", as lib/usage-copy's trialEndDay writes it in English.
export function shortDay(format: Format, at: number): string {
  return format.date(at, SHORT_DAY);
}

function daysLeft(words: PlanWords, format: Format, endsAt: number, now: number): string {
  const days = Math.max(0, Math.ceil((endsAt - now) / DAY_MS));
  if (days === 0) return words.endsToday;
  return format.plural(words.daysLeft, days);
}

// `now` is 0 until the browser's clock is read, and then the pill says only "Trial".
export function planPill(words: PlanWords, format: Format, view: PlanView, now: number): Pill {
  const pills = words.pills;
  switch (view.kind) {
    case "free":
      return { label: pills.current, tone: "neutral" };
    case "held":
      return { label: pills.failed, tone: "fail" };
    case "trial":
      if (view.ending) {
        return { label: fmt(pills.ends, { day: shortDay(format, view.endsAt) }), tone: "warn" };
      }
      return {
        label:
          now > 0
            ? fmt(pills.trialLeft, { left: daysLeft(words, format, view.endsAt, now) })
            : pills.trial,
        tone: "live",
      };
    case "paid":
      if (!view.ending) return { label: pills.active, tone: "pass" };
      return {
        label: view.endsAt
          ? fmt(pills.ends, { day: shortDay(format, view.endsAt) })
          : pills.setToEnd,
        tone: "warn",
      };
  }
}

export function priceParts(words: PlanWords, format: Format, view: PlanView): PriceParts | null {
  switch (view.kind) {
    case "free":
    case "held":
      return null;
    case "trial":
      return view.ending
        ? { amount: trialPriceIn(format), per: null, note: words.nothingMore }
        : {
            amount: planPriceIn(format, view.plan, view.interval),
            per: words.per[view.interval],
            note: fmt(words.from, { day: shortDay(format, view.endsAt) }),
          };
    case "paid": {
      const day = view.ending ? view.endsAt : view.renewsAt;
      const note = day
        ? fmt(view.ending ? words.until : words.renews, { day: shortDay(format, day) })
        : null;
      return {
        amount: planPriceIn(format, view.plan, view.interval),
        per: words.per[view.interval],
        note,
      };
    }
  }
}

export function trialSentenceIn(words: PlanWords, format: Format): string {
  return fmt(words.trialSentence[PRO_TRIAL.interval], {
    price: trialPriceIn(format),
    days: PRO_TRIAL.days,
    plan: planPriceIn(format, PRO_TRIAL.plan, PRO_TRIAL.interval),
  });
}

export function nextStep(words: PlanWords, format: Format, view: PlanView): string {
  switch (view.kind) {
    case "free": {
      const free = applicationLimit("free");
      const base = fmt(words.free, {
        fixes: PLANS.free.limits.fix,
        tracked: format.plural(words.tracked, free),
      });
      return view.trialOffered
        ? fmt(words.tryPro, { base, pro: PLANS.pro.name, trial: trialSentenceIn(words, format) })
        : base;
    }
    case "held":
      return fmt(words.held, { title: words.heldTitle, detail: words.heldDetail });
    case "trial": {
      const day = shortDay(format, view.endsAt);
      const name = PLANS[view.plan].name;
      return view.ending
        ? fmt(words.trialEnding, { day, name })
        : fmt(words.trialStarts[view.interval], {
            trial: trialPriceIn(format),
            day,
            name,
            price: planPriceIn(format, view.plan, view.interval),
          });
    }
    case "paid": {
      if (view.ending) {
        return view.endsAt
          ? fmt(words.endsOn, { day: shortDay(format, view.endsAt) })
          : words.setToEnd;
      }
      const price = planPriceIn(format, view.plan, view.interval);
      return view.renewsAt
        ? fmt(words.renewsOn[view.interval], { day: shortDay(format, view.renewsAt), price })
        : fmt(words.renewsEach[view.interval], { price });
    }
  }
}

export type YearlyOffer = { line: string; how: string };

// The app never moves a plan between monthly and yearly mid-period, so this says how instead of offering a charge.
export function yearlyOffer(
  words: PlanWords,
  format: Format,
  view: PlanView,
  offer: Me["billing"]["offer"],
): YearlyOffer | null {
  if (view.kind !== "trial" && view.kind !== "paid") return null;
  if (view.ending || view.interval !== "month" || !offer[view.plan].includes("year")) return null;
  const savings = yearlySavingsPercent(view.plan);
  const until = view.kind === "trial" ? view.endsAt : view.renewsAt;
  const price = planPriceIn(format, view.plan, "year");
  const how =
    view.kind === "trial"
      ? until
        ? fmt(words.how.trialBefore, { day: shortDay(format, until) })
        : words.how.trial
      : until
        ? fmt(words.how.paidBefore, { day: shortDay(format, until) })
        : words.how.paid;
  return {
    line: savings > 0 ? fmt(words.yearlySaves, { price, savings }) : fmt(words.yearly, { price }),
    how,
  };
}

// Max's smallest step up over Pro, resumes and tracked applications included, so the line never claims more than every limit backs.
export function maxMultiple(): number {
  const features = Object.keys(PLANS.pro.limits) as (keyof typeof PLANS.pro.limits)[];
  return Math.min(
    ...features.map((feature) => PLANS.max.limits[feature] / PLANS.pro.limits[feature]),
    resumeLimit("max") / resumeLimit("pro"),
    applicationLimit("max") / applicationLimit("pro"),
  );
}

export function maxLine(words: PlanWords, format: Format): string {
  const multiple = maxMultiple();
  const claim = multiple >= 3 ? "triple" : multiple >= 2 ? "double" : "more";
  return fmt(words.max[claim], {
    max: PLANS.max.name,
    pro: PLANS.pro.name,
    price: planPriceIn(format, "max", "month"),
  });
}
