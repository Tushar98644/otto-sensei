import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { sign, signedHeaders, SIGNATURE_HEADER, TIMESTAMP_HEADER } from "./sign";

const SECRET = "test-secret-that-is-long-enough-for-otto-1234";

describe("signing", () => {
  it("is HMAC-SHA256 over the timestamp and the body, as hex", async () => {
    const body = JSON.stringify({ v: 1, subject: "Thanks for applying to Quill! ✨" });
    const expected = createHmac("sha256", SECRET).update(`1763290000.${body}`).digest("hex");
    expect(await sign(SECRET, 1763290000, body)).toBe(`v1=${expected}`);
  });

  it("changes with the body, the time and the secret", async () => {
    const base = await sign(SECRET, 100, "a");
    expect(await sign(SECRET, 100, "b")).not.toBe(base);
    expect(await sign(SECRET, 101, "a")).not.toBe(base);
    expect(await sign(`${SECRET}x`, 100, "a")).not.toBe(base);
  });

  it("sends whole seconds and the signature that covers them", async () => {
    const headers = await signedHeaders(SECRET, "{}", 1_763_290_000_999);
    expect(headers[TIMESTAMP_HEADER]).toBe("1763290000");
    expect(headers[SIGNATURE_HEADER]).toBe(await sign(SECRET, 1763290000, "{}"));
    expect(headers["content-type"]).toBe("application/json");
  });
});
