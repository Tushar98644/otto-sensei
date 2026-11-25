"use client";

import { CircleCheck, CircleX, CreditCard, TriangleExclamationPoint } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { BillingNote } from "@/components/account/billing-note";
import { KeepLogLine } from "@/components/career-log/keep-log-line";
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
import { trialPriceIn } from "@/components/account/local-prices";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import {
  nextStep,
  planName,
  planPill,
  priceParts,
  yearlyOffer,
  type Pill,
  type PlanView,
  type PlanWords,
} from "./plan-copy";

export function PlanPill({ pill }: { pill: Pill }) {
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
  const words = useMessages("account").plan;
  const format = useFormat();
  const now = useNow();
  const portal = useBillingRedirect("portal");
  const checkout = useBillingRedirect("checkout");
  const price = priceParts(words, format, view);
  const mode = me.billing.mode;
  const yearly = mode === "disabled" ? null : yearlyOffer(words, format, view, me.billing.offer);

  return (
    <Card id="plan" role="region" aria-labelledby="plan-title" className="gap-5 sm:gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <Eyebrow aria-hidden>{words.eyebrow}</Eyebrow>
          <div className="flex flex-wrap items-center gap-3">
            <h2
              id="plan-title"
              className="font-display text-3xl/9 font-normal tracking-tight text-ink sm:text-4xl/10"
            >
              <span className="sr-only">{words.srTitle}</span>
              {planName(view)}
            </h2>
            <PlanPill pill={planPill(words, format, view, now)} />
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
          title={words.heldTitle}
          action={
            <Button onClick={() => void portal.go()} loading={portal.pending}>
              <CreditCard />
              {words.updateCard}
            </Button>
          }
        >
          {words.heldDetail}
        </Alert>
      ) : (
        <>
          <p className="max-w-prose text-sm/6 text-pretty text-muted">
            {nextStep(words, format, view)}
          </p>
          <PlanActions
            words={words}
            view={view}
            onChangePlan={onChangePlan}
            portal={portal}
            checkout={checkout}
            billingOff={mode === "disabled"}
          />
          {view.kind !== "free" && !view.ending && mode !== "disabled" ? <KeepLogLine /> : null}
        </>
      )}

      {yearly ? <YearlyRow label={words.howToSwitch} line={yearly.line} how={yearly.how} /> : null}

      {mode === "mock" && view.kind !== "free" ? (
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <Badge>{words.testMode}</Badge>
          {words.testModeLine}
        </p>
      ) : view.kind === "free" ? (
        <BillingNote mode={mode} />
      ) : null}
    </Card>
  );
}

function YearlyRow({ label, line, how }: { label: string; line: string; how: string }) {
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
          {label}
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
  words,
  view,
  onChangePlan,
  portal,
  checkout,
  billingOff,
}: {
  words: PlanWords;
  view: Exclude<PlanView, { kind: "held" }>;
  onChangePlan: () => void;
  portal: Redirect;
  checkout: Redirect;
  billingOff: boolean;
}) {
  const format = useFormat();
  const compare = (
    <Link
      href={ROUTES.pricing}
      className={buttonClasses({ variant: "ghost", className: "w-full sm:w-auto" })}
    >
      {words.compare}
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
            {fmt(words.tryFor, { plan: PLANS[PRO_TRIAL.plan].name, price: trialPriceIn(format) })}
          </Button>
        ) : (
          <Button onClick={onChangePlan} className="w-full sm:w-auto">
            {fmt(words.upgradeTo, { plan: PLANS.pro.name })}
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
          {view.kind === "trial" ? words.resumeTrial : words.resumePlan}
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
          {words.change}
        </Button>
      )}
      <Button
        variant="ghost"
        onClick={() => void portal.go()}
        loading={portal.pending}
        className="w-full sm:w-auto"
      >
        {view.kind === "trial" ? words.cancelTrial : words.cancelPlan}
      </Button>
    </div>
  );
}
