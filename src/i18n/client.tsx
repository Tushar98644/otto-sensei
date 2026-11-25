"use client";

import { createContext, use, useMemo, type ReactNode } from "react";
import { DEFAULT_LOCALE, type Locale } from "./config";
import { formatFor, type Format } from "./intl";
import type { Messages, Namespace } from "./messages";

type Provided = { locale: Locale; messages: Partial<Messages> };

const MessagesContext = createContext<Provided | null>(null);

// Rendered by MessagesFor (./server), which passes only the namespaces it names.
export function MessagesProvider({
  locale,
  messages,
  children,
}: Provided & { children: ReactNode }) {
  const value = useMemo(() => ({ locale, messages }), [locale, messages]);
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

export function useFormat(): Format {
  return formatFor(useLocale());
}
