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

export type AuthMode = "supabase" | "dev" | "off";
