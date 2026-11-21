import { BRAND } from "@/config/brand";

export const ACCOUNT_OTTO = {
  signInDialog: "Use Google or a 6-digit email code, then we're back where you left off.",
  login: "Use Google, or I'll email you a code. No password to remember.",
  signedOut: "I'll show your plan, this month's usage and your billing once you're in.",
  upgradePitch: "Tailoring, letters and line fixes each month, for a busy job hunt.",
  trialPitch: "All my AI help on your real job hunt: tailoring, letters, interview prep and line fixes.",
  upgradeSignIn: "Sign in first. Then I'll take you straight to checkout.",
  billingOff: "Payments aren't switched on yet, but you can still email us about a plan.",
  alreadyMax: "You're on Max, the biggest plan. Email us if you need more.",
} as const;

export const UPGRADE_SIGN_IN_TITLE = {
  trial: "Sign in to start your trial",
  upgrade: "Sign in to upgrade",
} as const;

export function backFromUpgradeToast(plan: string): string {
  return `You're on ${plan}. Let's pick up where you left off.`;
}

export function alreadyOnPlanToast(plan: string): string {
  return `You're already on ${plan}.`;
}

export const SESSION_ENDED_REASON = "You were signed out. Sign in again to keep going.";

export function signedOutNote(kept: number): string {
  if (kept === 0) return "Your resumes are safe in your account. Sign in again to see them here.";
  return kept === 1
    ? "1 resume hasn't finished backing up, so it's still in this browser."
    : `${kept} resumes haven't finished backing up, so they're still in this browser.`;
}

export const SUPPORT_MAILTO = `mailto:${BRAND.supportEmail}?subject=${encodeURIComponent(
  `${BRAND.name} plans`,
)}`;
