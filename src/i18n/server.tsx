import { lang } from "next/root-params";
import type { ReactNode } from "react";
import { MessagesProvider } from "./client";
import { DEFAULT_LOCALE, isEnabledLocale, localeFromSegment, type Locale } from "./config";
import { formatFor, type Format } from "./intl";
import { loadMessages, type Messages, type Namespace } from "./messages";

// Server Components and generateMetadata only (not route handlers); portfolios, outside [lang], read as English.
export async function getLocale(): Promise<Locale> {
  const locale = localeFromSegment(await lang());
  return isEnabledLocale(locale) ? locale : DEFAULT_LOCALE;
}

export async function getMessages<N extends Namespace>(namespace: N): Promise<Messages[N]> {
  return loadMessages(await getLocale(), namespace);
}

export async function getFormat(): Promise<Format> {
  return formatFor(await getLocale());
}

export async function pickMessages(
  locale: Locale,
  namespaces: readonly Namespace[],
): Promise<Partial<Messages>> {
  const entries = await Promise.all(
    namespaces.map(async (namespace) => [namespace, await loadMessages(locale, namespace)]),
  );
  return Object.fromEntries(entries) as Partial<Messages>;
}

// Client components below read these namespaces with useMessages(); nothing else reaches the browser.
export async function MessagesFor({
  namespaces,
  children,
}: {
  namespaces: readonly Namespace[];
  children: ReactNode;
}) {
  const locale = await getLocale();
  return (
    <MessagesProvider locale={locale} messages={await pickMessages(locale, namespaces)}>
      {children}
    </MessagesProvider>
  );
}
