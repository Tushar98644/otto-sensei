import type { MeResponse } from "@/lib/api/types";
import { authMode } from "@/lib/auth/session";
import type { AccountBilling, SessionUser } from "@/lib/auth/types";
import { billingMode, trialAvailableFor } from "@/lib/billing";
import { isDodoId } from "@/lib/billing/dodo-status";
import { getBillingRecord, type BillingRecord } from "@/lib/billing/entitlements";
import { billingOffer, trialOffered } from "@/lib/billing/intervals";
import { getUsageState } from "@/lib/usage";

export type MePayload = Omit<MeResponse, "ok">;

// Both send the user to Manage billing instead of a checkout, so only a Dodo customer can have them.
function billingHold(record: BillingRecord | null) {
  const portal = record !== null && isDodoId("cus", record.billingCustomerId);
  return {
    paymentIssue: portal && record.planStatus === "on_hold",
    cancelScheduled: portal && record.planStatus === "scheduled_cancel",
  };
}

// GET /api/me's answer; the dashboard layout hands the same one to the browser with the page.
export async function mePayload(
  user: SessionUser | null,
  billing?: AccountBilling,
): Promise<MePayload> {
  const mode = billingMode();
  const [state, trial, record] = user
    ? await Promise.all([
        getUsageState(user),
        trialAvailableFor(user, billing),
        mode !== "dodo"
          ? null
          : billing
            ? { plan: user.plan, ...billing }
            : getBillingRecord(user.id),
      ])
    : [null, trialOffered(), null];
  return {
    user,
    usage: state?.usage ?? null,
    period: state?.period ?? null,
    aiBudget: state?.aiBudget ?? null,
    billing: { mode, offer: billingOffer(), trial, ...billingHold(record) },
    auth: { mode: authMode() },
  };
}
