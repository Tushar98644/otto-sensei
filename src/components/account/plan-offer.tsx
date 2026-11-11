"use client";

import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  allowancePeriodFor,
  FEATURE_LABELS,
  PLANS,
  planLimits,
  PRO_TRIAL,
  type BillingInterval,
  type Feature,
  type PaidPlanId,
} from "@/config/plans";
import {
  endsTrialSentence,
  perMonth,
  planPrice,
  trialHeadline,
  trialSentence,
  yearlySavingsPercent,
} from "@/lib/billing/prices";
import { TEMPLATE_IDS } from "@/lib/resume/schema";
import { perPeriod, PLAN_PROMISES, resetRule } from "@/lib/usage-copy";
import { cn } from "@/lib/utils";
import { IntervalPicker } from "./interval-picker";
import { ReferencePrice } from "./reference-price";
import type { OfferCard } from "./upgrade-offer";

const count = new Intl.NumberFormat("en-US");

const HIGHLIGHTS: readonly Feature[] = ["tailor", "letter", "fix"];

const SPOKEN: Record<BillingInterval, string> = {
  month: "per month",
  year: "per year",
  week: "per week",
};

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
        {resetRule(interval)} {PLAN_PROMISES}
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
  const { plan, interval } = card;
  const name = PLANS[plan].name;
  const period = card.trial ? "trial" : allowancePeriodFor(plan, interval);
  const limits = card.trial ? PRO_TRIAL.limits : planLimits(plan, period);
  const savings = interval === "year" ? yearlySavingsPercent(plan) : 0;
  const note = card.trial
    ? trialSentence()
    : card.endsTrial
      ? endsTrialSentence(plan, interval)
      : interval !== picked
        ? "Sold monthly only, for now."
        : interval === "year"
          ? `About ${perMonth(plan)} a month.`
          : null;
  return (
    <div className="flex w-full flex-col gap-4 rounded-2xl bg-surface-muted p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base/6 font-semibold text-ink">{name}</h3>
          {card.current ? (
            <Badge className="bg-surface">Current plan</Badge>
          ) : card.popular ? (
            <Badge variant="ink">Most popular</Badge>
          ) : null}
        </div>
        <p className="flex flex-wrap items-baseline gap-x-1 gap-y-1">
          <ReferencePrice plan={plan} interval={interval} className="mr-1 text-sm" />
          <span className="text-2xl font-semibold text-ink lining-nums tabular-nums">
            {planPrice(plan, interval)}
          </span>
          <span aria-hidden="true" className="text-sm text-muted">
            /{interval}
          </span>
          <span className="sr-only">{SPOKEN[interval]}</span>
          {savings > 0 ? (
            <Badge className="ml-1 self-center bg-surface">Save {savings}%</Badge>
          ) : null}
        </p>
        {note ? <p className="text-sm text-muted">{note}</p> : null}
      </div>
      <div className="flex flex-col gap-2">
        {plan === "max" ? (
          <p className="text-sm font-medium text-ink">Everything in Pro, with more:</p>
        ) : null}
        <ul className="flex flex-col gap-2">
          {HIGHLIGHTS.map((feature) => (
            <Highlight key={feature}>
              {`${count.format(limits[feature])} ${FEATURE_LABELS[feature]} ${perPeriod(period)}`}
            </Highlight>
          ))}
          {plan === "pro" ? (
            <Highlight>{`All ${TEMPLATE_IDS.length} formats, Word downloads and every job match`}</Highlight>
          ) : null}
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
            ? trialHeadline()
            : card.endsTrial
              ? `Start ${name} now`
              : `Upgrade to ${name}`}
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
