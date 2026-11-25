import {
  PRICES_USD,
  PRO_TRIAL,
  type BillingInterval,
  type Feature,
  type PaidPlanId,
} from "@/config/plans";
import { creditBuys } from "@/config/topup";
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import type { Messages } from "@/i18n/messages";

// Prices stay in USD, written the reader's way; in English these match lib/billing/prices.
const WHOLE = { trailingZeroDisplay: "stripIfInteger" } as const;

export function usdIn(format: Format, amount: number): string {
  return format.currency(amount, "USD", WHOLE);
}

export function planPriceIn(format: Format, plan: PaidPlanId, interval: BillingInterval): string {
  return usdIn(format, PRICES_USD[plan][interval]);
}

export function trialPriceIn(format: Format): string {
  return usdIn(format, PRO_TRIAL.priceUsd);
}

// Under a dollar it reads in cents, as config/topup's centsText does.
export function centsIn(format: Format, cents: number): string {
  if (cents < 100) return `${cents}¢`;
  return usdIn(format, cents / 100);
}

// "a, b or c": English keeps its house style (no serial comma); other languages follow Intl.
export function orList(format: Format, items: readonly string[]): string {
  if (format.locale !== "en") return format.list(items, { type: "disjunction" });
  const rest = [...items];
  const last = rest.pop() ?? "";
  return rest.length ? `${rest.join(", ")} or ${last}` : last;
}

export type CreditWords = Pick<Messages["upgrade"]["credit"], "buys" | "item" | "labels">;

const BUYS_SHOWN: readonly Feature[] = ["tailor", "letter", "fix"];

// config/topup's buysSentence in the reader's language: "$1 = 10 tailored versions, 10 letters or 50 line fixes".
export function buysIn(words: CreditWords, format: Format, usd: number): string {
  const items = BUYS_SHOWN.filter((feature) => creditBuys(usd * 100, feature) > 0).map((feature) =>
    fmt(words.item, {
      count: format.number(creditBuys(usd * 100, feature)),
      label: words.labels[feature],
    }),
  );
  return fmt(words.buys, { usd: usdIn(format, usd), list: orList(format, items) });
}
