import { BRAND } from "@/config/brand";
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import type { Messages } from "@/i18n/messages";

// The toast after signing out, in the reader's language.
export function signedOutNote(
  kept: number,
  words: Messages["signIn"]["signedOut"],
  format?: Format,
): string {
  if (kept === 0) return words.safe;
  if (!format) return fmt(kept === 1 ? words.kept.one : words.kept.other, { count: kept });
  return format.plural(words.kept, kept);
}

export const SUPPORT_MAILTO = `mailto:${BRAND.supportEmail}?subject=${encodeURIComponent(
  `${BRAND.name} plans`,
)}`;
