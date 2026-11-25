"use client";

import Link from "next/link";
import { useState } from "react";
import { LazyUpgradeDialog } from "@/components/account/lazy-dialogs";
import type { Me } from "@/components/account/use-me";
import { ROUTES } from "@/components/site/routes";
import { buttonClasses } from "@/components/ui/button";
import { nextPlan } from "@/config/plans";
import type { SessionUser } from "@/lib/auth/types";
import { BillingHistoryCard } from "./billing-history";
import { CreditCard } from "./credit-card";
import { PaymentMethodCard } from "./payment-method";
import { maxLine, planView } from "./plan-copy";
import { PlanSummary } from "./plan-summary";
import { useBillingHistory } from "./use-billing-history";
import { UsageMeters } from "./usage-meters";

export function PlanTab({ me, user }: { me: Me; user: SessionUser }) {
  const [changing, setChanging] = useState(false);
  const history = useBillingHistory(me);
  const view = planView(me);
  if (!view) return null;
  const billed = view.kind !== "free";
  const ending = (view.kind === "trial" || view.kind === "paid") && view.ending;
  const paidBefore = (history.history?.payments.length ?? 0) > 0;
  const upgradable = nextPlan(user.plan) !== null && view.kind !== "held";

  return (
    <div className="flex flex-col gap-4">
      <PlanSummary me={me} view={view} onChangePlan={() => setChanging(true)} />
      <UsageMeters
        me={me}
        plan={user.plan}
        onUpgrade={upgradable ? () => setChanging(true) : undefined}
      />
      {me.billing.credit && (me.billing.credit.usable || me.billing.credit.balanceCents > 0) ? (
        <CreditCard
          me={me}
          plan={user.plan}
          onUpgrade={upgradable ? () => setChanging(true) : undefined}
        />
      ) : null}
      {history.status !== "off" && billed ? <PaymentMethodCard state={history} /> : null}
      {history.status !== "off" && (billed || paidBefore) ? (
        <BillingHistoryCard state={history} />
      ) : null}
      {user.plan === "pro" && !ending ? (
        <div className="flex flex-col gap-1 rounded-2xl bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
          <p className="text-sm/6 text-muted">{maxLine()}</p>
          <Link
            href={ROUTES.pricing}
            className={buttonClasses({ variant: "link", className: "self-start text-sm sm:self-auto" })}
          >
            Compare plans
          </Link>
        </div>
      ) : null}
      {/* One dialog for Change plan and the near-limit note: it opens on the next plan up, priced before any charge. */}
      <LazyUpgradeDialog open={changing} onOpenChange={setChanging} />
    </div>
  );
}
