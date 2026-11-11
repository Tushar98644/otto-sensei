"use client";

import { CreditCard } from "lucide-react";
import { useState } from "react";
import { BillingNote } from "@/components/account/billing-note";
import { SUPPORT_MAILTO } from "@/components/account/copy";
import { IntervalPicker } from "@/components/account/interval-picker";
import { PlanPicker } from "@/components/account/plan-picker";
import { PlanPerks } from "@/components/account/pro-perks";
import { ReferencePrice } from "@/components/account/reference-price";
import { useBillingRedirect } from "@/components/account/use-billing-redirect";
import { useMe } from "@/components/account/use-me";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  allowancePeriodFor,
  isTrialing,
  nextPlan,
  PAID_PLANS,
  PLAN_ORDER,
  PLANS,
  PRO_TRIAL,
  type BillingInterval,
  type PaidPlanId,
  type PlanId,
} from "@/config/plans";
import { endsTrialSentence, planPrice, trialHeadline, trialSentence } from "@/lib/billing/prices";
import type { BillingMode } from "@/lib/billing/types";
import { periodNoun, trialEndDay } from "@/lib/usage-copy";

type Offer = Record<PaidPlanId, BillingInterval[]>;

export type UpgradeCardProps = {
  plan: PlanId;
  // How often the current plan bills, picked first so a weekly subscriber sees the weekly option.
  interval: BillingInterval | null;
  mode: BillingMode;
  offer: Offer;
  // Pro monthly would start with the free trial for this account.
  trial?: boolean;
};

// Straight to checkout. Pro to Max changes the subscription in place (see createCheckoutUrl); on
// the Pro trial it's a new checkout that ends the trial, and the card says so.
export function UpgradeCard({ plan, interval: current, mode, offer, trial = false }: UpgradeCardProps) {
  const checkout = useBillingRedirect("checkout");
  const { user } = useMe();
  const endsTrial = plan !== "free" && user !== null && isTrialing(user);
  const above = PAID_PLANS.filter(
    (candidate) => PLAN_ORDER.indexOf(candidate) > PLAN_ORDER.indexOf(plan) && offer[candidate].length > 0,
  );
  const suggested = nextPlan(plan);
  const [picked, setPicked] = useState<PaidPlanId | null>(null);
  const [pickedInterval, setPickedInterval] = useState<BillingInterval>(current ?? "month");
  const target =
    picked && above.includes(picked) ? picked : suggested && above.includes(suggested) ? suggested : above[0];
  if (!target) return null;
  const intervals = offer[target];
  const interval = intervals.includes(pickedInterval) ? pickedInterval : (intervals[0] ?? "month");
  const name = PLANS[target].name;
  const onTrial =
    trial && plan === "free" && target === PRO_TRIAL.plan && interval === PRO_TRIAL.interval;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-baseline justify-between gap-3">
          <CardTitle as="h2">{onTrial ? trialHeadline() : `Go ${name}`}</CardTitle>
          <p className="flex items-baseline gap-1.5 text-ink">
            <ReferencePrice plan={target} interval={interval} className="text-base" />
            <span className="text-2xl font-semibold lining-nums tabular-nums">
              {planPrice(target, interval)}
            </span>
            <span className="text-sm text-muted">/{interval}</span>
          </p>
        </div>
        <CardDescription>
          {onTrial
            ? `${trialSentence()} Otto's AI help, with its limits written down.`
            : plan === "free"
              ? `Otto's AI help every ${periodNoun(allowancePeriodFor(target, interval))}, for a busy job hunt. Cancel anytime.`
              : endsTrial
                ? endsTrialSentence(target, interval)
                : "Even more for a long, busy search. Your subscription changes in place."}
        </CardDescription>
      </CardHeader>
      {mode === "disabled" ? null : (
        <>
          <PlanPicker
            plans={above}
            value={target}
            onChange={setPicked}
            interval={interval}
            offer={offer}
          />
          <IntervalPicker plan={target} intervals={intervals} value={interval} onChange={setPickedInterval} />
        </>
      )}
      <PlanPerks plan={target} interval={interval} trial={onTrial} />
      <BillingNote mode={mode} />
      <CardFooter>
        {mode === "disabled" ? (
          <a
            href={SUPPORT_MAILTO}
            className={buttonClasses({ variant: "outline", className: "w-full sm:w-auto" })}
          >
            Email us
          </a>
        ) : (
          <Button
            onClick={() => void checkout.go(target, interval)}
            loading={checkout.pending}
            className="w-full sm:w-auto"
          >
            {onTrial
              ? "Start my free trial"
              : endsTrial
                ? `Start ${name} now`
                : `Upgrade to ${name}`}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

// A paid plan: card changes, invoices and cancelling all live in the payment provider's portal.
export function BillingCard({ mode, trialEndsAt = null }: { mode: BillingMode; trialEndsAt?: number | null }) {
  const portal = useBillingRedirect("portal");
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Billing</CardTitle>
        <CardDescription>
          {trialEndsAt
            ? `Nothing is charged during your trial. Cancel before ${trialEndDay(trialEndsAt)} and you won't pay anything.`
            : "Update your card, get invoices, or cancel your plan."}
        </CardDescription>
      </CardHeader>
      {mode === "mock" ? (
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <Badge>Test mode</Badge>
          Managing billing switches you back to Free.
        </p>
      ) : null}
      <CardFooter>
        <Button
          variant="outline"
          onClick={() => void portal.go()}
          loading={portal.pending}
          className="w-full sm:w-auto"
        >
          <CreditCard />
          Manage billing
        </Button>
      </CardFooter>
    </Card>
  );
}
