import { describe, expect, it } from "vitest";
import type { Application } from "@/lib/applications/schema";
import { emptyResume } from "@/lib/resume/schema";
import { EN, FORMAT_EN } from "../messages-testing";
import {
  cityLabel,
  moreWithProCopy,
  appliedFor,
  checkedLabel,
  defaultResumeId,
  matchingResumeId,
  matchLead,
  placeLine,
  placeParts,
  postedLabel,
  readsLink,
  skillList,
  splitLead,
  tailoredFor,
  tailorLink,
} from "./view";

const NOW = new Date(2026, 10, 8, 15).getTime();
const DAY = 24 * 60 * 60 * 1_000;

function resume(id: string, updatedAt: number, jobUrl?: string) {
  const base = { ...emptyResume(), id, updatedAt };
  if (!jobUrl) return base;
  return {
    ...base,
    source: "tailored" as const,
    tailor: { baseResumeId: "own", jobTitle: "", company: "", keywords: [], createdAt: 0, jobUrl },
  };
}

describe("Jobs tab helpers", () => {
  it("matches the newest resume of the person's own, not a tailored copy", () => {
    const list = [resume("old", 1), resume("copy", 9, "https://x.com/j/1"), resume("new", 5)];
    expect(defaultResumeId(list)).toBe("new");
    expect(defaultResumeId([resume("copy", 9, "https://x.com/j/1")])).toBe("copy");
    expect(defaultResumeId([])).toBeNull();
  });

  it("keeps the resume picked last time while it's still here", () => {
    const list = [resume("own", 5), resume("other", 1)];
    expect(matchingResumeId(list, "other")).toBe("other");
    expect(matchingResumeId(list, "deleted")).toBe("own");
    expect(matchingResumeId(list, null)).toBe("own");
  });

  it("reads a job id from the ?tailor= link and gives back the address without it", () => {
    const id = "6F9619FF-8B86-4D01-B42D-00C04FC964FF";
    const at = (query: string) => tailorLink(`https://otto.test/dashboard/jobs${query}`);
    expect(at(`?tailor=${id}`)).toEqual({ jobId: id.toLowerCase(), rest: "/dashboard/jobs" });
    expect(at(`?a=1&tailor=${id}&tailor=x#top`)).toEqual({
      jobId: id.toLowerCase(),
      rest: "/dashboard/jobs?a=1#top",
    });
    expect(at("")).toBeNull();
    expect(at("?a=1")).toBeNull();
    for (const bad of ["", "../account", `${id}x`]) {
      expect(at(`?tailor=${encodeURIComponent(bad)}`)).toEqual({
        jobId: null,
        rest: "/dashboard/jobs",
      });
    }
  });

  it("finds a tailored copy and a tracker entry by the job's link", () => {
    const job = { url: "https://jobs.lever.co/acme/1" };
    expect(tailoredFor([resume("copy", 1, "jobs.lever.co/acme/1")], job)?.id).toBe("copy");
    expect(tailoredFor([resume("copy", 1, "https://jobs.lever.co/acme/2")], job)).toBeNull();
    const applied = { id: "a", jobUrl: "https://jobs.lever.co/acme/1" } as Application;
    expect(appliedFor([applied], job)?.id).toBe("a");
    expect(appliedFor([{ ...applied, jobUrl: "" }], job)).toBeNull();
  });

  it("reads board and Jobicy links again, but not Himalayas' or Remote OK's pages", () => {
    expect(readsLink({ source: "ashby" })).toBe(true);
    expect(readsLink({ source: "workable" })).toBe(true);
    expect(readsLink({ source: "jobicy" })).toBe(true);
    expect(readsLink({ source: "himalayas" })).toBe(false);
    expect(readsLink({ source: "remoteok" })).toBe(false);
  });

  it("says when a job was posted and where it is", () => {
    expect(postedLabel(NOW, NOW, EN.jobs, FORMAT_EN)).toBe("Posted today");
    expect(postedLabel(NOW - DAY, NOW, EN.jobs, FORMAT_EN)).toBe("Posted yesterday");
    expect(postedLabel(NOW - 5 * DAY, NOW, EN.jobs, FORMAT_EN)).toBe("Posted 5 days ago");
    expect(postedLabel(new Date(2026, 6, 2).getTime(), NOW, EN.jobs, FORMAT_EN)).toBe(
      "Posted Jul 2",
    );
    expect(postedLabel(NOW, 0, EN.jobs, FORMAT_EN)).toBe("");
    expect(
      placeLine({ location: "Berlin", remote: true, employmentType: "contract" }, EN.jobs),
    ).toBe("Remote · Berlin · Contract");
    expect(
      placeLine({ location: "Remote - Germany", remote: true, employmentType: null }, EN.jobs),
    ).toBe("Remote - Germany");
    expect(
      placeLine(
        {
          location: "Remote UK",
          remote: true,
          employmentType: "full_time",
          otherPlaces: ["Remote Canada", "Berlin"],
          morePlaces: 2,
        },
        EN.jobs,
      ),
    ).toBe("Remote UK, Remote Canada, Berlin (+2) · Full-time");
    expect(checkedLabel(NOW - 3 * 60 * 60 * 1_000, NOW, EN.jobs, FORMAT_EN)).toBe("3 hours ago");
    expect(checkedLabel(null, NOW, EN.jobs, FORMAT_EN)).toBeNull();
  });
});

