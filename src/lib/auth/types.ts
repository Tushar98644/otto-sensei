import type { BillingInterval, PlanId } from "@/config/plans";

// Client-safe.
export type SessionUser = {
  id: string;
  email: string;
  plan: PlanId;
  // How often the paid plan bills (null on Free) and its next renewal (epoch ms, null when it
  // won't renew). Together they set the allowance period (src/lib/usage.ts).
  planInterval: BillingInterval | null;
  planRenewsAt: number | null;
  // When the Pro trial ends (epoch ms) while the subscription is on it, else null. A trial gets
  // its own allowance and can't publish a portfolio. Optional for servers from before trials.
  trialEndsAt?: number | null;
};

// supabase: email codes and Google through Supabase. dev: development's on-screen codes, no
// Google. off: Supabase isn't configured, so nobody can sign in.
export type AuthMode = "supabase" | "dev" | "off";
