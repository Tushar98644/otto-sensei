import { describe, expect, it } from "vitest";
import { fmt } from "@/i18n/format";
import { EN } from "../testing";
import { arrivedFromApp, closedSite, jobLinkParam, looksLikeLink } from "./job-links";

describe("closedSite", () => {
  it("names the sites that hide their posts from apps, with or without www or a scheme", () => {
    expect(closedSite("https://www.linkedin.com/jobs/view/4012345678")).toBe("LinkedIn");
    expect(closedSite("linkedin.com/jobs/view/4012345678")).toBe("LinkedIn");
    expect(closedSite("https://lnkd.in/eAbCdEf")).toBe("LinkedIn");
    expect(closedSite("https://uk.indeed.com/viewjob?jk=abc123")).toBe("Indeed");
    expect(closedSite("https://www.glassdoor.co.uk/job-listing/x")).toBe("Glassdoor");
  });

  it("reads every other site", () => {
    expect(closedSite("https://job-boards.greenhouse.io/gitlab/jobs/8638232002")).toBeNull();
    expect(closedSite("https://notlinkedin.com/jobs/1")).toBeNull();
    expect(closedSite("https://careers.example.com/linkedin")).toBeNull();
    expect(closedSite("not a link")).toBeNull();
    expect(closedSite("")).toBeNull();
  });

  it("says what to do in one line", () => {
    expect(fmt(EN.jobForm.closedSite, { site: "LinkedIn" })).toBe(
      "LinkedIn hides the post from apps. Copy the job description and paste it here.",
    );
  });
});

describe("looksLikeLink", () => {
  it("takes web links that start like one", () => {
    expect(looksLikeLink("https://jobs.lever.co/acme/123")).toBe(true);
    expect(looksLikeLink("  www.acme.com/careers/42 ")).toBe(true);
  });

  it("leaves other pastes alone", () => {
    expect(looksLikeLink("acme.com/careers")).toBe(false);
    expect(looksLikeLink("We are hiring a designer. https://acme.com")).toBe(false);
    expect(looksLikeLink("mailto:jobs@acme.com")).toBe(false);
    expect(looksLikeLink("https://localhost/jobs")).toBe(false);
    expect(looksLikeLink(`https://acme.com/${"a".repeat(2100)}`)).toBe(false);
  });
});

describe("jobLinkParam", () => {
  it("keeps web links and adds the scheme a bare address lacks", () => {
    expect(jobLinkParam("https://jobs.ashbyhq.com/acme/9b1c")).toBe(
      "https://jobs.ashbyhq.com/acme/9b1c",
    );
    expect(jobLinkParam("boards.greenhouse.io/acme/jobs/12")).toBe(
      "https://boards.greenhouse.io/acme/jobs/12",
    );
  });

  it("drops anything that isn't a plain web link", () => {
    expect(jobLinkParam(null)).toBeNull();
    expect(jobLinkParam("")).toBeNull();
    expect(jobLinkParam("javascript:alert(1)")).toBeNull();
    expect(jobLinkParam("data:text/html,hi")).toBeNull();
    expect(jobLinkParam("https://user:secret@acme.com/jobs/1")).toBeNull();
    expect(jobLinkParam("two words")).toBeNull();
  });
});

describe("arrivedFromApp", () => {
  const param = "https://jobs.lever.co/acme/123";
  const here = `https://ottosensei.com/studio?job=${encodeURIComponent(param)}`;

  it("trusts a move inside the app, which kept the page that first loaded", () => {
    expect(
      arrivedFromApp({ here, loaded: "https://ottosensei.com/dashboard", referrer: "", param }),
    ).toBe(true);
  });

  it("trusts a page load that came from one of our own pages", () => {
    expect(
      arrivedFromApp({
        here,
        loaded: here,
        referrer: "https://ottosensei.com/dashboard/jobs",
        param,
      }),
    ).toBe(true);
  });

  it("waits for a press when the link came from another site or from nowhere", () => {
    expect(arrivedFromApp({ here, loaded: here, referrer: "https://evil.example/", param })).toBe(
      false,
    );
    expect(arrivedFromApp({ here, loaded: here, referrer: "", param })).toBe(false);
    expect(arrivedFromApp({ here, loaded: null, referrer: "", param })).toBe(false);
  });

  it("waits for a press when a sign-in link carried the job, but not after any other sign-in", () => {
    const login = (next: string) => `https://ottosensei.com/login?next=${encodeURIComponent(next)}`;
    const carried = `/studio?job=${encodeURIComponent(param)}`;
    expect(arrivedFromApp({ here, loaded: login(carried), referrer: "", param })).toBe(false);
    expect(arrivedFromApp({ here, loaded: login("/dashboard/jobs"), referrer: "", param })).toBe(
      true,
    );
  });
});
