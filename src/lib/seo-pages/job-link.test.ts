import { describe, expect, it } from "vitest";
import { HIRING_SYSTEMS } from "@/lib/ats/systems";
import ats from "@/i18n/messages/en/ats";
import type { HiringSystemId } from "@/lib/ats/types";
import { type JobLinkRead, type SystemNames, jobLinkLine, readJobLink } from "./job-link";

const NAMES = Object.fromEntries(
  Object.values(HIRING_SYSTEMS).map((system) => [system.id, system.name]),
) as SystemNames;
const EN = ats.jobLink;

describe("readJobLink", () => {
  it("names the hiring system as soon as the link shows it, with or without https", () => {
    expect(readJobLink("https://acme.wd5.myworkdayjobs.com/en-US/careers/job/123")).toEqual({
      kind: "system",
      id: "workday",
    });
    expect(readJobLink("  jobs.lever.co/acme/abc  ")).toEqual({ kind: "system", id: "lever" });
    expect(readJobLink("https://acme.com/careers?gh_jid=4012345")).toEqual({
      kind: "system",
      id: "greenhouse",
    });
  });

  it("says it can't tell only once the text looks like a link", () => {
    expect(readJobLink("")).toEqual({ kind: "empty" });
    expect(readJobLink("   ")).toEqual({ kind: "empty" });
    expect(readJobLink("acme")).toEqual({ kind: "empty" });
    expect(readJobLink("https://acme.com/careers/42")).toEqual({ kind: "unknown" });
    expect(readJobLink("www.acme.co.uk")).toEqual({ kind: "unknown" });
  });

  it("doesn't take a vendor's own help pages for a job", () => {
    expect(readJobLink("https://www.myworkdayjobs.com/")).toEqual({ kind: "unknown" });
  });
});

describe("jobLinkLine", () => {
  const reads: JobLinkRead[] = [
    { kind: "empty" },
    { kind: "unknown" },
    { kind: "system", id: "workday" },
    { kind: "system", id: "successfactors" },
  ];

  it("tells you whether this page's notes apply to the job", () => {
    expect(jobLinkLine({ kind: "empty" }, "workday", NAMES, EN)).toBe(
      "Paste a job link and I'll tell you if the job uses Workday.",
    );
    expect(jobLinkLine({ kind: "system", id: "workday" }, "workday", NAMES, EN)).toBe(
      "This job uses Workday, so the notes on this page apply to it.",
    );
    expect(jobLinkLine({ kind: "system", id: "greenhouse" }, "workday", NAMES, EN)).toBe(
      "This job uses Greenhouse, not Workday. Its own guide has the notes for it.",
    );
    expect(jobLinkLine({ kind: "unknown" }, "workday", NAMES, EN)).toMatch(/^I can't tell/);
  });

  it("keeps Otto to 18 words or fewer for every system", () => {
    for (const guide of Object.keys(NAMES) as HiringSystemId[]) {
      for (const read of reads) {
        const line = jobLinkLine(read, guide, NAMES, EN);
        expect(line.split(/\s+/).length, line).toBeLessThanOrEqual(18);
      }
    }
  });
});
