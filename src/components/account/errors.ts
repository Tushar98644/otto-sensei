import { isApiError } from "@/lib/api/client";

const FALLBACK_MESSAGE = "Something went wrong. Please try again.";

export function errorMessage(error: unknown): string {
  return isApiError(error) ? error.message : FALLBACK_MESSAGE;
}
