import { describe, expect, it } from "vitest";
import { englishMessages } from "@/i18n/messages";
import { SUPPORT_MAILTO } from "./copy";
import { CODE_LENGTH, EMAIL_MAX_LENGTH, codeDigits, looksLikeEmail } from "./sign-in-rules";

describe("codeDigits", () => {
  it.each([
    ["123456", "123456"],
    ["123 456", "123456"],
    ["123-456", "123456"],
    [" 123456\n", "123456"],
    ["Your code is 123456.", "123456"],
    ["Otto Sensei 2026 code: 654321", "654321"],
    ["12345", "12345"],
    ["1234567", "123456"],
    ["12a34", "1234"],
    ["", ""],
    ["abc", ""],
  ])("reads %j as %j", (input, expected) => {
    expect(codeDigits(input)).toBe(expected);
  });

  it("never returns more than the code length", () => {
    expect(codeDigits("9".repeat(50))).toHaveLength(CODE_LENGTH);
  });
});

describe("looksLikeEmail", () => {
  it.each(["name@example.com", "first.last+jobs@mail.example.co.uk", "a@b.io"])(
    "accepts %s",
    (value) => {
      expect(looksLikeEmail(value)).toBe(true);
    },
  );

  it.each(["", "name", "name@", "@example.com", "name@example", "na me@example.com", "a@b@c.com"])(
    "rejects %j",
    (value) => {
      expect(looksLikeEmail(value)).toBe(false);
    },
  );

  it("rejects addresses longer than the API allows", () => {
    expect(looksLikeEmail(`${"a".repeat(EMAIL_MAX_LENGTH)}@example.com`)).toBe(false);
  });
});

const { signIn, login, upgrade } = englishMessages();

// Otto's account lines in English.
const ACCOUNT_OTTO = {
  signInDialog: signIn.dialog.otto,
  login: login.otto,
  signedOut: signIn.account,
  upgradePitch: upgrade.otto.pitch,
  upgradeSignIn: signIn.upgrade.otto,
  billingOff: upgrade.otto.billingOff,
  alreadyMax: upgrade.otto.alreadyMax,
};

describe("account copy", () => {
  it.each([...Object.entries(ACCOUNT_OTTO), ["sessionEnded", signIn.gate.sessionEnded]])(
    "%s stays short, plain and complete",
    (_key, text) => {
      expect(text.trim()).toBe(text);
      expect(text).toMatch(/[.!?]$/);
      expect(text.split(/\s+/).length).toBeLessThanOrEqual(18);
      expect(text).not.toMatch(/₹|lakh|crore|rupee/i);
    },
  );

  it("builds a mailto link with an encoded subject", () => {
    expect(SUPPORT_MAILTO).toMatch(/^mailto:[^?\s]+@[^?\s]+\?subject=[^\s]+$/);
  });
});
