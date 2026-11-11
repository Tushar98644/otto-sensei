import type { BillingInterval, PlanId } from "@/config/plans";

export type SessionUser = {
  id: string;
  email: string;
  plan: PlanId;
  // Together with planRenewsAt these set the allowance period (src/lib/usage.ts).
  planInterval: BillingInterval | null;
  planRenewsAt: number | null;
  // Optional for servers from before trials.
  trialEndsAt?: number | null;
  // null on Free and on rows no webhook has dated yet.
  planPeriodStartsAt?: number | null;
  planPeriodEndsAt?: number | null;
};

// dev: development's on-screen codes, no Google. off: Supabase isn't configured.
export type AuthMode = "supabase" | "dev" | "off";
