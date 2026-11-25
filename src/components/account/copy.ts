import { BRAND } from "@/config/brand";
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import type { Messages } from "@/i18n/messages";
import EN_LOGIN from "@/i18n/messages/en/login";
import EN_SIGN_IN from "@/i18n/messages/en/sign-in";
import EN_UPGRADE from "@/i18n/messages/en/upgrade";

// Otto's account lines in English; the app reads them from the signIn and upgrade namespaces.
export const ACCOUNT_OTTO = {
  signInDialog: EN_SIGN_IN.dialog.otto,
  login: EN_LOGIN.otto,
  signedOut: EN_SIGN_IN.account,
  upgradePitch: EN_UPGRADE.otto.pitch,
  upgradeSignIn: EN_SIGN_IN.upgrade.otto,
  billingOff: EN_UPGRADE.otto.billingOff,
  alreadyMax: EN_UPGRADE.otto.alreadyMax,
} as const;

export const SESSION_ENDED_REASON = EN_SIGN_IN.gate.sessionEnded;

// The toast after signing out, in the reader's language.
export function signedOutNote(
  kept: number,
  words: Messages["signIn"]["signedOut"] = EN_SIGN_IN.signedOut,
  format?: Format,
): string {
  if (kept === 0) return words.safe;
  if (!format) return fmt(kept === 1 ? words.kept.one : words.kept.other, { count: kept });
  return format.plural(words.kept, kept);
}

export const SUPPORT_MAILTO = `mailto:${BRAND.supportEmail}?subject=${encodeURIComponent(
  `${BRAND.name} plans`,
)}`;
