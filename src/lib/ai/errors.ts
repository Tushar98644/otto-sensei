import { z } from "zod";
import { log } from "@/lib/log";
import { AIError } from "./types";

// Safe to log: which feature called which model. Never prompt text or resume content.
export type AICallFields = { task: string; model: string };

// OpenRouter's error body. It arrives with an HTTP error status, or inside a 200 when the
// provider failed after the status line was sent.
export const ErrorBodySchema = z.object({
  code: z.union([z.number(), z.string()]).optional(),
  message: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ErrorBody = z.infer<typeof ErrorBodySchema>;

// `status` is set for failures OpenRouter reported, so the caller can tell a routing setup that
// can never work (503 on every attempt) from a blip.
export type CallFailure = { error: AIError; retryable: boolean; status?: number };

function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

// Moderation metadata also echoes the flagged input, which is resume text, so only the reason
// categories are ever logged.
function moderationReasons(body: ErrorBody | null): string[] | null {
  const reasons = body?.metadata?.reasons;
  return Array.isArray(reasons) ? reasons.filter((reason) => typeof reason === "string") : null;
}

/**
 * Maps an OpenRouter error status (or the code inside a 200 error body) to an AIError, and says
 * whether another attempt could succeed.
 */
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
    // 502: the model is down or answered badly; 503: no provider meets the routing rules right now.
    log.warn("ai.unavailable", detail);
    return fail(new AIError("unavailable", "The AI model is unavailable right now"), true);
  }
  if (status === 401) {
    // A bad or revoked key takes every AI feature down at once, so it has to stand out.
    log.error("ai.auth_failed", new Error("OpenRouter rejected the API key"), detail);
    return fail(new AIError("unavailable", "OpenRouter rejected the API key"), false);
  }
  if (status === 402) {
    // New and low-balance accounts get a cap on spend in flight, checked against max_tokens. It
    // clears as running calls finish, and the response says when to retry.
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
    // Guardrails, key permissions or a spending limit set in the OpenRouter dashboard.
    log.error("ai.forbidden", new Error("OpenRouter refused the request"), detail);
    return fail(new AIError("unavailable", "OpenRouter refused the request"), false);
  }
  if (status === 404) {
    // An unknown AI_MODEL, or no allowed provider serves it.
    log.error("ai.no_route", new Error("OpenRouter found no route for the model"), detail);
    return fail(new AIError("unavailable", "The AI model isn't available"), false);
  }
  if (status === 413) {
    log.warn("ai.request_too_large", detail);
    return fail(new AIError("too_long", "The request is too large for the AI model"), false);
  }
  // Requests are built entirely in code, so any other 4xx is a bug here (a parameter or schema the
  // API rejects), not something the person did.
  log.error("ai.bad_request", new Error("OpenRouter rejected the request"), detail);
  return fail(new AIError("invalid_output", "The AI provider rejected the request"), false);
}

function causeCode(error: Error): string | null {
  const cause: unknown = error.cause;
  return cause && typeof cause === "object" && "code" in cause ? text(cause.code) : null;
}

/** Maps anything fetch or body reading throws (network failure, the deadline) to an AIError. */
export function thrownFailure(error: unknown, fields: AICallFields): CallFailure {
  if (error instanceof AIError) return { error, retryable: false };
  if (error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")) {
    log.warn("ai.deadline_exceeded", fields);
    return { error: new AIError("unavailable", "The AI model took too long to answer"), retryable: false };
  }
  // fetch() rejects with a TypeError for DNS, connection and TLS failures. Its message can quote
  // request headers (a malformed key ends up in it), so only the cause code is logged.
  if (error instanceof TypeError) {
    log.warn("ai.unavailable", { ...fields, status: null, cause: causeCode(error) });
    return { error: new AIError("unavailable", "Couldn't reach the AI provider"), retryable: true };
  }
  log.error("ai.unexpected_error", error, fields);
  return { error: new AIError("unavailable", "The AI request failed unexpectedly"), retryable: false };
}
