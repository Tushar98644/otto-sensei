// Supabase's "Email OTP Length" must stay at this (SETUP.md).
export const LOGIN_CODE_DIGITS = 6;

// One account per mailbox. No provider rules (Gmail dots, plus tags): those would merge addresses
// other providers treat as different people.
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
