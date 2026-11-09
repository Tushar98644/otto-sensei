import { env, isProduction } from "@/lib/env";
import type { BillingMode } from "./types";

// Server-only. Apart from ./index so the pricing page can read it without loading the payment SDK.
export function billingMode(): BillingMode {
  const { CREEM_API_KEY, CREEM_PRO_MONTHLY_PRODUCT_ID, CREEM_WEBHOOK_SECRET } = env();
  if (CREEM_API_KEY && CREEM_PRO_MONTHLY_PRODUCT_ID && CREEM_WEBHOOK_SECRET) return "creem";
  return isProduction() ? "disabled" : "mock";
}
