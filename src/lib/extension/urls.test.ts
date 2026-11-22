import { describe, expect, it } from "vitest";
import { canonicalJobUrl, jobSiteOf } from "./urls";

describe("job links", () => {
  it("knows each supported site", () => {
    expect(jobSiteOf("https://www.linkedin.com/jobs/view/1234567/")).toBe("linkedin");
    expect(jobSiteOf("https://in.indeed.com/viewjob?jk=abc12345")).toBe("indeed");
    expect(jobSiteOf("https://job-boards.eu.greenhouse.io/acme/jobs/1")).toBe("greenhouse");
    expect(jobSiteOf("https://acme.wd5.myworkdayjobs.com/en-US/x/job/y/z")).toBe("workday");
    expect(jobSiteOf("https://notlinkedin.com.evil.example/jobs")).toBe("other");
    expect(jobSiteOf("not a link")).toBe("other");
  });

  it("files a job under one link however it was opened", () => {
    expect(
      canonicalJobUrl("https://www.linkedin.com/jobs/search/?currentJobId=4471319619&keywords=go"),
    ).toBe("https://www.linkedin.com/jobs/view/4471319619/");
    expect(
      canonicalJobUrl("https://in.linkedin.com/jobs/view/python-engineer-at-acme-4471319619?trk=x"),
    ).toBe("https://www.linkedin.com/jobs/view/4471319619/");
    expect(canonicalJobUrl("https://in.indeed.com/jobs?q=data&vjk=9848b2dc5272bd9c")).toBe(
      "https://in.indeed.com/viewjob?jk=9848b2dc5272bd9c",
    );
    expect(
      canonicalJobUrl("https://boards.greenhouse.io/embed/job_app?for=gitlab&token=8638232002"),
    ).toBe("https://job-boards.greenhouse.io/gitlab/jobs/8638232002");
    expect(
      canonicalJobUrl("https://boards.greenhouse.io/gitlab/jobs/8638232002?gh_src=x#app"),
    ).toBe("https://job-boards.greenhouse.io/gitlab/jobs/8638232002");
    expect(
      canonicalJobUrl("https://jobs.lever.co/acme/6ED76CE8-4156-4b60-b120-403538bd66cd/apply"),
    ).toBe("https://jobs.lever.co/acme/6ed76ce8-4156-4b60-b120-403538bd66cd");
    expect(
      canonicalJobUrl(
        "https://nvidia.wd5.myworkdayjobs.com/en-US/External/job/US-CA-Remote/Engineer_JR1/apply/applyManually?source=x",
      ),
    ).toBe("https://nvidia.wd5.myworkdayjobs.com/en-US/External/job/US-CA-Remote/Engineer_JR1");
    expect(canonicalJobUrl("https://acme.example.com/careers/42?utm_source=x&b=2&a=1#top")).toBe(
      "https://acme.example.com/careers/42?a=1&b=2",
    );
  });

  it("refuses anything that isn't a web page", () => {
    expect(canonicalJobUrl("javascript:alert(1)")).toBeNull();
    expect(canonicalJobUrl("file:///etc/passwd")).toBeNull();
    expect(canonicalJobUrl("")).toBeNull();
  });
});
