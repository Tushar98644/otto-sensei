import type { CardOnFile, PaymentStatus } from "@/lib/billing/history-types";

// Minor units follow the currency: cents for USD, whole yen for JPY.
export function formatMoney(amountMinor: number, currency: string): string {
  try {
    const format = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      trailingZeroDisplay: "stripIfInteger",
    });
    const digits = format.resolvedOptions().maximumFractionDigits ?? 2;
    return format.format(amountMinor / 10 ** digits);
  } catch {
    return `${(amountMinor / 100).toFixed(2)} ${currency}`;
  }
}

const longDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function billingDate(at: number): string {
  return longDate.format(at);
}

export type RowStatus = PaymentStatus | "upcoming";

export const STATUS_LABELS: Record<RowStatus, string> = {
  paid: "Paid",
  processing: "Processing",
  failed: "Failed",
  refunded: "Refunded",
  upcoming: "Upcoming",
};

export function cardExpiry(card: CardOnFile): string | null {
  if (card.expMonth === null || card.expYear === null) return null;
  return `${String(card.expMonth).padStart(2, "0")}/${String(card.expYear).slice(-2)}`;
}
