"use client";

import { CreditCard } from "lucide-react";
import { useState } from "react";
import { BillingNote } from "@/components/account/billing-note";
import { SUPPORT_MAILTO } from "@/components/account/copy";
import { IntervalPicker } from "@/components/account/interval-picker";
import { PlanPicker } from "@/components/account/plan-picker";
import { PlanPerks } from "@/components/account/pro-perks";
import { ReferencePrice } from "@/components/account/reference-price";
import {
  PAYMENT_ISSUE_NOTICE,
  resumeFirstNotice,
  trialUpgradeButton,
  trialUpgradeCharge,
} from "@/components/account/trial-upgrade";
import { useBillingRedirect } from "@/components/account/use-billing-redirect";
import { useMe } from "@/components/account/use-me";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
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
import { trialEndDay } from "@/lib/usage-copy";

type Offer = Record<PaidPlanId, BillingInterval[]>;

export type UpgradeCardProps = {
  plan: PlanId;
  interval: BillingInterval | null;
  mode: BillingMode;
  offer: Offer;
  trial?: boolean;
  cancelScheduled?: boolean;
};

export function UpgradeCard({
  plan,
  interval: current,
  mode,
  offer,
  trial = false,
  cancelScheduled = false,
}: UpgradeCardProps) {
  const checkout = useBillingRedirect("checkout");
  const portal = useBillingRedirect("portal");
  const { user } = useMe();
  const endsTrial = plan !== "free" && user !== null && isTrialing(user);
  const resumeFirst = cancelScheduled && plan !== "free";
  // A paid plan moves up only on the billing period it already has.
  const lockedTo = plan !== "free" && !endsTrial ? current : null;
  const above = PAID_PLANS.filter(
    (candidate) =>
      PLAN_ORDER.indexOf(candidate) > PLAN_ORDER.indexOf(plan) &&
      (lockedTo ? offer[candidate].includes(lockedTo) : offer[candidate].length > 0),
  );
  const suggested = nextPlan(plan);
  const [picked, setPicked] = useState<PaidPlanId | null>(null);
  const [pickedInterval, setPickedInterval] = useState<BillingInterval>(current ?? "month");
  const target =
    picked && above.includes(picked)
      ? picked
      : suggested && above.includes(suggested)
        ? suggested
        : above[0];
  if (!target) return null;
  const intervals = lockedTo ? [lockedTo] : offer[target];
  const interval = intervals.includes(pickedInterval) ? pickedInterval : (intervals[0] ?? "month");
  const name = PLANS[target].name;
  const onTrial =
    trial && plan === "free" && target === PRO_TRIAL.plan && interval === PRO_TRIAL.interval;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-baseline justify-between gap-3">
          <CardTitle as="h3">{onTrial ? trialHeadline() : `Go ${name}`}</CardTitle>
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
              ? "Much more of Otto's AI help every month, for a busy job hunt. Cancel anytime."
              : resumeFirst
                ? resumeFirstNotice(target, endsTrial)
                : endsTrial
                  ? `${endsTrialSentence(target, interval)} ${trialUpgradeCharge(target, interval)}`
                  : "Even more for a long, busy search. Your subscription changes in place."}
        </CardDescription>
      </CardHeader>
      {mode === "disabled" || resumeFirst ? null : (
        <>
          <PlanPicker
            plans={above}
            value={target}
            onChange={setPicked}
            interval={interval}
            offer={offer}
          />
          <IntervalPicker
            plan={target}
            intervals={intervals}
            value={interval}
            onChange={setPickedInterval}
          />
        </>
      )}
      <PlanPerks plan={target} interval={interval} trial={onTrial} />
      <BillingNote mode={mode} />
      <CardFooter>
        {mode === "disabled" ? (
          <a
            href={SUPPORT_MAILTO}
            className={buttonClasses({ variant: "secondary", className: "w-full sm:w-auto" })}
          >
            Email us
          </a>
        ) : resumeFirst ? (
          <Button
            onClick={() => void portal.go()}
            loading={portal.pending}
            className="w-full sm:w-auto"
          >
            <CreditCard />
            Manage billing
          </Button>
        ) : (
          <Button
            onClick={() => void checkout.go(target, interval)}
            loading={checkout.pending}
            className="w-full sm:w-auto"
          >
            {onTrial
              ? `Start my ${PLANS[PRO_TRIAL.plan].name} trial`
              : endsTrial
                ? trialUpgradeButton(target, interval)
                : `Upgrade to ${name}`}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export function BillingCard({
  mode,
  trialEndsAt = null,
  paymentIssue = false,
  cancelScheduled = false,
}: {
  mode: BillingMode;
  trialEndsAt?: number | null;
  paymentIssue?: boolean;
  cancelScheduled?: boolean;
}) {
  const portal = useBillingRedirect("portal");
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h3">Billing</CardTitle>
        <CardDescription>
          {paymentIssue
            ? PAYMENT_ISSUE_NOTICE
            : trialEndsAt && cancelScheduled
              ? `Your trial ends on ${trialEndDay(trialEndsAt)} and Pro won't start, so you won't pay anything more.`
              : trialEndsAt
                ? `Cancel before ${trialEndDay(trialEndsAt)} and Pro won't start, so you won't pay anything more.`
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
          variant="secondary"
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
