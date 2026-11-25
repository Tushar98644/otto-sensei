"use client";

import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  applicationLimit,
  PLANS,
  planLimits,
  PRICES_USD,
  PRO_TRIAL,
  resumeLimit,
  type BillingInterval,
  type Feature,
  type PaidPlanId,
} from "@/config/plans";
import { useFormat, useMessagesOr } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import type { Messages } from "@/i18n/messages";
import EN_UPGRADE from "@/i18n/messages/en/upgrade";
import { yearlySavingsPercent } from "@/lib/billing/prices";
import { TEMPLATE_IDS } from "@/lib/resume/schema";
import { cn } from "@/lib/utils";
import { IntervalPicker } from "./interval-picker";
import { planPriceIn, trialPriceIn, usdIn } from "./local-prices";
import { ReferencePrice } from "./reference-price";
import type { OfferCard } from "./upgrade-offer";

const HIGHLIGHTS: readonly Feature[] = ["tailor", "letter", "fix"];

export type OfferWords = Messages["upgrade"]["offer"];

// lib/billing/prices' sentences in the reader's language; English reads as they do.
export function offerPrices(t: OfferWords, format: Format) {
  const planPrice = (plan: PaidPlanId, interval: BillingInterval) =>
    planPriceIn(format, plan, interval);
  const perMonth = (plan: PaidPlanId) =>
    usdIn(format, Math.round((PRICES_USD[plan].year / 12) * 100) / 100);
  return {
    planPrice,
    perMonth,
    priceLabel: (plan: PaidPlanId, interval: BillingInterval) =>
      `${planPrice(plan, interval)}${t.per[interval]}`,
    trialSentence: () =>
      fmt(t.trialSentence, {
        price: trialPriceIn(format),
        days: PRO_TRIAL.days,
        planPrice: planPrice(PRO_TRIAL.plan, PRO_TRIAL.interval),
        perInterval: t.perInterval[PRO_TRIAL.interval],
      }),
    endsTrialSentence: (plan: PaidPlanId, interval: BillingInterval) =>
      fmt(t.endsTrial, {
        trialPlan: PLANS[PRO_TRIAL.plan].name,
        plan: PLANS[plan].name,
        priceLabel: `${planPrice(plan, interval)}${t.per[interval]}`,
      }),
    priceSentence: (plan: PaidPlanId, interval: BillingInterval) => {
      const price = planPrice(plan, interval);
      if (interval === "month") return fmt(t.monthly, { price });
      const savings = yearlySavingsPercent(plan);
      return savings > 0
        ? fmt(t.yearly, { price, perMonth: perMonth(plan), savings })
        : fmt(t.yearlyFlat, { price });
    },
  };
}

export function useOfferWords(): OfferWords {
  return useMessagesOr("upgrade", EN_UPGRADE).offer;
}

export type PlanOfferProps = {
  cards: readonly OfferCard[];
  intervals: readonly BillingInterval[];
  interval: BillingInterval;
  onIntervalChange: (interval: BillingInterval) => void;
  onChoose?: (card: OfferCard) => void;
  focusPlan?: PaidPlanId | null;
  pendingPlan?: PaidPlanId | null;
  disabled?: boolean;
};

