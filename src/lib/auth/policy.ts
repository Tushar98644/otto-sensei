// Supabase's "Email OTP Length" must stay at this (docs/setup.md).
export const LOGIN_CODE_DIGITS = 6;

// No provider rules (Gmail dots, plus tags): other providers treat those as different people.
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
