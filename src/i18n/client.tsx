"use client";

import { createContext, use, useMemo, type ReactNode } from "react";
import { DEFAULT_LOCALE, type Locale } from "./config";
import { formatFor, type Format } from "./intl";
import type { Messages, Namespace } from "./messages";

type Provided = { locale: Locale; messages: Partial<Messages> };

const MessagesContext = createContext<Provided | null>(null);

// Rendered by MessagesFor (./server), which passes only the namespaces it names; a nested one adds its namespaces to the outer ones.
export function MessagesProvider({
  locale,
  messages,
  children,
}: Provided & { children: ReactNode }) {
  const outer = use(MessagesContext)?.messages;
  const value = useMemo(
    () => ({ locale, messages: outer ? { ...outer, ...messages } : messages }),
    [locale, messages, outer],
  );
  return <MessagesContext value={value}>{children}</MessagesContext>;
}

// Pages without a provider (marketing) are English and pass strings to their islands as props.
export function useLocale(): Locale {
  return use(MessagesContext)?.locale ?? DEFAULT_LOCALE;
}

export function useMessages<N extends Namespace>(namespace: N): Messages[N] {
  const messages = use(MessagesContext)?.messages[namespace];
  if (!messages) {
    throw new Error(
      `"${namespace}" messages weren't passed here: add it to MessagesFor's namespaces.`,
    );
  }
  return messages;
}

// For parts the studio or a page without a provider also draws: the namespace when it was passed, else the English given.
export function useMessagesOr<N extends Namespace>(
  namespace: N,
  english: Messages[N],
): Messages[N] {
  return use(MessagesContext)?.messages[namespace] ?? english;
}

export function useFormat(): Format {
  return formatFor(useLocale());
}
