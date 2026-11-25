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
import { PLANS, type Feature, type PlanId } from "@/config/plans";
import { centsIn, usdIn } from "@/components/account/local-prices";
import { creditBuys, TOPUP_LIMITS } from "@/config/topup";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import type { Messages } from "@/i18n/messages";
import type { CreditInfo } from "@/lib/api/types";
import type { CreditEntry } from "@/lib/billing/credit-types";
import { useAppQueryClient } from "@/lib/queries/client";
import { creditQuery } from "@/lib/queries/options";
import { cn } from "@/lib/utils";
import { billingDate } from "./billing-format";

type CreditWords = Messages["account"]["credit"];

const MAX_OVER_PRO_CENTS = (PLANS.max.priceUsd - PLANS.pro.priceUsd) * 100;
// The features config/topup's buysSentence names, in its order.
const BUYS_SHOWN: readonly Feature[] = ["tailor", "letter", "fix"];

// Past Max's extra cost in one month of credit, Max would have been the cheaper way.
export function maxIsCheaper(plan: PlanId, credit: CreditInfo): boolean {
  return plan === "pro" && credit.monthCents > MAX_OVER_PRO_CENTS;
}

export function maxHint(words: CreditWords, format: Format, credit: CreditInfo): string {
  const { max, pro } = PLANS;
  return fmt(words.maxHint, {
    added: centsIn(format, credit.monthCents),
    max: max.name,
    extra: centsIn(format, MAX_OVER_PRO_CENTS),
    pro: pro.name,
    more: format.number(max.limits.tailor),
    less: format.number(pro.limits.tailor),
  });
}

// "$1 = 3 tailored versions, 10 letters or 40 line fixes", as config/topup's buysSentence.
export function buysLine(words: CreditWords, format: Format, usd: number): string {
  const parts = BUYS_SHOWN.filter((feature) => creditBuys(usd * 100, feature) > 0).map((feature) =>
    format.plural(words.labels[feature], creditBuys(usd * 100, feature)),
  );
  const last = parts.pop() ?? "";
  const list = parts.length ? fmt(words.or, { list: parts.join(", "), last }) : last;
  return fmt(words.buys, { price: usdIn(format, usd), list });
}

function entryText(words: CreditWords, format: Format, entry: CreditEntry): string {
  if (entry.kind === "added") return words.added;
  if (entry.kind === "taken_back") return words.takenBack;
  if (!entry.feature) return words.aiHelp;
  return format.plural(words.labels[entry.feature], entry.count);
}

function History({ userId, balance }: { userId: string; balance: number }) {
  const account = useMessages("account");
  const words = account.credit;
  const format = useFormat();
  const client = useAppQueryClient();
  const query = useQuery({ ...creditQuery(userId, balance), retry: 1 }, client);
  if (query.isError) {
    return (
      <Alert
        variant="error"
        title={words.historyFailed}
        action={
          <Button variant="secondary" onClick={() => void query.refetch()}>
            {account.tryAgain}
          </Button>
        }
      >
        {account.checkConnection}
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
  if (query.data.length === 0) return <p className="text-sm text-muted">{words.nothing}</p>;
  return (
    <ul className="divide-y divide-border border-y border-border">
      {query.data.map((entry) => (
        <li
          key={`${entry.kind}:${entry.at}:${entry.feature ?? ""}`}
          className="flex items-center gap-3 py-2.5 text-sm"
        >
          <span className="w-28 shrink-0 text-muted tabular-nums">
            {billingDate(format, entry.at)}
          </span>
          <span className="min-w-0 flex-1 text-ink">{entryText(words, format, entry)}</span>
          <span className={cn("tabular-nums", entry.kind === "added" ? "text-pass" : "text-ink")}>
            {entry.kind === "added" ? "+" : "−"}
            {centsIn(format, entry.cents)}
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
  const account = useMessages("account");
  const words = account.credit;
  const format = useFormat();
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
          {words.title}
        </CardTitle>
        <p className="text-sm text-subtle">{words.neverExpires}</p>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="flex items-baseline gap-2">
            <span className="font-display text-3xl/9 text-ink lining-nums tabular-nums">
              {balance > 0 ? centsIn(format, balance) : usdIn(format, 0)}
            </span>
            <span className="text-sm text-muted">
              {tailored > 0 ? format.plural(words.about, tailored) : words.none}
            </span>
          </p>
          <p className="text-sm/6 text-muted">
            {credit.usable
              ? words.usable
              : fmt(words.waits, { pro: PLANS.pro.name, max: PLANS.max.name })}
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => setAdding(true)}
          disabled={!credit.usable}
          className="w-full sm:w-auto"
        >
          {words.add}
        </Button>
      </div>
      <p className="text-sm/6 text-subtle">
        {fmt(words.from, {
          buys: buysLine(words, format, 1),
          min: usdIn(format, TOPUP_LIMITS.minUsd),
        })}
      </p>
      {maxIsCheaper(plan, credit) ? (
        <OttoNote size="sm" live={false} message={maxHint(words, format, credit)}>
          {onUpgrade ? (
            <Button variant="link" onClick={onUpgrade} className="text-sm">
              {fmt(account.plan.upgradeTo, { plan: PLANS.max.name })}
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
          {open ? words.hideHistory : words.showHistory}
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
