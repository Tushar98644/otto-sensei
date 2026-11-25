import type { ReactNode } from "react";
import { DASHBOARD_NAMESPACES, PAGE_NAMESPACES } from "@/app/[lang]/dashboard/namespaces";
import { MessagesProvider } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import { formatFor } from "@/i18n/intl";
import en from "@/i18n/messages/en";
import { pickMessages } from "@/i18n/server";

// For tests: the English messages and formats the dashboard reads, as the layout and its pages would pass them.
export const EN = en;
export const FORMAT_EN = formatFor("en");

const ALL_NAMESPACES = [...DASHBOARD_NAMESPACES, ...Object.values(PAGE_NAMESPACES).flat()];

export function inEnglish(node: ReactNode): ReactNode {
  return (
    <MessagesProvider locale="en" messages={en}>
      {node}
    </MessagesProvider>
  );
}

export async function inLocale(locale: Locale, node: ReactNode): Promise<ReactNode> {
  return (
    <MessagesProvider locale={locale} messages={await pickMessages(locale, ALL_NAMESPACES)}>
      {node}
    </MessagesProvider>
  );
}
