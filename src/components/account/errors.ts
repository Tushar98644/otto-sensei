import { isApiError } from "@/lib/api/client";

const FALLBACK_MESSAGE = "Something went wrong. Please try again.";

// API errors already carry a plain sentence written for users; anything else gets a generic one.
export function errorMessage(error: unknown): string {
  return isApiError(error) ? error.message : FALLBACK_MESSAGE;
}
