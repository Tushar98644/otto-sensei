import { describe, expect, it } from "vitest";
import { jobPostingJsonLd, jsonLdScript, textToHtml } from "./json-ld";
import { filtersFromParams, isFiltered, paramsFromFilters } from "./params";
import { DEFAULT_FILTERS, type FeedJob } from "./types";

describe("filters in the address", () => {
  it("reads what parses and drops the rest", () => {
    expect(filtersFromParams({ q: " react ", remote: "1", role: "design", level: "senior", posted: "7", page: "3" })).toEqual({
      filters: { ...DEFAULT_FILTERS, q: "react", remote: true, role: "design", level: "senior", postedWithin: 7 },
      page: 3,
    });
    expect(filtersFromParams({ role: "hacker", q: "go", page: "9999" })).toEqual({
      filters: { ...DEFAULT_FILTERS, q: "go" },
      page: 1,
    });
    expect(filtersFromParams({ q: ["a", "b"] }).filters.q).toBe("a");
  });

  it("writes them back and knows the plain list", () => {
    const filters = { ...DEFAULT_FILTERS, q: "data", remote: true, postedWithin: 30 as const };
    expect(paramsFromFilters(filters, 2)).toBe("?q=data&remote=1&posted=30&page=2");
    expect(paramsFromFilters(DEFAULT_FILTERS)).toBe("");
    expect(isFiltered(DEFAULT_FILTERS)).toBe(false);
  });
});

const JOB: FeedJob & { description: string; validThrough: number | null } = {
  id: "8a9b6a34-3c55-4a52-8f1d-1f5c2b1d0e11",
  source: "greenhouse",
  company: "Acme",
  title: "Backend Engineer",
  location: "Remote - Germany",
  remote: true,
  employmentType: "full_time",
  seniority: "mid",
  postedAt: Date.UTC(2026, 9, 22),
  url: "https://job-boards.greenhouse.io/acme/jobs/1",
  keywords: ["Go"],
  closed: false,
  description: "About us\n\n- Build APIs in Go\n- Ship <fast>",
  validThrough: null,
};

describe("jobPostingJsonLd", () => {
  it("describes a republishable open job for search engines", () => {
    expect(jobPostingJsonLd(JOB)).toMatchObject({
      "@type": "JobPosting",
      title: "Backend Engineer",
      datePosted: "2026-10-22T00:00:00.000Z",
      employmentType: "FULL_TIME",
      hiringOrganization: { name: "Acme" },
      jobLocationType: "TELECOMMUTE",
      applicantLocationRequirements: { name: "Germany" },
      directApply: false,
      url: JOB.url,
    });
    expect(textToHtml(JOB.description)).toBe("<p>About us</p><ul><li>Build APIs in Go</li><li>Ship &lt;fast&gt;</li></ul>");
  });

  it("gives none for sources that don't allow it, or closed jobs", () => {
    expect(jobPostingJsonLd({ ...JOB, source: "himalayas" })).toBeNull();
    expect(jobPostingJsonLd({ ...JOB, source: "remoteok" })).toBeNull();
    expect(jobPostingJsonLd({ ...JOB, closed: true })).toBeNull();
  });

  it("can't be closed early by the text inside it", () => {
    expect(jsonLdScript({ title: "</script><script>alert(1)</script>" })).not.toContain("</script>");
  });
});
