import { describe, expect, it } from "vitest";
import { JobReadError, type JobReadReason } from "./errors";
import { companyLabel, MAX_LINK_CHARS, parseJobLink, toFetchableUrl } from "./url";

const LEVER_ID = "2a55d6c9-c564-443a-be3e-a3851db5a93b";
const ASHBY_ID = "d3bc1ced-3ce4-4086-a050-555055dbb1ff";

function reasonOf(run: () => unknown): { reason: JobReadReason; site: string | null } | null {
  try {
    run();
    return null;
  } catch (error) {
    if (!(error instanceof JobReadError)) throw error;
    return { reason: error.reason, site: error.site };
  }
}

describe("parseJobLink", () => {
  it.each([
    ["https://boards.greenhouse.io/gitlab/jobs/8638232002", "gitlab", "8638232002"],
    [
      "https://job-boards.greenhouse.io/gitlab/jobs/8638232002?gh_src=abc#apply",
      "gitlab",
      "8638232002",
    ],
    ["https://job-boards.eu.greenhouse.io/acme/jobs/4012345", "acme", "4012345"],
    [
      "https://boards.greenhouse.io/embed/job_app?for=gitlab&token=8638232002",
      "gitlab",
      "8638232002",
    ],
    ["https://boards.greenhouse.io/gitlab?gh_jid=8638232002", "gitlab", "8638232002"],
  ])("reads Greenhouse link %s", (link, token, id) => {
    expect(parseJobLink(link)).toMatchObject({ kind: "greenhouse", token, id });
  });

  it("reads Lever links, including the apply page and the EU board", () => {
    expect(parseJobLink(`https://jobs.lever.co/spotify/${LEVER_ID}`)).toMatchObject({
      kind: "lever",
      company: "spotify",
      id: LEVER_ID,
      eu: false,
    });
    expect(
      parseJobLink(`https://jobs.lever.co/spotify/${LEVER_ID.toUpperCase()}/apply`),
    ).toMatchObject({
      id: LEVER_ID,
    });
    expect(parseJobLink(`https://jobs.eu.lever.co/acme/${LEVER_ID}`)).toMatchObject({
      kind: "lever",
      eu: true,
    });
  });

  it("reads Ashby links, including organization names with spaces", () => {
    expect(parseJobLink(`https://jobs.ashbyhq.com/linear/${ASHBY_ID}`)).toMatchObject({
      kind: "ashby",
      org: "linear",
      id: ASHBY_ID,
    });
    expect(
      parseJobLink(`https://jobs.ashbyhq.com/Acme%20Labs/${ASHBY_ID}/application`),
    ).toMatchObject({
      org: "Acme Labs",
    });
  });

  it("notes the board job on company career pages", () => {
    expect(
      parseJobLink("https://careers.airbnb.com/positions/8306554?gh_jid=8306554"),
    ).toMatchObject({
      kind: "page",
      greenhouseId: "8306554",
      ashbyId: null,
    });
    expect(parseJobLink(`https://acme.com/careers?ashby_jid=${ASHBY_ID}`)).toMatchObject({
      kind: "page",
      greenhouseId: null,
      ashbyId: ASHBY_ID,
    });
  });

  it("treats any other link as a page and cleans it up", () => {
    const target = parseJobLink("  http://example.com/jobs/42#top ");
    expect(target).toMatchObject({ kind: "page", greenhouseId: null, ashbyId: null });
    expect(target.url.toString()).toBe("https://example.com/jobs/42");
    expect(parseJobLink(`jobs.lever.co/spotify/${LEVER_ID}`)).toMatchObject({ kind: "lever" });
    expect(parseJobLink("example.com:443/jobs/1").url.toString()).toBe(
      "https://example.com/jobs/1",
    );
  });

  it("asks for one job when a board link lists many", () => {
    expect(reasonOf(() => parseJobLink("https://boards.greenhouse.io/gitlab"))?.reason).toBe(
      "listing",
    );
    expect(reasonOf(() => parseJobLink("https://jobs.lever.co/spotify"))?.reason).toBe("listing");
    expect(reasonOf(() => parseJobLink("https://jobs.ashbyhq.com/linear"))?.reason).toBe("listing");
  });

  it.each([
    ["https://www.linkedin.com/jobs/view/4012345678", "login_required", "LinkedIn"],
    ["https://lnkd.in/abc123", "login_required", "LinkedIn"],
    ["https://www.indeed.com/viewjob?jk=abc123", "blocked", "Indeed"],
    ["https://uk.indeed.com/viewjob?jk=abc123", "blocked", "Indeed"],
    ["https://www.glassdoor.co.uk/job-listing/x", "login_required", "Glassdoor"],
  ])("won't try %s", (link, reason, site) => {
    expect(reasonOf(() => parseJobLink(link))).toEqual({ reason, site });
  });

  it.each([
    "",
    "   ",
    "Senior engineer at Acme, remote",
    "ftp://example.com/job.txt",
    "javascript:alert(1)",
    "mailto:jobs@example.com",
    "https://user:secret@example.com/jobs/1",
    `https://example.com/${"a".repeat(MAX_LINK_CHARS)}`,
  ])("refuses %j as a link", (link) => {
    expect(reasonOf(() => parseJobLink(link))?.reason).toBe("invalid_url");
  });

  it.each([
    "https://localhost/jobs",
    "localhost:3000/api",
    "https://127.0.0.1/",
    "https://2130706433/",
    "https://0x7f.1/",
    "https://10.0.0.8/jobs",
    "https://169.254.169.254/latest/meta-data/",
    "https://[::1]/",
    "https://[::ffff:127.0.0.1]/",
    "https://[fd00:ec2::254]/",
    "https://intranet/jobs",
    "https://printer.local/",
    "https://db.internal/",
  ])("refuses the private address %s", (link) => {
    expect(reasonOf(() => parseJobLink(link))?.reason).toBe("private_address");
  });

  it("refuses ports other than 443", () => {
    expect(reasonOf(() => parseJobLink("https://example.com:8443/jobs/1"))?.reason).toBe(
      "unreachable",
    );
    expect(reasonOf(() => parseJobLink("http://example.com:8080/jobs/1"))?.reason).toBe(
      "unreachable",
    );
  });
});

describe("toFetchableUrl", () => {
  it("resolves redirects against the current page and upgrades http", () => {
    const base = new URL("https://jobs.example.com/a/b");
    expect(toFetchableUrl("/c?d=1", base).toString()).toBe("https://jobs.example.com/c?d=1");
    expect(toFetchableUrl("http://other.example.org/x", base).toString()).toBe(
      "https://other.example.org/x",
    );
    expect(reasonOf(() => toFetchableUrl("http://169.254.169.254/", base))?.reason).toBe(
      "private_address",
    );
  });
});

describe("companyLabel", () => {
  it.each([
    ["careers.airbnb.com", "airbnb"],
    ["www.stripe.com", "stripe"],
    ["jobs.acme.co.uk", "acme"],
    ["acme.com.au", "acme"],
    ["databricks.com", "databricks"],
    ["localhost", null],
  ])("%s → %s", (host, label) => {
    expect(companyLabel(host)).toBe(label);
  });
});
