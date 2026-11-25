import { isApiError } from "@/lib/api/client";

const FALLBACK_MESSAGE = "Something went wrong. Please try again.";

export type ErrorWords = { fallback: string; offline: string };

// The server words its own errors in the reader's language; `words` covers the ones made in the browser.
export function errorMessage(error: unknown, words?: ErrorWords): string {
  if (words && isApiError(error, "network_error")) return words.offline;
  return isApiError(error) ? error.message : (words?.fallback ?? FALLBACK_MESSAGE);
}
