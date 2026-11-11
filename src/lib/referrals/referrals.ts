import type { AllowancePeriod } from "@/config/plans";

export const REFERRAL_STATUSES = ["pending", "rewarded", "capped", "blocked"] as const;
export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];

export const REFERRAL_BLOCK_REASONS = ["same_device", "same_person"] as const;
export type ReferralBlockReason = (typeof REFERRAL_BLOCK_REASONS)[number];

export const REFERRAL_BONUS = { fix: 10, tailor: 2 } as const;
export type BonusFeature = keyof typeof REFERRAL_BONUS;
export const BONUS_FEATURES = Object.keys(REFERRAL_BONUS) as BonusFeature[];

export const MAX_REWARDED_REFERRALS = 20;

// So an existing account can't pick up an invite later by opening someone's link.
export const CLAIM_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export const CODE_LENGTH = 8;

export function isReferralCode(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length === CODE_LENGTH &&
    [...value].every((char) => CODE_ALPHABET.includes(char))
  );
}

// Only for telling an inviter from a "friend", never for sign-in.
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

// Not httpOnly on purpose: the browser reads it. The server trusts the code, never the stage.
export const REF_COOKIE = "otto_ref";
export const REF_COOKIE_MAX_AGE_S = 30 * 24 * 60 * 60;

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
  url: string;
  joined: number;
  checked: number;
  rewarded: number;
  maxRewarded: number;
  perFriend: typeof REFERRAL_BONUS;
  thisPeriod: Record<BonusFeature, number>;
  period: AllowancePeriod;
};
