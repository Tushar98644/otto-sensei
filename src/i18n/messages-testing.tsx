import type { ReactNode } from "react";
import { MessagesProvider } from "./client";
import type { Locale } from "./config";
import type { Namespace } from "./messages";
import { pickMessages } from "./server";

// For tests: a tree under the namespaces a page would send, in any locale (live or not).
export async function withMessages(
  locale: Locale,
  namespaces: readonly Namespace[],
  node: ReactNode,
): Promise<ReactNode> {
  return (
    <MessagesProvider locale={locale} messages={await pickMessages(locale, namespaces)}>
      {node}
    </MessagesProvider>
  );
}
