import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetEnvForTests } from "@/lib/env";

const send = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    batch = { send };
  },
}));

const { emailConfigured, emailSender } = await import("./email");

const MESSAGE = { to: "maya@example.com", subject: "Hi", html: "<p>Hi</p>", text: "Hi" };

describe("emailSender", () => {
  beforeEach(() => {
    send.mockReset();
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "Otto Sensei <otto@example.com>";
    resetEnvForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    resetEnvForTests();
  });

  it("is off unless both the key and the sender address are set", () => {
    expect(emailConfigured()).toBe(true);
    delete process.env.EMAIL_FROM;
    resetEnvForTests();
    expect(emailConfigured()).toBe(false);
    expect(emailSender()).toBeNull();
  });

  it("sends one batch from the configured address with the idempotency key", async () => {
    send.mockResolvedValue({ data: { data: [{ id: "e1" }], errors: [] }, error: null, headers: null });
    const result = await emailSender()!.sendBatch([MESSAGE], "follow-up-abc");
    expect(result).toEqual({ sent: 1, failed: 0 });
    expect(send).toHaveBeenCalledTimes(1);
    const [payload, options] = send.mock.calls[0]!;
    expect(payload).toEqual([{ from: "Otto Sensei <otto@example.com>", ...MESSAGE }]);
    expect(options).toMatchObject({ idempotencyKey: "follow-up-abc", batchValidation: "permissive" });
  });

  it("counts messages Resend rejected one by one", async () => {
    send.mockResolvedValue({
      data: { data: [{ id: "e1" }], errors: [{ index: 1, message: "Invalid `to` field" }] },
      error: null,
      headers: null,
    });
    const result = await emailSender()!.sendBatch([MESSAGE, MESSAGE], "k");
    expect(result).toEqual({ sent: 1, failed: 1 });
  });

  it("retries once, with the same key, after a rate limit or an outage", async () => {
    vi.useFakeTimers();
    send
      .mockResolvedValueOnce({
        data: null,
        error: { name: "rate_limit_exceeded", statusCode: 429, message: "Too many" },
        headers: null,
      })
      .mockResolvedValueOnce({ data: { data: [{ id: "e1" }], errors: [] }, error: null, headers: null });
    const pending = emailSender()!.sendBatch([MESSAGE], "k");
    await vi.runAllTimersAsync();
    expect(await pending).toEqual({ sent: 1, failed: 0 });
    expect(send.mock.calls.map((call) => (call[1] as { idempotencyKey: string }).idempotencyKey)).toEqual([
      "k",
      "k",
    ]);
  });

  it("doesn't retry a request Resend will never accept", async () => {
    send.mockResolvedValue({
      data: null,
      error: { name: "invalid_from_address", statusCode: 422, message: "Bad from" },
      headers: null,
    });
    expect(await emailSender()!.sendBatch([MESSAGE], "k")).toEqual({ sent: 0, failed: 1 });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("sends nothing for an empty batch", async () => {
    expect(await emailSender()!.sendBatch([], "k")).toEqual({ sent: 0, failed: 0 });
    expect(send).not.toHaveBeenCalled();
  });
});
