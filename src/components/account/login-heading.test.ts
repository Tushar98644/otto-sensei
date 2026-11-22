import { describe, expect, it } from "vitest";
import { upgradeHref } from "@/components/site/routes";
import { loginHeading, loginVariant } from "./login-heading";

const heading = (next: string | null | undefined, trial: boolean) =>
  loginHeading(loginVariant(next), trial);

describe("loginHeading", () => {
  it("names the page the visitor was heading to", () => {
    expect(heading("/dashboard/jobs", true)).toBe("Sign in to see your job matches");
    expect(heading("/dashboard/jobs?resume=abc", true)).toBe("Sign in to see your job matches");
    expect(heading("/dashboard/portfolio", true)).toBe("Sign in to make your portfolio");
    expect(heading("/dashboard/portfolio/edit", false)).toBe("Sign in to make your portfolio");
  });

  it("says trial only for the plan and period the trial is on, and only while it's offered", () => {
    expect(heading(upgradeHref("pro", "month"), true)).toBe("Sign in to start your trial");
    expect(heading("/dashboard/account?upgrade=1", true)).toBe("Sign in to start your trial");
    expect(heading(upgradeHref("pro", "year"), true)).toBe("Sign in to upgrade");
    expect(heading(upgradeHref("max", "month"), true)).toBe("Sign in to upgrade");
    expect(heading(upgradeHref("pro", "month"), false)).toBe("Sign in to upgrade");
  });

  it("stays plain for anything else, or for a next it wouldn't follow", () => {
    for (const next of [null, undefined, "", "/dashboard", "/studio", "/dashboard/jobsearch"]) {
      expect(loginVariant(next)).toBeNull();
      expect(heading(next, true)).toBe("Sign in");
    }
    expect(heading("https://evil.example/dashboard/jobs", true)).toBe("Sign in");
    expect(heading("//evil.example/dashboard/jobs", true)).toBe("Sign in");
    expect(heading("https://evil.example/account?upgrade=1", true)).toBe("Sign in");
  });
});
