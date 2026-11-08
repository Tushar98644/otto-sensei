import { describe, expect, it } from "vitest";
import { DEFAULT_NEXT_PATH, loginHref, safeNextPath } from "./next-path";

describe("safeNextPath", () => {
  it.each([
    ["/studio", "/studio"],
    ["/account?upgrade=1", "/account?upgrade=1"],
    ["/studio?step=fix#line-3", "/studio?step=fix#line-3"],
    ["/pricing", "/pricing"],
  ])("keeps the same-site path %s", (value, expected) => {
    expect(safeNextPath(value)).toBe(expected);
  });

  it.each([
    [null],
    [undefined],
    [""],
    ["studio"],
    [" /studio"],
    ["https://evil.example/phish"],
    ["//evil.example"],
    ["/\\evil.example"],
    ["/\t/evil.example"],
    ["/\n/evil.example"],
    ["javascript:alert(1)"],
    [`/${"a".repeat(600)}`],
  ])("falls back for %j", (value) => {
    expect(safeNextPath(value)).toBe(DEFAULT_NEXT_PATH);
  });

  it("never sends a signed-in user back to /login", () => {
    expect(safeNextPath("/login")).toBe(DEFAULT_NEXT_PATH);
    expect(safeNextPath("/login?next=/login")).toBe(DEFAULT_NEXT_PATH);
    expect(safeNextPath("/login/")).toBe(DEFAULT_NEXT_PATH);
    expect(safeNextPath("/loginhelp")).toBe("/loginhelp");
  });

  it("uses the given fallback", () => {
    expect(safeNextPath("//evil.example", "/account")).toBe("/account");
  });

  it("resolves dot segments the way the browser will", () => {
    expect(safeNextPath("/studio/../account")).toBe("/account");
  });
});

describe("loginHref", () => {
  it("encodes the return path", () => {
    expect(loginHref("/account?upgrade=1")).toBe("/login?next=%2Faccount%3Fupgrade%3D1");
  });

  it("drops unsafe or missing return paths", () => {
    expect(loginHref()).toBe("/login");
    expect(loginHref("https://evil.example")).toBe("/login");
  });
});
