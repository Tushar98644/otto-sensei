import { describe, expect, it } from "vitest";
import { descriptionText, findJsonLdJob } from "./jsonld";
import { ASHBY_JSON_LD } from "./test-fixtures";

describe("findJsonLdJob", () => {
  it("reads Ashby's JobPosting", () => {
    const job = findJsonLdJob([JSON.stringify(ASHBY_JSON_LD)]);
    expect(job).toMatchObject({
      title: "Senior / Staff Fullstack Engineer",
      company: "Linear",
      location: "Remote · European Union",
      firstPostedAt: Date.UTC(2021, 3, 27),
      updatedAt: null,
      closesAt: null,
    });
    expect(job?.text).toContain(
      "What you'll do\n\n- Build product features end to end, across the stack.\n- Care",
    );
  });

  it("finds the posting inside @graph, with @type as a list, and reads postal addresses", () => {
    const graph = {
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "Organization", name: "Acme" },
        {
          "@type": ["JobPosting"],
          title: "Data Analyst &amp; Reporting",
          hiringOrganization: "Acme Corp",
          description:
            "&lt;p&gt;Analyze &amp;amp; report.&lt;/p&gt;&lt;ul&gt;&lt;li&gt;SQL&lt;/li&gt;&lt;/ul&gt;",
          datePosted: "2026-09-01T09:00:00Z",
          dateModified: "2026-10-01T09:00:00Z",
          validThrough: "2026-12-31",
          jobLocation: [
            {
              "@type": "Place",
              address: {
                addressLocality: "Toronto",
                addressRegion: "ON",
                addressCountry: { name: "CA" },
              },
            },
            { "@type": "Place", address: "Berlin, Germany" },
          ],
          qualifications: "Three years with SQL and dashboards.",
        },
      ],
    };
    expect(findJsonLdJob(["not json", JSON.stringify(graph)])).toEqual({
      title: "Data Analyst & Reporting",
      company: "Acme Corp",
      location: "Toronto, ON, CA · Berlin, Germany",
      text: "Analyze & report.\n\n- SQL\n\nQualifications\nThree years with SQL and dashboards.",
      firstPostedAt: Date.UTC(2026, 8, 1, 9),
      updatedAt: Date.UTC(2026, 9, 1, 9),
      closesAt: Date.UTC(2026, 11, 31),
    });
  });

  it("forgives raw line breaks inside strings and comment wrappers", () => {
    const block =
      '<!--{"@type":"JobPosting","title":"Nurse","description":"Line one\nLine two"}-->';
    expect(findJsonLdJob([block])?.text).toBe("Line one Line two");
  });

  it("returns null without a JobPosting", () => {
    expect(findJsonLdJob([JSON.stringify({ "@type": "WebSite", name: "Acme" })])).toBeNull();
    expect(findJsonLdJob([])).toBeNull();
  });
});

describe("descriptionText", () => {
  it("keeps plain text lines", () => {
    expect(descriptionText("About us\n\n\n\nWe build   tools.\n- Remote")).toBe(
      "About us\n\nWe build tools.\n- Remote",
    );
  });
});
