import { describe, expect, it } from "vitest";
import {
  CODE_ALPHABET,
  formatRefCookie,
  inboxKey,
  invitePath,
  isReferralCode,
  parseRefCookie,
} from "./referrals";

describe("isReferralCode", () => {
  it("takes 8 characters from the unambiguous alphabet only", () => {
    expect(isReferralCode("abcd2345")).toBe(true);
    expect(isReferralCode("abcd234")).toBe(false);
    expect(isReferralCode("abcd23456")).toBe(false);
    for (const char of ["0", "1", "i", "l", "o", "A"]) {
      expect(CODE_ALPHABET).not.toContain(char);
      expect(isReferralCode(`abcd234${char}`)).toBe(false);
    }
    expect(isReferralCode(undefined)).toBe(false);
    expect(isReferralCode(12345678)).toBe(false);
  });
});

describe("invite cookie", () => {
  it("round-trips every stage", () => {
    for (const stage of ["landed", "checked", "joined"] as const) {
      expect(parseRefCookie(formatRefCookie({ code: "abcd2345", stage }))).toEqual({
        code: "abcd2345",
        stage,
      });
    }
    expect(formatRefCookie({ code: "abcd2345", stage: "landed" })).toBe("abcd2345");
  });

  it("drops anything it didn't write", () => {
    for (const value of [
      undefined,
      null,
      "",
      "abcd2345.x",
      "abcd2345.c.c",
      "ABCD2345",
      "../admin.c",
    ]) {
      expect(parseRefCookie(value)).toBeNull();
    }
  });

  it("links to the home page with the code", () => {
    expect(invitePath("abcd2345")).toBe("/?ref=abcd2345");
  });
});

describe("inboxKey", () => {
  it("treats plus tags and Gmail dots as the same mailbox", () => {
    expect(inboxKey("Ada.Lovelace+otto@Gmail.com")).toBe("adalovelace@gmail.com");
    expect(inboxKey("adalovelace@googlemail.com")).toBe("adalovelace@gmail.com");
    expect(inboxKey("ada+jobs@example.com")).toBe("ada@example.com");
  });

  it("keeps dots where the provider counts them", () => {
    expect(inboxKey("ada.lovelace@example.com")).not.toBe(inboxKey("adalovelace@example.com"));
  });
});
