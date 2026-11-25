import { PLANS, PRO_TRIAL } from "@/config/plans";
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import { priceCopy, type PricingMessages } from "../../_components/price-copy";

// The pricing page's title and description; English matches pricingPage() in src/lib/seo-pages/pages.ts.
export function pricingMeta(
  t: PricingMessages,
  format: Format,
  trial: boolean,
): { title: string; description: string } {
  const prices = priceCopy(t, format);
  const { free, pro, max } = PLANS;
  const close = trial
    ? fmt(t.meta.trialClose, {
        pro: pro.name,
        days: format.number(PRO_TRIAL.days),
        trialPrice: prices.trialPrice(),
      })
    : t.prices.cancelAnytime;
  return {
    title: fmt(t.meta.title, { free: free.name, pro: pro.name, max: max.name }),
    description: fmt(t.meta.description, {
      pro: pro.name,
      proPrice: prices.planPrice("pro", "month"),
      max: max.name,
      maxPrice: prices.planPrice("max", "month"),
      close,
    }),
  };
}
