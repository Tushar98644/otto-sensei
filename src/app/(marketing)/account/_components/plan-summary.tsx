"use client";

import { CircleCheck, CircleX, CreditCard, TriangleExclamationPoint } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { BillingNote } from "@/components/account/billing-note";
import { useBillingRedirect } from "@/components/account/use-billing-redirect";
import type { Me } from "@/components/account/use-me";
import { ROUTES } from "@/components/site/routes";
import { useNow } from "@/components/studio/use-now";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { LivePill } from "@/components/ui/live-pill";
import { PLANS, PRO_TRIAL } from "@/config/plans";
import { trialPrice } from "@/lib/billing/prices";
import {
  HELD_DETAIL,
  HELD_TITLE,
  nextStep,
  planName,
  planPill,
  priceParts,
  yearlyOffer,
  type Pill,
  type PlanView,
} from "./plan-copy";

export function PlanPill({ pill }: { pill: Pill | null }) {
  if (!pill) return null;
  switch (pill.tone) {
    case "live":
      return (
        <LivePill announce={false} className="h-6 animate-none gap-1.5 px-2.5 text-xs">
          {pill.label}
        </LivePill>
      );
    case "pass":
      return (
        <Badge variant="pass">
          <CircleCheck className="text-pass" />
          {pill.label}
        </Badge>
      );
    case "fail":
      return (
        <Badge variant="fail">
          <CircleX className="text-fail" />
          {pill.label}
        </Badge>
      );
    case "warn":
      return (
        <Badge variant="warn">
          <TriangleExclamationPoint className="text-warn" />
          {pill.label}
        </Badge>
      );
    case "neutral":
      return <Badge>{pill.label}</Badge>;
  }
}

type Redirect = ReturnType<typeof useBillingRedirect>;

export function PlanSummary({
  me,
  view,
  onChangePlan,
}: {
  me: Me;
  view: PlanView;
  onChangePlan: () => void;
}) {
  const now = useNow();
  const portal = useBillingRedirect("portal");
  const checkout = useBillingRedirect("checkout");
  const price = priceParts(view);
  const mode = me.billing.mode;
  const yearly = mode === "disabled" ? null : yearlyOffer(view, me.billing.offer);

  return (
    <Card id="plan" role="region" aria-labelledby="plan-title" className="gap-5 sm:gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <Eyebrow aria-hidden>Your plan</Eyebrow>
          <div className="flex flex-wrap items-center gap-3">
            <h2
              id="plan-title"
              className="font-display text-3xl/9 font-normal tracking-tight text-ink sm:text-4xl/10"
            >
              <span className="sr-only">Your plan: </span>
              {planName(view)}
            </h2>
            <PlanPill pill={planPill(view, now)} />
          </div>
        </div>
        {price ? (
          <div className="flex flex-col sm:items-end">
            <p className="flex items-baseline gap-0.5 text-ink">
              <span className="text-2xl font-semibold lining-nums tabular-nums">
                {price.amount}
              </span>
              {price.per ? <span className="text-sm text-muted">{price.per}</span> : null}
            </p>
            {price.note ? <p className="text-sm text-muted">{price.note}</p> : null}
          </div>
        ) : null}
      </div>

      {view.kind === "held" ? (
        <Alert
          variant="error"
          title={HELD_TITLE}
          action={
            <Button onClick={() => void portal.go()} loading={portal.pending}>
              <CreditCard />
              Update card
            </Button>
          }
        >
          {HELD_DETAIL}
        </Alert>
      ) : (
        <>
          <p className="max-w-prose text-sm/6 text-pretty text-muted">{nextStep(view)}</p>
          <PlanActions
            view={view}
            onChangePlan={onChangePlan}
            portal={portal}
            checkout={checkout}
            billingOff={mode === "disabled"}
          />
        </>
      )}

      {yearly ? <YearlyRow line={yearly.line} how={yearly.how} /> : null}

      {mode === "mock" && view.kind !== "free" ? (
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <Badge>Test mode</Badge>
          Cancelling or updating your card switches you back to Free.
        </p>
      ) : view.kind === "free" ? (
        <BillingNote mode={mode} />
      ) : null}
    </Card>
  );
}

function YearlyRow({ line, how }: { line: string; how: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-2 border-t border-border pt-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p className="text-sm/6 text-ink">{line}</p>
        <Button
          variant="link"
          size="sm"
          aria-expanded={open}
          aria-controls="yearly-how"
          onClick={() => setOpen((shown) => !shown)}
          className="self-start px-0 sm:self-auto"
        >
          How to switch
        </Button>
      </div>
      {open ? (
        <p id="yearly-how" className="max-w-prose text-sm/6 text-muted">
          {how}
        </p>
      ) : null}
    </div>
  );
}

function PlanActions({
  view,
  onChangePlan,
  portal,
  checkout,
  billingOff,
}: {
  view: Exclude<PlanView, { kind: "held" }>;
  onChangePlan: () => void;
  portal: Redirect;
  checkout: Redirect;
  billingOff: boolean;
}) {
  const compare = (
    <Link
      href={ROUTES.pricing}
      className={buttonClasses({ variant: "ghost", className: "w-full sm:w-auto" })}
    >
      Compare plans
    </Link>
  );
  const row = "flex flex-col gap-2 sm:flex-row sm:flex-wrap";

  if (view.kind === "free") {
    if (billingOff) return <div className={row}>{compare}</div>;
    return (
      <div className={row}>
        {view.trialOffered ? (
          <Button
            onClick={() => void checkout.go(PRO_TRIAL.plan, PRO_TRIAL.interval)}
            loading={checkout.pending}
            className="w-full sm:w-auto"
          >
            Try {PLANS[PRO_TRIAL.plan].name} for {trialPrice()}
          </Button>
        ) : (
          <Button onClick={onChangePlan} className="w-full sm:w-auto">
            Upgrade to {PLANS.pro.name}
          </Button>
        )}
        {compare}
      </div>
    );
  }

  if (billingOff) return <div className={row}>{compare}</div>;

  if (view.ending) {
    return (
      <div className={row}>
        <Button
          variant="secondary"
          onClick={() => void portal.go()}
          loading={portal.pending}
          className="w-full sm:w-auto"
        >
          {view.kind === "trial" ? "Resume trial" : "Resume plan"}
        </Button>
        {compare}
      </div>
    );
  }

  return (
    <div className={row}>
      {view.plan === "max" ? (
        compare
      ) : (
        <Button variant="secondary" onClick={onChangePlan} className="w-full sm:w-auto">
          Change plan
        </Button>
      )}
      <Button
        variant="ghost"
        onClick={() => void portal.go()}
        loading={portal.pending}
        className="w-full sm:w-auto"
      >
        {view.kind === "trial" ? "Cancel trial" : "Cancel plan"}
      </Button>
    </div>
  );
}
