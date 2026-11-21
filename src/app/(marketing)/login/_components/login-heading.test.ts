import { describe, expect, it } from "vitest";
import { upgradeHref } from "@/components/site/routes";
import { loginHeading } from "./login-heading";

describe("loginHeading", () => {
  it("names the page the visitor was heading to", () => {
    expect(loginHeading("/dashboard/jobs", true)).toBe("Sign in to see your job matches");
    expect(loginHeading("/dashboard/jobs?resume=abc", true)).toBe(
      "Sign in to see your job matches",
    );
    expect(loginHeading("/dashboard/portfolio", true)).toBe("Sign in to make your portfolio");
    expect(loginHeading("/dashboard/portfolio/edit", false)).toBe("Sign in to make your portfolio");
  });

  it("says trial only for the plan and period the trial is on, and only while it's offered", () => {
    expect(loginHeading(upgradeHref("pro", "month"), true)).toBe("Sign in to start your trial");
    expect(loginHeading("/dashboard/account?upgrade=1", true)).toBe("Sign in to start your trial");
    expect(loginHeading(upgradeHref("pro", "year"), true)).toBe("Sign in to upgrade");
    expect(loginHeading(upgradeHref("max", "month"), true)).toBe("Sign in to upgrade");
    expect(loginHeading(upgradeHref("pro", "month"), false)).toBe("Sign in to upgrade");
  });

  it("stays plain for anything else, or for a next it wouldn't follow", () => {
    for (const next of [null, undefined, "", "/dashboard", "/studio", "/dashboard/jobsearch"]) {
      expect(loginHeading(next, true)).toBe("Sign in");
    }
    expect(loginHeading("https://evil.example/dashboard/jobs", true)).toBe("Sign in");
    expect(loginHeading("//evil.example/dashboard/jobs", true)).toBe("Sign in");
    expect(loginHeading("https://evil.example/account?upgrade=1", true)).toBe("Sign in");
  });
});
