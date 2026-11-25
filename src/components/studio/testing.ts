import { formatFor } from "@/i18n/intl";
import en from "@/i18n/messages/en";

// English messages and format, for tests of studio helpers that take the page's words.
export const EN = en;
export const EN_FORMAT = formatFor("en");
export const FIX_WORDS = { t: en.studioEditor, usage: en.studio.usage, format: EN_FORMAT };
export const COUNT_WORDS = { t: en.studioEditor, format: EN_FORMAT };
