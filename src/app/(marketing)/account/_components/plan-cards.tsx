"use client";

import { CreditCard } from "lucide-react";
import { useState } from "react";
import { BillingNote } from "@/components/account/billing-note";
import { SUPPORT_MAILTO } from "@/components/account/copy";
import { IntervalPicker } from "@/components/account/interval-picker";
import { PlanPicker } from "@/components/account/plan-picker";
import { PlanPerks } from "@/components/account/pro-perks";
import { useBillingRedirect } from "@/components/account/use-billing-redirect";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  allowancePeriodFor,
  nextPlan,
  PAID_PLANS,
  PLAN_ORDER,
  PLANS,
  type BillingInterval,
  type PaidPlanId,
  type PlanId,
} from "@/config/plans";
import { planPrice } from "@/lib/billing/prices";
import type { BillingMode } from "@/lib/billing/types";
import { periodNoun } from "@/lib/usage-copy";

type Offer = Record<PaidPlanId, BillingInterval[]>;

export type UpgradeCardProps = {
  plan: PlanId;
  // How often the current plan bills, picked first so a weekly subscriber sees the weekly option.
  interval: BillingInterval | null;
  mode: BillingMode;
  offer: Offer;
};

// The plans above this one, straight to checkout with no dialog in between. Pro to Max changes
// the subscription in place (see createCheckoutUrl), so it's one click there too.
export function UpgradeCard({ plan, interval: current, mode, offer }: UpgradeCardProps) {
  const checkout = useBillingRedirect("checkout");
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
  return (
    <Card>
      <CardHeader>
        <div className="flex items-baseline justify-between gap-3">
          <CardTitle as="h2">Go {name}</CardTitle>
          <p className="text-ink">
            <span className="text-2xl font-semibold lining-nums tabular-nums">
              {planPrice(target, interval)}
            </span>
            <span className="text-sm text-muted">/{interval}</span>
          </p>
        </div>
        <CardDescription>
          {plan === "free"
            ? `More from Otto every ${periodNoun(allowancePeriodFor(target, interval))}, for a busy job hunt. Cancel anytime.`
            : "Even more for a long, busy search. Your subscription changes in place."}
        </CardDescription>
      </CardHeader>
      {mode === "disabled" ? null : (
        <>
          <PlanPicker plans={above} value={target} onChange={setPicked} />
          <IntervalPicker plan={target} intervals={intervals} value={interval} onChange={setPickedInterval} />
        </>
      )}
      <PlanPerks plan={target} interval={interval} />
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
            Upgrade to {name}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

// A paid plan: card changes, invoices and cancelling all live in the payment provider's portal.
export function BillingCard({ mode }: { mode: BillingMode }) {
  const portal = useBillingRedirect("portal");
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Billing</CardTitle>
        <CardDescription>Update your card, get invoices, or cancel your plan.</CardDescription>
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
