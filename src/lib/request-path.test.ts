import { describe, expect, it } from "vitest";
import { REQUEST_PATH_HEADER, isWithin, requestedPathWithin, setRequestPath } from "./request-path";

describe("requestedPathWithin", () => {
  it("keeps the asked-for page and its query", () => {
    expect(requestedPathWithin("/dashboard/jobs", "/dashboard")).toBe("/dashboard/jobs");
    expect(requestedPathWithin("/dashboard/jobs?resume=r1&saved=1", "/dashboard")).toBe(
      "/dashboard/jobs?resume=r1&saved=1",
    );
    expect(requestedPathWithin("/dashboard?tab=x", "/dashboard")).toBe("/dashboard?tab=x");
  });

  it("falls back to the section itself for anything outside it", () => {
    for (const value of [
      null,
      undefined,
      "",
      "/studio",
      "/dashboardx",
      "/dashboard/../studio",
      "/login?next=/dashboard",
      "https://evil.example/dashboard",
      "//evil.example/dashboard",
      "/\\evil.example",
      `/dashboard/${"a".repeat(600)}`,
    ]) {
      expect(requestedPathWithin(value, "/dashboard"), String(value)).toBe("/dashboard");
    }
  });
});

describe("isWithin", () => {
  it("matches the section and the pages under it, never a lookalike", () => {
    expect(isWithin("/dashboard/jobs", "/dashboard/jobs")).toBe(true);
    expect(isWithin("/dashboard/jobs/saved", "/dashboard/jobs")).toBe(true);
    expect(isWithin("/dashboard/jobsearch", "/dashboard/jobs")).toBe(false);
    expect(isWithin("/dashboard", "/dashboard/jobs")).toBe(false);
  });
});

describe("setRequestPath", () => {
  it("copies the path and query, replacing whatever the browser sent", () => {
    const headers = new Headers({ [REQUEST_PATH_HEADER]: "/dashboard/account" });
    setRequestPath(headers, { pathname: "/dashboard/jobs", search: "?resume=r1" });
    expect(headers.get(REQUEST_PATH_HEADER)).toBe("/dashboard/jobs?resume=r1");
  });

  it("drops the browser's copy when the path is one we'd never follow", () => {
    const headers = new Headers({ [REQUEST_PATH_HEADER]: "/dashboard/account" });
    setRequestPath(headers, { pathname: "/dashboard/jobs", search: `?q=${"a".repeat(600)}` });
    expect(headers.has(REQUEST_PATH_HEADER)).toBe(false);
  });
});