describe("moreWithProCopy", () => {
  it("says how many matches Free isn't seeing, and what Pro adds, with real numbers", () => {
    expect(moreWithProCopy(5, 1_243, 27_828, EN.jobs, FORMAT_EN)).toEqual({
      title: "Your top 5 of 1,243 matches",
      body: "Pro shows every match from 27,000+ open jobs, and narrows them by remote, level, posting date and where each job can hire.",
    });
    expect(moreWithProCopy(3, 3, 19_325, EN.jobs, FORMAT_EN).title).toBe("Your 3 matches so far");
    expect(moreWithProCopy(1, 1, 19_325, EN.jobs, FORMAT_EN).title).toBe("Your match so far");
  });
});

describe("job card copy", () => {
  it("leads with the kind-of-work sentence only when no skills were found", () => {
    const reason = "The same occupation as yours: Web designer. Not found: Go, Rust.";
    expect(matchLead({ found: [], missing: ["Go", "Rust"], reason })).toBe(
      "The same occupation as yours: Web designer.",
    );
    expect(
      matchLead({ found: ["Figma"], missing: [], reason: "Found in your resume: Figma." }),
    ).toBeNull();
    expect(
      matchLead({
        found: [],
        missing: [],
        reason: "Like an earlier role on your resume. The post names no tools to compare.",
      }),
    ).toBe("Like an earlier role on your resume. The post names no tools to compare.");
  });

  it("caps skill chips and counts the rest", () => {
    expect(skillList(["a", "b", "c", "d"], 3)).toEqual({ shown: ["a", "b", "c"], more: 1 });
    expect(skillList(["a"], 3)).toEqual({ shown: ["a"], more: 0 });
  });

  it("splits Otto's line after its first sentence", () => {
    expect(splitLead("I found 1,114 jobs that match your resume. 4 look strong.")).toEqual({
      lead: "I found 1,114 jobs that match your resume.",
      rest: "4 look strong.",
    });
    expect(splitLead("Nothing saved yet")).toEqual({ lead: "Nothing saved yet", rest: "" });
    expect(
      placeParts({ location: "Berlin", remote: true, employmentType: "contract" }, EN.jobs),
    ).toEqual(["Remote", "Berlin", "Contract"]);
  });
});

describe("cityLabel", () => {
  it("names a US city by its state and any other by its country, in the reader's words", () => {
    expect(cityLabel({ name: "Austin", country: "US", admin: "TX" })).toBe("Austin, TX");
    expect(cityLabel({ name: "Berlin", country: "DE", admin: "16" })).toBe("Berlin, Germany");
    expect(cityLabel({ name: "Berlin", country: "DE", admin: "16" }, (code) => `<${code}>`)).toBe(
      "Berlin, <DE>",
    );
  });
});
