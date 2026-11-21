import { env, isProduction } from "@/lib/env";
import { log } from "@/lib/log";
import { dodoKeyMatchesEnvironment } from "./dodo";
import type { BillingMode } from "./types";

let mismatchLogged = false;

export function billingMode(): BillingMode {
  const e = env();
  if (
    e.DODO_API_KEY &&
    e.DODO_WEBHOOK_SECRET &&
    e.BILLING_SIGNING_SECRET &&
    e.DODO_PRO_MONTHLY_PRODUCT_ID
  ) {
    if (dodoKeyMatchesEnvironment(e.DODO_API_KEY, e.DODO_ENVIRONMENT)) return "dodo";
    // A key of the other mode gets a 401 on every call, so billing stays off rather than half-working.
    if (!mismatchLogged) {
      mismatchLogged = true;
      log.error(
        "billing.key_environment_mismatch",
        new Error("DODO_API_KEY is not a key for DODO_ENVIRONMENT"),
        { environment: e.DODO_ENVIRONMENT },
      );
    }
  }
  return isProduction() ? "disabled" : "mock";
}
