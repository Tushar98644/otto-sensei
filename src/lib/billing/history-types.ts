export type PaymentStatus = "paid" | "processing" | "failed" | "refunded";

export type BillingPayment = {
  id: string;
  at: number;
  item: string;
  amountMinor: number;
  currency: string;
  status: PaymentStatus;
  invoice: boolean;
};

export type UpcomingCharge = {
  at: number;
  item: string;
  amountMinor: number;
  currency: string;
  taxIncluded: boolean;
};

export type CardOnFile = {
  brand: string;
  last4: string;
  expMonth: number | null;
  expYear: number | null;
};

export type BillingHistory = {
  payments: BillingPayment[];
  upcoming: UpcomingCharge | null;
  card: CardOnFile | null;
};

export type BillingHistoryResponse = { ok: true; history: BillingHistory };

export const EMPTY_HISTORY: BillingHistory = { payments: [], upcoming: null, card: null };

export function invoiceHref(paymentId: string): string {
  return `/api/billing/invoice/${encodeURIComponent(paymentId)}`;
}
