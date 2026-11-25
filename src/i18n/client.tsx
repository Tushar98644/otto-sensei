"use client";

import { use } from "react";
import { DEFAULT_LOCALE, type Locale } from "./config";
import { formatFor, type Format } from "./intl";
import type { Messages, Namespace } from "./messages";
import { MessagesContext } from "./provider";

// The provider lives on its own so pages that only render it don't carry these hooks and Intl helpers.
export { MessagesProvider, pageMessages } from "./provider";

// Pages without a provider (marketing) are English and pass strings to their islands as props.
export function useLocale(): Locale {
  return use(MessagesContext)?.locale ?? DEFAULT_LOCALE;
}

const missing = (namespace: Namespace) =>
  new Error(`"${namespace}" messages weren't passed here: add it to MessagesFor's namespaces.`);

export function useMessages<N extends Namespace>(namespace: N): Messages[N] {
  const messages = use(MessagesContext)?.messages[namespace];
  if (!messages) throw missing(namespace);
  return messages;
}

// For parts some pages give their words as props: a given word wins, else the provider must have the namespace.
export function useWordsOr<N extends Namespace>(namespace: N) {
  const messages = use(MessagesContext)?.messages[namespace];
  return <T,>(given: T | undefined, pick: (messages: Messages[N]) => T): T => {
    if (given !== undefined) return given;
    if (!messages) throw missing(namespace);
    return pick(messages);
  };
}

// For parts a layout without their namespace also draws: the namespace when it was passed, else the English given.
export function useMessagesOr<N extends Namespace>(
  namespace: N,
  english: Messages[N],
): Messages[N] {
  return use(MessagesContext)?.messages[namespace] ?? english;
}

// The namespace when a provider passed it: for parts that fetch English themselves where none did.
export function useProvidedMessages<N extends Namespace>(namespace: N): Messages[N] | undefined {
  return use(MessagesContext)?.messages[namespace];
}

export function useFormat(): Format {
  return formatFor(useLocale());
}
