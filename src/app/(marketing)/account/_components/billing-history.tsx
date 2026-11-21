"use client";

import { CircleCheck, CircleX, Download, RotateCcw } from "lucide-react";
import { useState } from "react";
import { errorMessage } from "@/components/account/errors";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { invoiceHref, type BillingHistory } from "@/lib/billing/history-types";
import { billingDate, formatMoney, STATUS_LABELS, type RowStatus } from "./billing-format";
import { downloadFile } from "./download-file";
import type { BillingHistoryState } from "./use-billing-history";

export type HistoryRow = {
  key: string;
  at: number;
  item: string;
  amount: string;
  plusTax: boolean;
  status: RowStatus;
  invoiceId: string | null;
};

export function historyRows(history: BillingHistory): HistoryRow[] {
  const rows: HistoryRow[] = history.payments.map((payment) => ({
    key: payment.id,
    at: payment.at,
    item: payment.item,
    amount: formatMoney(payment.amountMinor, payment.currency),
    plusTax: false,
    status: payment.status,
    invoiceId: payment.invoice ? payment.id : null,
  }));
  const next = history.upcoming;
  if (!next) return rows;
  return [
    {
      key: "upcoming",
      at: next.at,
      item: next.item,
      amount: formatMoney(next.amountMinor, next.currency),
      plusTax: !next.taxIncluded,
      status: "upcoming",
      invoiceId: null,
    },
    ...rows,
  ];
}

function StatusPill({ status }: { status: RowStatus }) {
  const label = STATUS_LABELS[status];
  if (status === "paid") {
    return (
      <Badge variant="pass">
        <CircleCheck className="text-pass" />
        {label}
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge variant="fail">
        <CircleX className="text-fail" />
        {label}
      </Badge>
    );
  }
  return (
    <Badge>
      {status === "refunded" ? <RotateCcw /> : null}
      {label}
    </Badge>
  );
}

function Amount({ row }: { row: HistoryRow }) {
  return (
    <>
      <span className="text-ink tabular-nums">{row.amount}</span>
      {row.plusTax ? <span className="block text-xs/5 text-subtle">plus any tax</span> : null}
    </>
  );
}

function InvoiceButton({ row }: { row: HistoryRow }) {
  const [pending, setPending] = useState(false);
  const id = row.invoiceId;
  if (!id) return <span aria-hidden className="block size-9 pointer-coarse:size-11" />;
  const paymentId = id;
  async function download() {
    setPending(true);
    try {
      await downloadFile(invoiceHref(paymentId), "invoice.pdf");
    } catch (error) {
      toast({
        title: "Couldn't download that invoice",
        description: errorMessage(error),
        variant: "error",
      });
    } finally {
      setPending(false);
    }
  }
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      loading={pending}
      aria-label={`Download the invoice for ${row.item}, ${billingDate(row.at)}`}
      onClick={() => void download()}
    >
      <Download />
    </Button>
  );
}

export function BillingHistoryCard({ state }: { state: BillingHistoryState }) {
  const rows = state.history ? historyRows(state.history) : [];
  return (
    <Card id="billing-history" role="region" aria-labelledby="billing-history-title">
      <CardTitle as="h2" id="billing-history-title">
        Billing history
      </CardTitle>
      {state.status === "error" ? (
        <Alert
          variant="error"
          title="Couldn't load your payments"
          action={
            <Button variant="secondary" onClick={state.retry}>
              Try again
            </Button>
          }
        >
          Check your connection, then try again.
        </Alert>
      ) : state.status === "loading" ? (
        <div aria-hidden className="flex flex-col gap-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted">No payments yet.</p>
      ) : (
        <>
          <table className="hidden w-full text-left text-sm sm:table">
            <thead>
              <tr className="text-xs/4 tracking-widest text-subtle uppercase">
                <th scope="col" className="pb-3 font-medium">
                  Date
                </th>
                <th scope="col" className="pb-3 font-medium">
                  Item
                </th>
                <th scope="col" className="pb-3 text-right font-medium">
                  Amount
                </th>
                <th scope="col" className="pb-3 pl-6 font-medium">
                  Status
                </th>
                <th scope="col" className="pb-3">
                  <span className="sr-only">Invoice</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border border-t border-border">
              {rows.map((row) => (
                <tr key={row.key}>
                  <td className="py-2.5 pr-4 whitespace-nowrap text-muted tabular-nums">
                    {billingDate(row.at)}
                  </td>
                  <td className="py-2.5 pr-4 text-ink">{row.item}</td>
                  <td className="py-2.5 text-right whitespace-nowrap">
                    <Amount row={row} />
                  </td>
                  <td className="py-2.5 pl-6">
                    <StatusPill status={row.status} />
                  </td>
                  <td className="py-1 text-right">
                    <InvoiceButton row={row} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="divide-y divide-border border-y border-border sm:hidden">
            {rows.map((row) => (
              <li key={row.key} className="flex items-center gap-3 py-3">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm text-ink">{row.item}</span>
                  <span className="text-xs/5 text-subtle tabular-nums">{billingDate(row.at)}</span>
                </div>
                <div className="flex flex-col items-end gap-1 text-right text-sm">
                  <div>
                    <Amount row={row} />
                  </div>
                  <StatusPill status={row.status} />
                </div>
                <InvoiceButton row={row} />
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
