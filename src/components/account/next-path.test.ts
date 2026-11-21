import { describe, expect, it } from "vitest";
import { DEFAULT_NEXT_PATH, loginHref, safeNextPath, withPageHash } from "./next-path";

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

  it("rejects dot segments that collapse to another site", () => {
    expect(safeNextPath("/.//evil.example")).toBe("/dashboard");
    expect(safeNextPath("/x/..//evil.example")).toBe("/dashboard");
    expect(safeNextPath("/./\\evil.example")).toBe("/dashboard");
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

describe("withPageHash", () => {
  it("carries the login page's #section to the page it returns to", () => {
    expect(withPageHash("/dashboard/account", "#reminders")).toBe("/dashboard/account#reminders");
    expect(withPageHash("/account?tab=profile", "#plan")).toBe("/account?tab=profile#plan");
  });

  it("keeps a path that already names a section, or when there is none", () => {
    expect(withPageHash("/dashboard/account#invite", "#reminders")).toBe("/dashboard/account#invite");
    expect(withPageHash("/dashboard", "")).toBe("/dashboard");
    expect(withPageHash("/dashboard", "#")).toBe("/dashboard");
  });
});
