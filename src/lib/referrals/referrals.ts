// Client-safe. Invite links: who may earn what, the code format, and the invite cookie.

import type { AllowancePeriod } from "@/config/plans";

export const REFERRAL_STATUSES = ["pending", "rewarded", "capped", "blocked"] as const;
export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];

export const REFERRAL_BLOCK_REASONS = ["same_device", "same_person"] as const;
export type ReferralBlockReason = (typeof REFERRAL_BLOCK_REASONS)[number];

// What a friend's first resume check adds for each of you, in the allowance period it happens in
// (the month, or a weekly subscriber's billing week). Line fixes and tailoring are model calls, so
// the reward stays small and the cap below bounds it.
export const REFERRAL_BONUS = { fix: 10, tailor: 2 } as const;
export type BonusFeature = keyof typeof REFERRAL_BONUS;
export const BONUS_FEATURES = Object.keys(REFERRAL_BONUS) as BonusFeature[];

// Friends past this still get their own bonus; the inviter stops earning.
export const MAX_REWARDED_REFERRALS = 20;

// An account can be credited to an invite only this soon after it was made, so an existing
// account can't pick up an invite later by opening someone's link.
export const CLAIM_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

// No 0, 1, i, l or o: codes get read aloud and typed from screenshots.
export const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export const CODE_LENGTH = 8;

export function isReferralCode(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length === CODE_LENGTH &&
    [...value].every((char) => CODE_ALPHABET.includes(char))
  );
}

// One mailbox however it's spelled: plus tags dropped everywhere, and dots too on Gmail, which
// ignores them. Only for telling an inviter apart from a "friend", never for sign-in.
export function inboxKey(email: string): string {
  const address = email.trim().toLowerCase();
  const at = address.lastIndexOf("@");
  if (at < 0) return address;
  const local = address.slice(0, at).split("+")[0] ?? "";
  const domain = address.slice(at + 1);
  if (domain === "gmail.com" || domain === "googlemail.com")
    return `${local.replaceAll(".", "")}@gmail.com`;
  return `${local}@${domain}`;
}

export const REF_PARAM = "ref";

export function invitePath(code: string): string {
  return `/?${REF_PARAM}=${code}`;
}

// Not httpOnly on purpose: it holds a public invite code, and the browser has to see it to know
// whether to claim it after sign-in. The server only trusts the code in it, never the stage.
export const REF_COOKIE = "otto_ref";
export const REF_COOKIE_MAX_AGE_S = 30 * 24 * 60 * 60;

// landed: opened an invite link. checked: ran a resume check before signing up. joined: the new
// account is linked to the invite and waits for its first check.
export type RefStage = "landed" | "checked" | "joined";
export type RefCookie = { code: string; stage: RefStage };

const STAGE_SUFFIX: Record<RefStage, string> = { landed: "", checked: ".c", joined: ".j" };

export function formatRefCookie({ code, stage }: RefCookie): string {
  return `${code}${STAGE_SUFFIX[stage]}`;
}

export function parseRefCookie(value: string | null | undefined): RefCookie | null {
  if (!value) return null;
  const [code, suffix, ...rest] = value.split(".");
  if (rest.length > 0 || !isReferralCode(code)) return null;
  if (suffix === undefined) return { code, stage: "landed" };
  if (suffix === "c") return { code, stage: "checked" };
  if (suffix === "j") return { code, stage: "joined" };
  return null;
}

// What a claim did. pending: linked, waiting for a check. rewarded: both bonuses added. already:
// this account was linked before. existing_account: too old to count as invited. self, blocked,
// unknown_code: nothing happened and nothing will.
export type ReferralClaimOutcome =
  | "none"
  | "pending"
  | "rewarded"
  | "already"
  | "existing_account"
  | "self"
  | "blocked"
  | "unknown_code";

export type ReferralSummary = {
  code: string;
  // Full invite link on the public site.
  url: string;
  // Friends who signed up through the link, and how many of them checked a resume.
  joined: number;
  checked: number;
  // Checks that earned the inviter a bonus, at most maxRewarded.
  rewarded: number;
  maxRewarded: number;
  perFriend: typeof REFERRAL_BONUS;
  // Extra units on this account in its current allowance period (a month, or a weekly
  // subscriber's billing week), from inviting or being invited.
  thisPeriod: Record<BonusFeature, number>;
  period: AllowancePeriod;
};
