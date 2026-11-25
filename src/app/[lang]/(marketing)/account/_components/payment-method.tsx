"use client";

import { CreditCard } from "lucide-react";
import { useBillingRedirect } from "@/components/account/use-billing-redirect";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { cardExpiry } from "./billing-format";
import type { BillingHistoryState } from "./use-billing-history";

export function PaymentMethodCard({ state }: { state: BillingHistoryState }) {
  const account = useMessages("account");
  const words = account.payment;
  const portal = useBillingRedirect("portal");
  const card = state.history?.card ?? null;
  const expiry = card ? cardExpiry(card) : null;
  return (
    <Card id="payment-method" role="region" aria-labelledby="payment-method-title">
      <CardTitle as="h2" id="payment-method-title">
        {words.title}
      </CardTitle>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {state.status === "loading" ? (
          <Skeleton aria-hidden className="h-11 w-56" />
        ) : (
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden
              className="flex h-8 w-11 shrink-0 items-center justify-center rounded-md bg-surface-muted"
            >
              <CreditCard className="size-4 text-muted" />
            </span>
            {card ? (
              <div className="flex min-w-0 flex-col">
                <span className="text-sm font-medium text-ink">
                  {fmt(words.ending, { brand: card.brand, last4: card.last4 })}
                </span>
                <span className="text-sm text-muted">
                  {expiry ? fmt(words.expires, { date: expiry }) : words.lastCard}
                </span>
              </div>
            ) : (
              <span className="text-sm text-muted">{words.keptBy}</span>
            )}
          </div>
        )}
        <Button
          variant="secondary"
          onClick={() => void portal.go()}
          loading={portal.pending}
          className="w-full sm:w-auto"
        >
          {account.plan.updateCard}
        </Button>
      </div>
      <p className="text-sm/6 text-muted">{words.merchant}</p>
    </Card>
  );
}
