"use client";

import { createContext, use, useEffect, useMemo, type ReactNode } from "react";
import type { Locale } from "./config";
import type { Messages } from "./messages";

type Provided = { locale: Locale; messages: Partial<Messages> };

export const MessagesContext = createContext<Provided | null>(null);

// The providers mounted in the browser, for helpers that run outside React (they share a locale).
const mounted: Provided[] = [];

export function pageMessages(): Provided | null {
  return mounted.at(-1) ?? null;
}

// Rendered by MessagesFor (./server), which passes only the namespaces it names; a nested one adds to its parent's.
export function MessagesProvider({
  locale,
  messages,
  children,
}: Provided & { children: ReactNode }) {
  const parent = use(MessagesContext);
  const value = useMemo(
    () => ({
      locale,
      messages: parent && parent.locale === locale ? { ...parent.messages, ...messages } : messages,
    }),
    [locale, messages, parent],
  );
  useEffect(() => {
    mounted.push(value);
    return () => {
      mounted.splice(mounted.lastIndexOf(value), 1);
    };
  }, [value]);
  return <MessagesContext value={value}>{children}</MessagesContext>;
}
