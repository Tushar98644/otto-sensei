// Client-safe sign-in rules shared by the sign-in form, the code routes and user lookup.

// Supabase's "Email OTP Length" must stay at this (SETUP.md).
export const LOGIN_CODE_DIGITS = 6;

// One account per mailbox however the address was typed. No provider-specific rules (Gmail dots,
// plus tags): those would merge addresses that other providers treat as different people.
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
