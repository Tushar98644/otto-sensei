import type { BillingInterval, PlanId } from "@/config/plans";

export type SessionUser = {
  id: string;
  email: string;
  plan: PlanId;
  planInterval: BillingInterval | null;
  planRenewsAt: number | null;
  trialEndsAt?: number | null;
  planPeriodStartsAt?: number | null;
  planPeriodEndsAt?: number | null;
};

// The users row's billing ids and status, read with the session so a request needn't read the row again.
export type AccountBilling = {
  planStatus: string | null;
  billingCustomerId: string | null;
  billingSubscriptionId: string | null;
};

export type AuthMode = "supabase" | "dev" | "off";
