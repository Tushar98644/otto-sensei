"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { LazyAddCreditDialog } from "@/components/account/lazy-dialogs";
import type { Me } from "@/components/account/use-me";
import { OttoNote } from "@/components/mascot/otto-note";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PLANS, type PlanId } from "@/config/plans";
import {
  buysSentence,
  centsText,
  CREDIT_LABEL_ONE,
  CREDIT_LABELS,
  creditBuys,
  TOPUP_LIMITS,
} from "@/config/topup";
import type { CreditInfo } from "@/lib/api/types";
import type { CreditEntry } from "@/lib/billing/credit-types";
import { useAppQueryClient } from "@/lib/queries/client";
import { creditQuery } from "@/lib/queries/options";
import { cn } from "@/lib/utils";
import { billingDate } from "./billing-format";

const count = new Intl.NumberFormat("en-US");
const MAX_OVER_PRO_CENTS = (PLANS.max.priceUsd - PLANS.pro.priceUsd) * 100;

// Past Max's extra cost in one month of credit, Max would have been the cheaper way.
export function maxIsCheaper(plan: PlanId, credit: CreditInfo): boolean {
  return plan === "pro" && credit.monthCents > MAX_OVER_PRO_CENTS;
}

export function maxHint(credit: CreditInfo): string {
  const extra = centsText(MAX_OVER_PRO_CENTS);
  const { max, pro } = PLANS;
  const more = `${count.format(max.limits.tailor)} ${CREDIT_LABELS.tailor} a month to ${pro.name}'s ${count.format(pro.limits.tailor)}`;
  return `You've added ${centsText(credit.monthCents)} of credit this month. ${max.name} costs ${extra} more than ${pro.name} and has ${more}.`;
}

function entryText(entry: CreditEntry): string {
  if (entry.kind === "added") return "Credit added";
  if (entry.kind === "taken_back") return "Credit taken back after a refund";
  if (!entry.feature) return "AI help";
  const label = entry.count === 1 ? CREDIT_LABEL_ONE[entry.feature] : CREDIT_LABELS[entry.feature];
  return `${count.format(entry.count)} ${label}`;
}

function History({ userId, balance }: { userId: string; balance: number }) {
  const client = useAppQueryClient();
  const query = useQuery({ ...creditQuery(userId, balance), retry: 1 }, client);
  if (query.isError) {
    return (
      <Alert
        variant="error"
        title="Couldn't load your credit history"
        action={
          <Button variant="secondary" onClick={() => void query.refetch()}>
            Try again
          </Button>
        }
      >
        Check your connection, then try again.
      </Alert>
    );
  }
  if (!query.data) {
    return (
      <div aria-hidden className="flex flex-col gap-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }
  if (query.data.length === 0) return <p className="text-sm text-muted">Nothing yet.</p>;
  return (
    <ul className="divide-y divide-border border-y border-border">
      {query.data.map((entry) => (
        <li
          key={`${entry.kind}:${entry.at}:${entry.feature ?? ""}`}
          className="flex items-center gap-3 py-2.5 text-sm"
        >
          <span className="w-28 shrink-0 text-muted tabular-nums">{billingDate(entry.at)}</span>
          <span className="min-w-0 flex-1 text-ink">{entryText(entry)}</span>
          <span className={cn("tabular-nums", entry.kind === "added" ? "text-pass" : "text-ink")}>
            {entry.kind === "added" ? "+" : "−"}
            {centsText(entry.cents)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function CreditCard({
  me,
  plan,
  onUpgrade,
}: {
  me: Me;
  plan: PlanId;
  onUpgrade?: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState(false);
  const credit = me.billing.credit;
  const userId = me.user?.id;
  if (!credit || !userId) return null;
  const balance = credit.balanceCents;
  const tailored = creditBuys(balance, "tailor");

  return (
    <Card id="credit" role="region" aria-labelledby="credit-title">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <CardTitle as="h2" id="credit-title">
          Credit
        </CardTitle>
        <p className="text-sm text-subtle">Never expires</p>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="flex items-baseline gap-2">
            <span className="font-display text-3xl/9 text-ink lining-nums tabular-nums">
              {balance > 0 ? centsText(balance) : "$0"}
            </span>
            <span className="text-sm text-muted">
              {tailored > 0
                ? `about ${count.format(tailored)} ${tailored === 1 ? CREDIT_LABEL_ONE.tailor : CREDIT_LABELS.tailor}`
                : "No credit yet"}
            </span>
          </p>
          <p className="text-sm/6 text-muted">
            {credit.usable
              ? "Used only once this month's allowance runs out."
              : `Credit works on ${PLANS.pro.name} and ${PLANS.max.name}, once any trial has ended. Your balance waits until then.`}
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => setAdding(true)}
          disabled={!credit.usable}
          className="w-full sm:w-auto"
        >
          Add credit
        </Button>
      </div>
      <p className="text-sm/6 text-subtle">
        {buysSentence(1)}. From ${TOPUP_LIMITS.minUsd}, in whole dollars.
      </p>
      {maxIsCheaper(plan, credit) ? (
        <OttoNote size="sm" live={false} message={maxHint(credit)}>
          {onUpgrade ? (
            <Button variant="link" onClick={onUpgrade} className="text-sm">
              Upgrade to {PLANS.max.name}
            </Button>
          ) : null}
        </OttoNote>
      ) : null}
      <div className="flex flex-col gap-4">
        <Button
          variant="ghost"
          size="sm"
          aria-expanded={open}
          aria-controls="credit-history"
          onClick={() => setOpen((shown) => !shown)}
          className="-ml-3 self-start"
        >
          {open ? "Hide credit history" : "Show credit history"}
          <ChevronDown className={cn("transition-transform", open && "rotate-180")} />
        </Button>
        {open ? (
          <div id="credit-history">
            <History userId={userId} balance={balance} />
          </div>
        ) : null}
      </div>
      <LazyAddCreditDialog open={adding} onOpenChange={setAdding} />
    </Card>
  );
}
