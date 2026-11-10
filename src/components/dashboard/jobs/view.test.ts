import { describe, expect, it } from "vitest";
import type { Application } from "@/lib/applications/schema";
import { emptyResume } from "@/lib/resume/schema";
import {
  moreWithProCopy,
  appliedFor,
  checkedLabel,
  defaultResumeId,
  placeLine,
  postedLabel,
  readsLink,
  tailoredFor,
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
    expect(postedLabel(NOW, NOW)).toBe("Posted today");
    expect(postedLabel(NOW - DAY, NOW)).toBe("Posted yesterday");
    expect(postedLabel(NOW - 5 * DAY, NOW)).toBe("Posted 5 days ago");
    expect(postedLabel(new Date(2026, 6, 2).getTime(), NOW)).toBe("Posted Jul 2");
    expect(postedLabel(NOW, 0)).toBe("");
    expect(placeLine({ location: "Berlin", remote: true, employmentType: "contract" })).toBe(
      "Remote · Berlin · Contract",
    );
    expect(placeLine({ location: "Remote - Germany", remote: true, employmentType: null })).toBe(
      "Remote - Germany",
    );
    expect(
      placeLine({
        location: "Remote UK",
        remote: true,
        employmentType: "full_time",
        otherPlaces: ["Remote Canada", "Berlin"],
        morePlaces: 2,
      }),
    ).toBe("Remote UK, Remote Canada, Berlin (+2) · Full-time");
    expect(checkedLabel(NOW - 3 * 60 * 60 * 1_000, NOW)).toBe("3 hours ago");
    expect(checkedLabel(null, NOW)).toBeNull();
  });
});

describe("moreWithProCopy", () => {
  it("says how many matches Free isn't seeing, and what Pro adds, with real numbers", () => {
    expect(moreWithProCopy(5, 1_243, 27_828)).toEqual({
      title: "Your top 5 of 1,243 matches",
      body: "Pro shows every match from 27,000+ open jobs, and narrows them by remote, level, posting date and where each job can hire.",
    });
    expect(moreWithProCopy(3, 3, 19_325).title).toBe("Your 3 matches so far");
    expect(moreWithProCopy(1, 1, 19_325).title).toBe("Your match so far");
  });
});
