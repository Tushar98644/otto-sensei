import { describe, expect, it } from "vitest";
import type { JobSource } from "@/lib/api/types";
import { hiringSystemOf } from "./detect";

const page = (url: string, source: JobSource = "page") => ({ source, url });

describe("hiringSystemOf", () => {
  it("trusts the board a posting was read from", () => {
    expect(hiringSystemOf(page("https://about.gitlab.com/jobs/apply/?gh_jid=1", "greenhouse"))).toBe(
      "greenhouse",
    );
    expect(hiringSystemOf(page("https://jobs.lever.co/spotify/2a55d6c9", "lever"))).toBe("lever");
    expect(hiringSystemOf(page("https://linear.app/careers/123", "ashby"))).toBe("ashby");
  });

  it("knows each system from its job pages' address", () => {
    const cases: [string, string][] = [
      ["https://job-boards.greenhouse.io/gitlab/jobs/8638232002", "greenhouse"],
      ["https://careers.acme.com/open-roles?gh_jid=4012345", "greenhouse"],
      ["https://jobs.eu.lever.co/acme/2a55d6c9-c564-443a-be3e-a3851db5a93b", "lever"],
      ["https://acme.com/careers?ashby_jid=2a55d6c9-c564-443a-be3e-a3851db5a93b", "ashby"],
      ["https://adobe.wd5.myworkdayjobs.com/en-US/external_experienced/job/Senior-Engineer_R1", "workday"],
      ["https://wd5.myworkdaysite.com/recruiting/uw/UWHires/job/Seattle/Analyst_R-1", "workday"],
      ["https://careers-peraton.icims.com/jobs/12345/engineer/job", "icims"],
      ["https://s01schneiderele.taleo.net/careersection/2/jobdetail.ftl?job=123", "taleo"],
      ["https://career4.successfactors.com/sfcareer/jobreqcareer?jobId=1&company=acme", "successfactors"],
      ["https://career2.successfactors.eu/career?company=acme", "successfactors"],
      ["https://illinois.jobs2web.com/job/Urbana-Engineer/123/", "successfactors"],
      ["https://jobs.sap.com/job/Walldorf-Developer/123/", "successfactors"],
      ["https://jobs.smartrecruiters.com/Acme/7443-engineer", "smartrecruiters"],
      ["https://apply.workable.com/acme/j/ABC123/", "workable"],
      ["https://acme.bamboohr.com/careers/42", "bamboohr"],
      ["https://jobs.jobvite.com/acme/job/oAbC123", "jobvite"],
      ["https://acme.recruitee.com/o/engineer", "recruitee"],
      ["https://acme.na.teamtailor.com/jobs/123-engineer", "teamtailor"],
    ];
    for (const [url, system] of cases) expect(hiringSystemOf(page(url, "jsonld")), url).toBe(system);
  });

  it("reads a typed link when the job couldn't be read, with or without the scheme", () => {
    expect(hiringSystemOf(null, "acme.wd1.myworkdayjobs.com/External/job/123")).toBe("workday");
    expect(hiringSystemOf(null, "  https://acme.taleo.net/careersection/jobdetail.ftl  ")).toBe("taleo");
  });

  it("says nothing for company sites, vendor pages and junk", () => {
    expect(hiringSystemOf(page("https://careers.airbnb.com/positions/123"))).toBeNull();
    expect(hiringSystemOf(page("https://www.icims.com/products/"))).toBeNull();
    expect(hiringSystemOf(page("https://help.workable.com/hc/en-us"))).toBeNull();
    expect(hiringSystemOf(page("https://chp.tbe.taleo.net/chp04/ats/careers/requisition.jsp"))).toBeNull();
    expect(hiringSystemOf(page("https://notworkday.com/myworkdayjobs.com"))).toBeNull();
    expect(hiringSystemOf(null, "not a link")).toBeNull();
    expect(hiringSystemOf(null, "")).toBeNull();
    expect(hiringSystemOf(null)).toBeNull();
  });
});
