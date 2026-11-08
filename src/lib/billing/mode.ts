import { env, isProduction } from "@/lib/env";
import type { BillingMode } from "./types";

// Server-only. Apart from ./index so the pricing page can read it without loading the payment SDK.
export function billingMode(): BillingMode {
  const { DODO_PAYMENTS_API_KEY, DODO_PAYMENTS_PRODUCT_ID, DODO_PAYMENTS_WEBHOOK_KEY } = env();
  if (DODO_PAYMENTS_API_KEY && DODO_PAYMENTS_PRODUCT_ID && DODO_PAYMENTS_WEBHOOK_KEY) return "dodo";
  return isProduction() ? "disabled" : "mock";
}
