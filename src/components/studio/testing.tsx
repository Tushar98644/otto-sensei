import type { ReactNode } from "react";
import { OTTO_EN } from "@/components/mascot/lines-en";
import { MessagesProvider } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import { formatFor } from "@/i18n/intl";
import type { Messages } from "@/i18n/messages";
import en from "@/i18n/messages/en";

// English messages and format, for tests of studio helpers that take the page's words.
export const EN = en;
export const EN_FORMAT = formatFor("en");
export const FIX_WORDS = {
  t: en.studioEditor,
  usage: en.studio.usage,
  format: EN_FORMAT,
  otto: OTTO_EN,
};
export const COUNT_WORDS = { t: en.studioSections, format: EN_FORMAT };

// Renders studio components the way the studio layout's MessagesFor does.
export function inStudio(
  children: ReactNode,
  locale: Locale = "en",
  messages: Partial<Messages> = en,
): ReactNode {
  return (
    <MessagesProvider locale={locale} messages={messages}>
      {children}
    </MessagesProvider>
  );
}
