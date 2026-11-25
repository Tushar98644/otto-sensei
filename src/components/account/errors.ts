import { pageMessages } from "@/i18n/client";
import { isApiError } from "@/lib/api/client";

const FALLBACK_MESSAGE = "Something went wrong. Please try again.";

export type ErrorWords = { fallback: string; offline: string };

// A caller without words gets the page's own, outside English; English keeps the old fallback.
function pageWords(): ErrorWords | undefined {
  const page = pageMessages();
  return page && page.locale !== "en" ? page.messages.app?.errors : undefined;
}

// The server words its own errors in the reader's language; `words` covers the ones made in the browser.
export function errorMessage(error: unknown, given?: ErrorWords): string {
  const words = given ?? pageWords();
  if (words && isApiError(error, "network_error")) return words.offline;
  return isApiError(error) ? error.message : (words?.fallback ?? FALLBACK_MESSAGE);
}
