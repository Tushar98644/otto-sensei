"use client";

import { CreditCard } from "lucide-react";
import { useBillingRedirect } from "@/components/account/use-billing-redirect";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cardExpiry } from "./billing-format";
import type { BillingHistoryState } from "./use-billing-history";

export const MERCHANT_LINE =
  "Billed by Dodo Payments, our merchant of record. Charges show as DODOPAY on your statement.";

export function PaymentMethodCard({ state }: { state: BillingHistoryState }) {
  const portal = useBillingRedirect("portal");
  const card = state.history?.card ?? null;
  const expiry = card ? cardExpiry(card) : null;
  return (
    <Card id="payment-method" role="region" aria-labelledby="payment-method-title">
      <CardTitle as="h2" id="payment-method-title">
        Payment method
      </CardTitle>
      <div className="flex flex-wrap items-center justify-between gap-4">
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
                  {card.brand} ending in {card.last4}
                </span>
                <span className="text-sm text-muted">
                  {expiry ? `Expires ${expiry}` : "The card of your last payment"}
                </span>
              </div>
            ) : (
              <span className="text-sm text-muted">Your card is kept by Dodo Payments.</span>
            )}
          </div>
        )}
        <Button variant="secondary" onClick={() => void portal.go()} loading={portal.pending}>
          Update card
        </Button>
      </div>
      <p className="text-sm/6 text-muted">{MERCHANT_LINE}</p>
    </Card>
  );
}
