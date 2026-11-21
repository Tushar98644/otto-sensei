"use client";

import { Check } from "lucide-react";
import { useId, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FEATURE_LABELS,
  PLAN_ORDER,
  PLANS,
  planLimits,
  PRO_TRIAL,
  type BillingInterval,
  type Feature,
  type PaidPlanId,
} from "@/config/plans";
import {
  perMonth,
  planPrice,
  planPriceLabel,
  trialHeadline,
  trialPrice,
  trialSentence,
  yearlySavingsPercent,
} from "@/lib/billing/prices";
import { TEMPLATE_IDS } from "@/lib/resume/schema";
import { perPeriod, PLAN_PROMISES, resetRule } from "@/lib/usage-copy";
import { IntervalPicker } from "./interval-picker";
import { ReferencePrice } from "./reference-price";
import type { OfferCard } from "./upgrade-offer";

const count = new Intl.NumberFormat("en-US");

const HIGHLIGHTS: readonly Feature[] = ["tailor", "letter", "fix"];

const SPOKEN: Record<BillingInterval, string> = {
  month: "per month",
  year: "per year",
};

function offerCta(card: OfferCard): string {
  const name = PLANS[card.plan].name;
  if (card.trial) return trialHeadline();
  return card.endsTrial ? `Start ${name} now` : `Upgrade to ${name}`;
}

// Ending a trial gets no note here: the dialog's description already spells out that charge.
function offerNote(card: OfferCard, picked: BillingInterval): string | null {
  if (card.trial) return trialSentence();
  if (card.endsTrial) return null;
  if (card.interval !== picked) return "Sold monthly only, for now.";
  return card.interval === "year" ? `About ${perMonth(card.plan)} a month.` : null;
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

// One plan in focus, so the dialog has one action; any other plan is a quiet switch under it.
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
  const [switchedTo, setSwitchedTo] = useState<PaidPlanId | null>(null);
  const buyable = cards.filter((card) => !card.current);
  const wanted = switchedTo ?? focusPlan ?? cards.find((card) => card.popular)?.plan;
  const shown = buyable.find((card) => card.plan === wanted) ?? buyable[0];
  if (!shown) return null;
  const others = buyable.filter((card) => card.plan !== shown.plan);
  return (
    <div className="flex flex-col gap-4">
      <IntervalPicker intervals={intervals} value={interval} onChange={onIntervalChange} />
      <PlanPanel
        card={shown}
        picked={interval}
        pending={pendingPlan === shown.plan}
        disabled={disabled || (pendingPlan !== null && pendingPlan !== shown.plan)}
        onChoose={onChoose}
      />
      {/* Keyed by place, so the switch keeps focus when it flips to the other plan. */}
      {others.map((card, index) => (
        <OtherPlan
          key={index}
          card={card}
          shown={shown.plan}
          disabled={pendingPlan !== null}
          onSelect={setSwitchedTo}
        />
      ))}
      <p className="text-xs/5 text-pretty text-muted">
        {resetRule(interval)} {PLAN_PROMISES}
      </p>
    </div>
  );
}

function PlanPanel({
  card,
  picked,
  pending,
  disabled,
  onChoose,
}: {
  card: OfferCard;
  picked: BillingInterval;
  pending: boolean;
  disabled: boolean;
  onChoose?: (card: OfferCard) => void;
}) {
  const titleId = useId();
  const { plan, interval } = card;
  const name = PLANS[plan].name;
  const period = card.trial ? "trial" : "month";
  const limits = card.trial ? PRO_TRIAL.limits : planLimits(plan, period);
  const savings = interval === "year" ? yearlySavingsPercent(plan) : 0;
  const note = offerNote(card, picked);
  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-4 rounded-2xl bg-surface-muted p-5 sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 id={titleId} className="text-base/6 font-semibold text-ink">
            {name}
          </h3>
          <p className="flex flex-wrap items-baseline gap-x-1">
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
        </div>
        {note ? <p className="text-sm/6 text-pretty text-muted">{note}</p> : null}
      </div>
      {onChoose ? (
        <Button
          className="w-full"
          loading={pending}
          disabled={disabled}
          onClick={() => onChoose(card)}
          data-autofocus
        >
          {offerCta(card)}
        </Button>
      ) : null}
      <div className="flex flex-col gap-2 border-t border-border pt-4">
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
    </section>
  );
}

function OtherPlan({
  card,
  shown,
  disabled,
  onSelect,
}: {
  card: OfferCard;
  shown: PaidPlanId;
  disabled: boolean;
  onSelect: (plan: PaidPlanId) => void;
}) {
  const name = PLANS[card.plan].name;
  const price = planPriceLabel(card.plan, card.interval);
  const bigger = PLAN_ORDER.indexOf(card.plan) > PLAN_ORDER.indexOf(shown);
  const line = bigger
    ? `Need more? ${name} is ${price}.`
    : card.trial
      ? `${name} is ${price}, or ${trialPrice()} for a ${PRO_TRIAL.days}-day trial.`
      : `${name} is ${price}.`;
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 text-sm/6 text-muted">
      <p>{line}</p>
      <Button
        variant="link"
        disabled={disabled}
        onClick={() => onSelect(card.plan)}
        className="min-h-11 px-0 text-sm"
      >
        See {name}
      </Button>
    </div>
  );
}

function Highlight({ children }: { children: string }) {
  return (
    <li className="flex items-start gap-2 text-sm/6 text-ink">
      <Check className="mt-1 size-4 shrink-0 text-muted" aria-hidden />
      <span>{children}</span>
    </li>
  );
}