export function PlanOffer({
  cards,
  intervals,
  interval,
  onIntervalChange,
  onChoose,
  focusPlan,
  pendingPlan = null,
  disabled = false,
}: PlanOfferProps) {
  const t = useOfferWords();
  const primary = (cards.find((card) => card.popular) ?? cards.find((card) => !card.current))?.plan;
  return (
    <div className="flex flex-col gap-4">
      <IntervalPicker intervals={intervals} value={interval} onChange={onIntervalChange} />
      <ul className={cn("grid gap-3", cards.length > 1 && "sm:grid-cols-2")}>
        {cards.map((card) => (
          <li key={card.plan} className="flex">
            <PlanOfferCard
              card={card}
              picked={interval}
              primary={card.plan === primary}
              focus={card.plan === focusPlan}
              pending={pendingPlan === card.plan}
              disabled={disabled || (pendingPlan !== null && pendingPlan !== card.plan)}
              onChoose={onChoose}
            />
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">
        {t.resetRule[interval]} {t.promises}
      </p>
    </div>
  );
}

function PlanOfferCard({
  card,
  picked,
  primary,
  focus,
  pending,
  disabled,
  onChoose,
}: {
  card: OfferCard;
  picked: BillingInterval;
  primary: boolean;
  focus: boolean;
  pending: boolean;
  disabled: boolean;
  onChoose?: (card: OfferCard) => void;
}) {
  const t = useOfferWords();
  const format = useFormat();
  const prices = offerPrices(t, format);
  const { plan, interval } = card;
  const name = PLANS[plan].name;
  const period = card.trial ? "trial" : "month";
  const limits = card.trial ? PRO_TRIAL.limits : planLimits(plan, period);
  const savings = interval === "year" ? yearlySavingsPercent(plan) : 0;
  const note = card.trial
    ? prices.trialSentence()
    : card.endsTrial
      ? prices.endsTrialSentence(plan, interval)
      : interval !== picked
        ? t.monthlyOnly
        : interval === "year"
          ? fmt(t.aboutMonth, { price: prices.perMonth(plan) })
          : null;
  return (
    <div className="flex w-full flex-col gap-4 rounded-2xl bg-surface-muted p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base/6 font-semibold text-ink">{name}</h3>
          {card.current ? (
            <Badge className="bg-surface">{t.current}</Badge>
          ) : card.popular ? (
            <Badge variant="ink">{t.popular}</Badge>
          ) : null}
        </div>
        <p className="flex flex-wrap items-baseline gap-x-1 gap-y-1">
          <ReferencePrice plan={plan} interval={interval} className="mr-1 text-sm" />
          <span className="text-2xl font-semibold text-ink lining-nums tabular-nums">
            {prices.planPrice(plan, interval)}
          </span>
          <span aria-hidden="true" className="text-sm text-muted">
            {t.per[interval]}
          </span>
          <span className="sr-only">{t.spoken[interval]}</span>
          {savings > 0 ? (
            <Badge className="ml-1 self-center bg-surface">
              {fmt(t.save, { percent: savings })}
            </Badge>
          ) : null}
        </p>
        {note ? <p className="text-sm text-muted">{note}</p> : null}
      </div>
      <div className="flex flex-col gap-2">
        {plan === "max" ? (
          <p className="text-sm font-medium text-ink">{t.everythingInPro}</p>
        ) : null}
        <ul className="flex flex-col gap-2">
          {HIGHLIGHTS.map((feature) => (
            <Highlight key={feature}>
              {fmt(t.highlight[period], {
                count: format.number(limits[feature]),
                label: t.labels[feature],
              })}
            </Highlight>
          ))}
          {plan === "pro" ? (
            <Highlight>{fmt(t.proHighlight, { formats: TEMPLATE_IDS.length })}</Highlight>
          ) : null}
          <Highlight>
            {fmt(t.limitsHighlight, {
              resumes: format.number(resumeLimit(plan)),
              applications: format.number(applicationLimit(plan)),
            })}
          </Highlight>
        </ul>
      </div>
      {onChoose && !card.current ? (
        <Button
          variant={primary ? "primary" : "secondary"}
          className="mt-auto w-full"
          loading={pending}
          disabled={disabled}
          onClick={() => onChoose(card)}
          autoFocus={focus}
          data-autofocus={focus ? true : undefined}
        >
          {card.trial
            ? fmt(t.tryPlan, { plan: PLANS[PRO_TRIAL.plan].name, days: PRO_TRIAL.days })
            : card.endsTrial
              ? fmt(t.startNow, { plan: name })
              : fmt(t.upgradeTo, { plan: name })}
        </Button>
      ) : null}
    </div>
  );
}

function Highlight({ children }: { children: string }) {
  return (
    <li className="flex items-start gap-2 text-sm text-ink">
      <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </li>
  );
}
