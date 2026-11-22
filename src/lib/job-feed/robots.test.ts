import { describe, expect, it } from "vitest";
import { robotsAllows } from "./robots";
import { WORKDAY_ROBOTS } from "./test-fixtures";

const API = "/wday/cxs/nvidia/NVIDIAExternalCareerSite/jobs";

describe("robotsAllows", () => {
  it("allows what a Workday tenant's file doesn't name", () => {
    expect(robotsAllows(WORKDAY_ROBOTS, "OttoResumeBot", API)).toBe(true);
    expect(robotsAllows(WORKDAY_ROBOTS, "OttoResumeBot", "/refreshFacet/x")).toBe(false);
    expect(robotsAllows("", "OttoResumeBot", API)).toBe(true);
  });

  it("follows our own group over the general one", () => {
    const file = "User-agent: *\nDisallow: /\n\nUser-agent: ottoresumebot\nAllow: /wday/\n";
    expect(robotsAllows(file, "OttoResumeBot", API)).toBe(true);
    expect(robotsAllows(file, "OttoResumeBot", "/other")).toBe(true);
    expect(robotsAllows(file, "SomeOtherBot", API)).toBe(false);
  });

  it("lets the longest rule win, Allow on a tie, with wildcards and an end anchor", () => {
    const file = [
      "User-agent: Googlebot",
      "User-agent: *",
      "Disallow: /wday/",
      "Allow: /wday/cxs/*/jobs$",
      "Disallow: /*.pdf$",
    ].join("\n");
    expect(robotsAllows(file, "OttoResumeBot", API)).toBe(true);
    expect(robotsAllows(file, "OttoResumeBot", `${API}/more`)).toBe(false);
    expect(robotsAllows(file, "OttoResumeBot", "/wday/cxs/nvidia/site/job/x")).toBe(false);
    expect(robotsAllows(file, "OttoResumeBot", "/files/a.pdf")).toBe(false);
    expect(robotsAllows("User-agent: *\nDisallow: /a\nAllow: /a\n", "OttoResumeBot", "/a")).toBe(
      true,
    );
  });

  it("ends a group at the next user-agent line after its rules", () => {
    const file = "User-agent: *\nDisallow: /wday/\nUser-agent: Bingbot\nAllow: /\n";
    expect(robotsAllows(file, "OttoResumeBot", API)).toBe(false);
  });
});
