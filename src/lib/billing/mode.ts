import { env, isProduction } from "@/lib/env";
import type { BillingMode } from "./types";

export function billingMode(): BillingMode {
  const e = env();
  if (
    e.PADDLE_API_KEY &&
    e.PADDLE_WEBHOOK_SECRET &&
    e.PADDLE_PRO_MONTHLY_PRICE_ID &&
    e.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
  ) {
    return "paddle";
  }
  return isProduction() ? "disabled" : "mock";
}
