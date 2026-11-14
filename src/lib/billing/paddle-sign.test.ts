import { describe, expect, it } from "vitest";
import { signBillingId, verifyBillingId } from "./paddle-sign";

const SECRET = "pdl_ntfset_test_secret";
const USER = "8d7f2c1e-4b3a-4c5d-9e8f-1a2b3c4d5e6f";

describe("signed billing ids", () => {
  it("accepts an id our server signed", () => {
    expect(verifyBillingId(USER, signBillingId(USER, SECRET), SECRET)).toBe(true);
  });

  it("refuses a missing, malformed, forged or other-secret signature", () => {
    const other = "8d7f2c1e-4b3a-4c5d-9e8f-000000000000";
    expect(verifyBillingId(USER, undefined, SECRET)).toBe(false);
    expect(verifyBillingId(USER, "not-hex", SECRET)).toBe(false);
    expect(verifyBillingId(USER, signBillingId(other, SECRET), SECRET)).toBe(false);
    expect(verifyBillingId(USER, signBillingId(USER, "another_secret"), SECRET)).toBe(false);
    expect(verifyBillingId(USER, signBillingId(USER, SECRET), "")).toBe(false);
  });
});
