import {
  FEATURES,
  PLANS,
  PRICES_USD,
  PRO_TRIAL,
  type AllowancePeriod,
  type BillingInterval,
  type Feature,
  type PaidPlanId,
} from "@/config/plans";
import { creditBuys, creditCents, TOPUP_LIMITS } from "@/config/topup";
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import type { Messages } from "@/i18n/messages";
import { yearlySavingsPercent } from "@/lib/billing/prices";

export type PricingMessages = Messages["pricing"];

// "a, b and c": English keeps its house style (no serial comma); other languages follow Intl.
export function joinList(format: Format, items: readonly string[], type: "and" | "or"): string {
  if (format.locale !== "en") {
    return format.list(items, { type: type === "and" ? "conjunction" : "disjunction" });
  }
  const rest = [...items];
  const last = rest.pop() ?? "";
  return rest.length ? `${rest.join(", ")} ${type} ${last}` : last;
}

// US dollars in the page's language: $12 in English, USD 12 in Spanish, 12 $ in German.
export function usd(format: Format, amount: number): string {
  return format.currency(amount, "USD", { trailingZeroDisplay: "stripIfInteger" });
}

// src/lib/billing/prices.ts in the page's language; English matches it word for word (price-copy.test.ts).
export function priceCopy(t: Pick<PricingMessages, "prices">, format: Format) {
  const words = t.prices;
  const planPrice = (plan: PaidPlanId, interval: BillingInterval) =>
    usd(format, PRICES_USD[plan][interval]);
  const planPriceLabel = (plan: PaidPlanId, interval: BillingInterval) =>
    fmt(words.priceLabel[interval], { price: planPrice(plan, interval) });
  const perMonth = (plan: PaidPlanId) =>
    usd(format, Math.round((PRICES_USD[plan].year / 12) * 100) / 100);
  const trialPrice = () => usd(format, PRO_TRIAL.priceUsd);
  const trialOffer = () =>
    fmt(words.trialOffer, { plan: PLANS[PRO_TRIAL.plan].name, days: PRO_TRIAL.days });
  return {
    usd: (amount: number) => usd(format, amount),
    count: (value: number) => format.number(value),
    cancelAnytime: words.cancelAnytime,
    intervalName: (interval: BillingInterval) => words.intervalNames[interval],
    perInterval: (interval: BillingInterval) => words.perInterval[interval],
    perPeriod: (period: AllowancePeriod) => words.perPeriod[period],
    trialEndDay: (at: number) => format.date(at, { month: "short", day: "numeric" }),
    planPrice,
    planPriceLabel,
    perMonth,
    trialPrice,
    trialOffer,
    trialHeadline: () => fmt(words.trialHeadline, { offer: trialOffer() }),
    trialSentence: () =>
      fmt(words.trialSentence, {
        price: trialPrice(),
        days: PRO_TRIAL.days,
        planPrice: planPrice(PRO_TRIAL.plan, PRO_TRIAL.interval),
        perInterval: words.perInterval[PRO_TRIAL.interval],
      }),
    endsTrialSentence: (plan: PaidPlanId, interval: BillingInterval) =>
      fmt(words.endsTrial, {
        trialPlan: PLANS[PRO_TRIAL.plan].name,
        plan: PLANS[plan].name,
        priceLabel: planPriceLabel(plan, interval),
      }),
    priceSentence: (plan: PaidPlanId, interval: BillingInterval) => {
      const price = planPrice(plan, interval);
      if (interval === "month") return fmt(words.monthly, { price });
      const savings = yearlySavingsPercent(plan);
      return savings > 0
        ? fmt(words.yearly, { price, perMonth: perMonth(plan), savings })
        : fmt(words.yearlyFlat, { price });
    },
    renewalPeriods: (intervals: readonly BillingInterval[]) =>
      joinList(
        format,
        (intervals.length ? intervals : (["month"] as const)).map(
          (interval) => words.eachInterval[interval],
        ),
        "or",
      ),
  };
}

export type PriceCopy = ReturnType<typeof priceCopy>;

const BUYS_SHOWN: readonly Feature[] = ["tailor", "letter", "fix"];

// The credit words of src/config/topup.ts in the page's language; English matches them word for word.
export function creditCopy(t: PricingMessages["credit"], format: Format) {
  const centsText = (cents: number) =>
    cents < 100 ? fmt(t.cents, { cents: format.number(cents) }) : usd(format, cents / 100);
  const buysSentence = (amount: number) => {
    const parts = BUYS_SHOWN.flatMap((feature) => {
      const buys = creditBuys(amount * 100, feature);
      return buys > 0
        ? [fmt(t.item, { count: format.number(buys), label: t.labels[feature] })]
        : [];
    });
    return fmt(t.buys, { usd: usd(format, amount), list: joinList(format, parts, "or") });
  };
  return {
    centsText,
    buysSentence,
    pricingLine: () =>
      fmt(t.line, { min: usd(format, TOPUP_LIMITS.minUsd), buys: buysSentence(1) }),
    priceList: () =>
      FEATURES.flatMap((feature) => {
        const cents = creditCents(feature);
        return cents === null ? [] : [fmt(t.each[feature], { price: centsText(cents) })];
      }).join(", "),
  };
}
