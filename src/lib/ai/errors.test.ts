import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { statusFailure, thrownFailure } from "./errors";
import { AIError } from "./types";

const fields = { task: "fix", model: "anthropic/claude-opus-5.5" };

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("statusFailure", () => {
  it.each([
    [429, "rate_limited", true],
    [408, "unavailable", true],
    [500, "unavailable", true],
    [502, "unavailable", true],
    [503, "unavailable", true],
    [401, "unavailable", false],
    [402, "unavailable", false],
    [403, "unavailable", false],
    [404, "unavailable", false],
    [413, "too_long", false],
    [400, "invalid_output", false],
    [422, "invalid_output", false],
  ])("maps %i to %s (retryable: %s)", (status, code, retryable) => {
    const failure = statusFailure(status, { code: status, message: "Nope" }, fields);
    expect(failure.error).toBeInstanceOf(AIError);
    expect(failure.error.code).toBe(code);
    expect(failure.retryable).toBe(retryable);
  });

  it("treats a 403 with moderation reasons as a refusal", () => {
    const failure = statusFailure(403, { code: 403, metadata: { reasons: ["violence"] } }, fields);
    expect(failure).toMatchObject({ error: { code: "refused" }, retryable: false });
  });

  it.each(["refusal", "content_policy_violation"])("treats a 403 %s as a refusal", (errorType) => {
    const failure = statusFailure(403, { code: 403, metadata: { error_type: errorType } }, fields);
    expect(failure).toMatchObject({ error: { code: "refused" }, retryable: false });
  });

  it("retries a full in-flight budget but not an empty account", () => {
    const inFlight = statusFailure(402, { code: 402, metadata: { limit_source: "openrouter_in_flight_budget" } }, fields);
    expect(inFlight).toMatchObject({ error: { code: "rate_limited" }, retryable: true });
    const empty = statusFailure(402, { code: 402, message: "Insufficient credits" }, fields);
    expect(empty).toMatchObject({ error: { code: "unavailable" }, retryable: false });
  });

  it("logs provider details without the message text", () => {
    statusFailure(
      502,
      { code: 502, message: "Jane Doe's resume", metadata: { error_type: "provider_unavailable", provider_code: "overloaded" } },
      fields,
    );
    const logged = JSON.stringify(vi.mocked(console.warn).mock.calls);
    expect(logged).toContain("provider_unavailable");
    expect(logged).toContain("overloaded");
    expect(logged).not.toContain("Jane Doe");
  });
});

describe("thrownFailure", () => {
  it("passes an AIError through unchanged", () => {
    const original = new AIError("refused", "No");
    expect(thrownFailure(original, fields)).toEqual({ error: original, retryable: false });
  });

  it("maps the deadline to unavailable without a retry", () => {
    const failure = thrownFailure(new DOMException("The operation timed out.", "TimeoutError"), fields);
    expect(failure).toMatchObject({ error: { code: "unavailable" }, retryable: false });
  });

  it("retries network failures", () => {
    const failure = thrownFailure(new TypeError("fetch failed"), fields);
    expect(failure).toMatchObject({ error: { code: "unavailable" }, retryable: true });
  });

  it("logs anything else as an unexpected error", () => {
    const failure = thrownFailure(new Error("boom"), fields);
    expect(failure).toMatchObject({ error: { code: "unavailable" }, retryable: false });
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("ai.unexpected_error"), expect.anything());
  });
});
