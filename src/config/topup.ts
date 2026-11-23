import { FEATURES, PLANS, type Feature } from "./plans";

// Prepaid credit for paid plans, bought in whole dollars once a month's allowance runs out.
export const TOPUP_LIMITS = {
  minUsd: 5,
  maxUsd: 100,
  maxBalanceUsd: 300,
  presetsUsd: [5, 10, 20],
} as const;

export const CREDIT_LABELS: Record<Feature, string> = {
  tailor: "tailored versions",
  letter: "letters",
  fix: "line fixes",
  import: "AI resume reads",
  draft: "Build with Otto drafts",
  github: "GitHub project drafts",
};

export const CREDIT_LABEL_ONE: Record<Feature, string> = {
  tailor: "tailored version",
  letter: "letter",
  fix: "line fix",
  import: "AI resume read",
  draft: "Build with Otto draft",
  github: "GitHub project draft",
};

// $1 buys what a fifteenth of Pro buys in that feature, so a plan stays the better deal.
export function creditCents(feature: Feature): number | null {
  const included = PLANS.pro.limits[feature];
  if (included <= 0) return null;
  return Math.max(1, Math.round((PLANS.pro.priceUsd * 100) / included));
}

export function creditBuys(cents: number, feature: Feature): number {
  const price = creditCents(feature);
  return price === null ? 0 : Math.floor(Math.max(0, cents) / price);
}

export function isTopupAmount(usd: number): boolean {
  return Number.isInteger(usd) && usd >= TOPUP_LIMITS.minUsd && usd <= TOPUP_LIMITS.maxUsd;
}

const count = new Intl.NumberFormat("en-US");
const BUYS_SHOWN: readonly Feature[] = ["tailor", "letter", "fix"];

// "$1 = 10 tailored versions, 10 letters or 50 line fixes"
export function buysSentence(usd: number, features: readonly Feature[] = BUYS_SHOWN): string {
  const parts = features
    .filter((feature) => creditBuys(usd * 100, feature) > 0)
    .map((feature) => `${count.format(creditBuys(usd * 100, feature))} ${CREDIT_LABELS[feature]}`);
  const last = parts.pop();
  const list = parts.length ? `${parts.join(", ")} or ${last}` : (last ?? "");
  return `$${count.format(usd)} = ${list}`;
}

export function centsText(cents: number): string {
  if (cents < 100) return `${cents}¢`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    trailingZeroDisplay: "stripIfInteger",
  }).format(cents / 100);
}

// The pricing page's one line about credit.
export function creditPricingLine(): string {
  return `Run out? Add credit from $${TOPUP_LIMITS.minUsd}: ${buysSentence(1)}.`;
}

// "10¢ per tailored version, 10¢ per letter, …" from the prices above.
export function creditPriceList(): string {
  return FEATURES.flatMap((feature) => {
    const cents = creditCents(feature);
    return cents === null ? [] : [`${centsText(cents)} per ${CREDIT_LABEL_ONE[feature]}`];
  }).join(", ");
}
