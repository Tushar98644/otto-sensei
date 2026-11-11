import { z } from "zod";
import { log } from "@/lib/log";
import { AIError } from "./types";

export type AICallFields = { task: string; model: string };

export const ErrorBodySchema = z.object({
  code: z.union([z.number(), z.string()]).optional(),
  message: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ErrorBody = z.infer<typeof ErrorBodySchema>;

export type CallFailure = { error: AIError; retryable: boolean; status?: number };

function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

// Moderation metadata echoes the flagged resume text, so only the reason categories are logged.
function moderationReasons(body: ErrorBody | null): string[] | null {
  const reasons = body?.metadata?.reasons;
  return Array.isArray(reasons) ? reasons.filter((reason) => typeof reason === "string") : null;
}

export function statusFailure(
  status: number,
  body: ErrorBody | null,
  fields: AICallFields,
): CallFailure {
  const errorType = text(body?.metadata?.error_type);
  const detail = {
    ...fields,
    status,
    errorType,
    providerCode: text(body?.metadata?.provider_code),
  };
  const fail = (error: AIError, retryable: boolean): CallFailure => ({ error, retryable, status });

  if (status === 429) {
    log.warn("ai.rate_limited", detail);
    return fail(new AIError("rate_limited", "The AI provider is rate limiting requests"), true);
  }
  if (status === 408 || status >= 500) {
    log.warn("ai.unavailable", detail);
    return fail(new AIError("unavailable", "The AI model is unavailable right now"), true);
  }
  if (status === 401) {
    log.error("ai.auth_failed", new Error("OpenRouter rejected the API key"), detail);
    return fail(new AIError("unavailable", "OpenRouter rejected the API key"), false);
  }
  if (status === 402) {
    // OpenRouter's in-flight spend cap (new, low-balance accounts) clears as running calls finish.
    if (text(body?.metadata?.limit_source) === "openrouter_in_flight_budget") {
      log.warn("ai.in_flight_budget", detail);
      return fail(new AIError("rate_limited", "Too many AI calls are running at once"), true);
    }
    log.error("ai.out_of_credits", new Error("OpenRouter has no credits left"), detail);
    return fail(new AIError("unavailable", "The AI account is out of credits"), false);
  }
  if (status === 403) {
    const reasons = moderationReasons(body);
    if (reasons || errorType === "refusal" || errorType === "content_policy_violation") {
      log.warn("ai.refused", { ...detail, reasons: reasons?.join(",") ?? null });
      return fail(new AIError("refused", "The AI provider declined this request"), false);
    }
    log.error("ai.forbidden", new Error("OpenRouter refused the request"), detail);
    return fail(new AIError("unavailable", "OpenRouter refused the request"), false);
  }
  if (status === 404) {
    log.error("ai.no_route", new Error("OpenRouter found no route for the model"), detail);
    return fail(new AIError("unavailable", "The AI model isn't available"), false);
  }
  if (status === 413) {
    log.warn("ai.request_too_large", detail);
    return fail(new AIError("too_long", "The request is too large for the AI model"), false);
  }
  log.error("ai.bad_request", new Error("OpenRouter rejected the request"), detail);
  return fail(new AIError("invalid_output", "The AI provider rejected the request"), false);
}

function causeCode(error: Error): string | null {
  const cause: unknown = error.cause;
  return cause && typeof cause === "object" && "code" in cause ? text(cause.code) : null;
}

export function thrownFailure(error: unknown, fields: AICallFields): CallFailure {
  if (error instanceof AIError) return { error, retryable: false };
  if (error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")) {
    log.warn("ai.deadline_exceeded", fields);
    return { error: new AIError("unavailable", "The AI model took too long to answer"), retryable: false };
  }
  // A fetch TypeError message can quote request headers (a bad key): log only the cause.
  if (error instanceof TypeError) {
    log.warn("ai.unavailable", { ...fields, status: null, cause: causeCode(error) });
    return { error: new AIError("unavailable", "Couldn't reach the AI provider"), retryable: true };
  }
  log.error("ai.unexpected_error", error, fields);
  return { error: new AIError("unavailable", "The AI request failed unexpectedly"), retryable: false };
}
