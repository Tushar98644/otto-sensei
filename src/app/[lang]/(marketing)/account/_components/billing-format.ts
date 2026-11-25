import { intlLocale, type Locale } from "@/i18n/config";
import type { Format } from "@/i18n/intl";
import type { CardOnFile, PaymentStatus } from "@/lib/billing/history-types";

// Minor units follow the currency: cents for USD, whole yen for JPY.
export function formatMoney(locale: Locale, amountMinor: number, currency: string): string {
  try {
    const format = new Intl.NumberFormat(intlLocale(locale), {
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

const LONG_DATE = { month: "short", day: "numeric", year: "numeric" } as const;

export function billingDate(format: Format, at: number): string {
  return format.date(at, LONG_DATE);
}

export type RowStatus = PaymentStatus | "upcoming";

export function cardExpiry(card: CardOnFile): string | null {
  if (card.expMonth === null || card.expYear === null) return null;
  return `${String(card.expMonth).padStart(2, "0")}/${String(card.expYear).slice(-2)}`;
}
