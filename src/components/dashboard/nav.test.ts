import { describe, expect, it } from "vitest";
import { APP_NAV, isCurrent } from "./nav";

const [home, resumes, applications, formats] = APP_NAV;

describe("isCurrent", () => {
  it("matches Home only on the dashboard itself", () => {
    expect(home && isCurrent(home, "/dashboard")).toBe(true);
    expect(home && isCurrent(home, "/dashboard/resumes")).toBe(false);
  });

  it("matches a section and its sub-pages, but not look-alike paths", () => {
    expect(resumes && isCurrent(resumes, "/dashboard/resumes")).toBe(true);
    expect(formats && isCurrent(formats, "/dashboard/formats/modern")).toBe(true);
    expect(resumes && isCurrent(resumes, "/dashboard/resumes-old")).toBe(false);
    expect(applications && isCurrent(applications, "/dashboard/applications")).toBe(true);
    expect(applications && isCurrent(applications, "/dashboard/resumes")).toBe(false);
  });
});
