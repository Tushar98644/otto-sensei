import { env, isProduction } from "@/lib/env";
import type { BillingMode } from "./types";

export function billingMode(): BillingMode {
  const { CREEM_API_KEY, CREEM_PRO_MONTHLY_PRODUCT_ID, CREEM_WEBHOOK_SECRET } = env();
  if (CREEM_API_KEY && CREEM_PRO_MONTHLY_PRODUCT_ID && CREEM_WEBHOOK_SECRET) return "creem";
  return isProduction() ? "disabled" : "mock";
}
