import { BRAND } from "@/config/brand";

// Account and billing wording shared by several components. ACCOUNT_OTTO follows the voice rules in
// mascot/lines.ts (plain words, at most 18 per line), checked by copy.test.ts.

export const ACCOUNT_OTTO = {
  signInDialog: "Use Google or a 6-digit email code, then we're back where you left off.",
  login: "Use Google, or I'll email you a 6-digit code. No password to remember.",
  signedOut: "Sign in to see your plan and what you've used this month.",
  upgradePitch: "More tailoring, letters and fixes each month, for a busy job hunt.",
  upgradeSignIn: "Sign in first. Then I'll take you straight to checkout.",
  billingOff: "Payments aren't switched on yet, but you can still email us about a plan.",
  alreadyMax: "You're on Max, the biggest plan. Email us if you need more.",
} as const;

export const SESSION_ENDED_REASON = "You were signed out. Sign in again to keep going.";

// After signing out: `kept` is how many of the account's resumes stayed in this browser because
// they hadn't finished backing up (see signOutAndRelease).
export function signedOutNote(kept: number): string {
  if (kept === 0) return "Your resumes are safe in your account. Sign in again to see them here.";
  return kept === 1
    ? "1 resume hasn't finished backing up, so it's still in this browser."
    : `${kept} resumes haven't finished backing up, so they're still in this browser.`;
}

export const SUPPORT_MAILTO = `mailto:${BRAND.supportEmail}?subject=${encodeURIComponent(
  `${BRAND.name} plans`,
)}`;
