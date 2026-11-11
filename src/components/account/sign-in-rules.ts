import { LOGIN_CODE_DIGITS } from "@/lib/auth/policy";

export const CODE_LENGTH = LOGIN_CODE_DIGITS;
// Supabase refuses a second code for the same address within 60 seconds (its default).
export const RESEND_COOLDOWN_SECONDS = 60;
export const EMAIL_MAX_LENGTH = 254;

// No lookbehind: Safari before 16.4 can't parse it, and the form must work on older phones.
const STANDALONE_CODE = new RegExp(`(?:^|\\D)(\\d{${CODE_LENGTH}})(?!\\d)`);
const SIMPLE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function codeDigits(input: string): string {
  const standalone = STANDALONE_CODE.exec(input)?.[1];
  if (standalone) return standalone;
  return input.replace(/\D/g, "").slice(0, CODE_LENGTH);
}

export function looksLikeEmail(value: string): boolean {
  return value.length <= EMAIL_MAX_LENGTH && SIMPLE_EMAIL.test(value);
}
