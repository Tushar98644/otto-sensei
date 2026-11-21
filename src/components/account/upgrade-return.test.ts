import { afterEach, describe, expect, it, vi } from "vitest";
import { returnPathHere, upgradeReturnPath } from "./upgrade-return";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("upgradeReturnPath", () => {
  it.each([
    ["/studio", "/studio"],
    ["/studio?step=tailor", "/studio?step=tailor"],
    ["/dashboard/jobs?q=design#top", "/dashboard/jobs?q=design#top"],
    ["/dashboard/letters", "/dashboard/letters"],
    ["/studio/../dashboard/jobs", "/dashboard/jobs"],
  ])("keeps the page %s", (value, expected) => {
    expect(upgradeReturnPath(value)).toBe(expected);
  });

  it.each([
    [null],
    [undefined],
    [""],
    ["studio"],
    ["https://evil.example/studio"],
    ["//evil.example"],
    ["/\\evil.example"],
    ["/\t/evil.example"],
    ["/.//evil.example"],
    ["/x/..//evil.example"],
    ["/%2e//evil.example"],
    ["/a/../\\evil.example"],
    ["javascript:alert(1)"],
    [`/${"a".repeat(600)}`],
  ])("drops %j, which isn't a path on this site", (value) => {
    expect(upgradeReturnPath(value)).toBeNull();
  });

  it.each([
    ["/"],
    ["/?ref=x"],
    ["/account"],
    ["/account?upgrade=1&next=/studio"],
    ["/account/"],
    ["/dashboard/account#plan"],
    ["/pricing"],
    ["/login?next=/studio"],
    ["/api/billing/checkout"],
    ["/auth/callback"],
  ])("drops %s, where there is nothing to pick up again", (value) => {
    expect(upgradeReturnPath(value)).toBeNull();
  });

  it("keeps a page that only starts like a blocked one", () => {
    expect(upgradeReturnPath("/accounts-help")).toBe("/accounts-help");
    expect(upgradeReturnPath("/pricing-faq")).toBe("/pricing-faq");
  });
});

describe("returnPathHere", () => {
  it("reads the page the upgrade started on", () => {
    vi.stubGlobal("window", {
      location: { pathname: "/dashboard/jobs", search: "?q=design", hash: "" },
    });
    expect(returnPathHere()).toBe("/dashboard/jobs?q=design");
  });

  it("has nothing to go back to on Account itself", () => {
    vi.stubGlobal("window", { location: { pathname: "/account", search: "", hash: "" } });
    expect(returnPathHere()).toBeNull();
  });

  it("has nothing outside a browser", () => {
    expect(returnPathHere()).toBeNull();
  });
});
