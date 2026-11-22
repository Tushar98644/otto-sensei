import { describe, expect, it } from "vitest";
import { FeedShapeError } from "./shared";
import {
  countryFacet,
  isTargetCountry,
  parseWorkdayJob,
  parseWorkdayList,
  workdayBoard,
  workdayJobUrl,
  workdayListingJob,
  workdayListUrl,
  workdayPostedAt,
} from "./workday";
import {
  WORKDAY_JOB_ISRAEL,
  WORKDAY_JOB_UK,
  WORKDAY_LIST,
  WORKDAY_TARGET_NEXT,
  WORKDAY_TARGET_PAGE,
} from "../test-fixtures";

const READ_AT = Date.UTC(2026, 10, 22, 6);
const DAY = 24 * 60 * 60 * 1_000;
const NVIDIA = workdayBoard("nvidia.wd5/NVIDIAExternalCareerSite");

describe("workdayBoard", () => {
  it("reads the tenant, host and site from a seed token", () => {
    expect(NVIDIA).toEqual({
      tenant: "nvidia",
      host: "nvidia.wd5.myworkdayjobs.com",
      site: "NVIDIAExternalCareerSite",
    });
    expect(workdayListUrl(NVIDIA).toString()).toBe(
      "https://nvidia.wd5.myworkdayjobs.com/wday/cxs/nvidia/NVIDIAExternalCareerSite/jobs",
    );
    expect(workdayJobUrl(NVIDIA, "/job/UK-Remote/X_JR1").toString()).toBe(
      "https://nvidia.wd5.myworkdayjobs.com/wday/cxs/nvidia/NVIDIAExternalCareerSite/job/UK-Remote/X_JR1",
    );
  });

  it("refuses a token that could point anywhere else", () => {
    for (const token of [
      "nvidia/NVIDIAExternalCareerSite",
      "nvidia.wd5.evil.com/site",
      "nvidia.wd5/site/../x",
      "nvi dia.wd5/site",
      "nvidia.wdx/site",
    ])
      expect(() => workdayBoard(token)).toThrow(FeedShapeError);
  });
});

describe("parseWorkdayList", () => {
  it("keeps postings with a title and path, and finds the country facet among nested ones", () => {
    const page = parseWorkdayList(WORKDAY_LIST);
    expect(page.total).toBe(2000);
    expect(page.listings).toEqual([
      {
        title: "DevOps and Automation Engineer – ICPE",
        externalPath: "/job/Israel-Yokneam/DevOps-and-Automation-Engineer---ICPE_JR2025436-1",
        locationsText: "Israel, Yokneam",
        postedOn: "Posted Today",
      },
    ]);
    const countries = countryFacet(page.facets);
    expect(countries?.parameter).toBe("locationHierarchy1");
    expect(countries?.values.map((value) => value.code)).toEqual(["BR", "IN", "IL", "GB", "US"]);
    expect(
      countries?.values.filter((value) => isTargetCountry(value.code)).map((v) => v.code),
    ).toEqual(["BR", "GB", "US"]);
  });

  it("falls back to a site list whose values name their country", () => {
    const countries = countryFacet([
      {
        parameter: "locations",
        values: [
          { id: "a", name: "US, Oregon, Hillsboro", count: 40 },
          { id: "b", name: "Costa Rica, San Jose", count: 9 },
          { id: "c", name: "Bangalore, India", count: 12 },
          { id: "d", name: "Remote", count: 3 },
        ],
      },
    ]);
    expect(countries).toEqual({
      parameter: "locations",
      values: [
        { id: "a", code: "US", count: 40 },
        { id: "b", code: "CR", count: 9 },
        { id: "c", code: "IN", count: 12 },
      ],
    });
  });

  it("finds no country facet when a site has none", () => {
    expect(countryFacet(parseWorkdayList(WORKDAY_TARGET_PAGE).facets)).toBeNull();
  });

  it("refuses an answer that isn't a job search", () => {
    expect(() => parseWorkdayList({ errorCode: "HTTP_422" })).toThrow(FeedShapeError);
  });
});

describe("workdayPostedAt", () => {
  it("turns Workday's relative days into a time before the read", () => {
    expect(workdayPostedAt("Posted Today", READ_AT)).toBe(READ_AT);
    expect(workdayPostedAt("Posted Yesterday", READ_AT)).toBe(READ_AT - DAY);
    expect(workdayPostedAt("Posted 6 Days Ago", READ_AT)).toBe(READ_AT - 6 * DAY);
    expect(workdayPostedAt("Posted 30+ Days Ago", READ_AT)).toBe(READ_AT - 31 * DAY);
    expect(workdayPostedAt("", READ_AT)).toBeNull();
  });
});

describe("parseWorkdayJob", () => {
  const [uk, us] = parseWorkdayList(WORKDAY_TARGET_PAGE).listings;
  const [israel] = parseWorkdayList(WORKDAY_TARGET_NEXT).listings;

  it("reads the post, its exact start date, place and type, linked on the career site", () => {
    const job = parseWorkdayJob(WORKDAY_JOB_UK, NVIDIA, uk!, "NVIDIA", READ_AT);
    expect(job).toMatchObject({
      externalId:
        "nvidia/NVIDIAExternalCareerSite/job/UK-Remote/AI-Natives-Sales-Account-Manager---UK_JR2024148",
      company: "NVIDIA",
      title: "AI Natives Sales Account Manager - UK",
      location: "UK, Remote",
      remote: true,
      employmentType: "full_time",
      postedAt: Date.parse("2026-11-20"),
      validThrough: null,
      url: "https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite/job/UK-Remote/AI-Natives-Sales-Account-Manager---UK_JR2024148",
    });
    expect(job!.text).toContain(
      "- Build account plans in Salesforce and forecast quarterly revenue.",
    );
    expect(job!.listingOnly).toBeUndefined();
  });

  it("names the country when the place leaves it out, and lists every location", () => {
    const job = parseWorkdayJob(WORKDAY_JOB_ISRAEL, NVIDIA, israel!, "NVIDIA", READ_AT);
    expect(job).toMatchObject({
      location: "Hof HaCarmel Campus, Israel · Israel, Raanana · Israel, Yokneam",
      remote: false,
      postedAt: Date.parse("2026-11-21"),
    });
  });

  it("hashes the same for the post and its list entry, so an unchanged job isn't read again", () => {
    const listed = workdayListingJob(NVIDIA, uk!, "NVIDIA", READ_AT)!;
    const read = parseWorkdayJob(WORKDAY_JOB_UK, NVIDIA, uk!, "NVIDIA", READ_AT)!;
    expect(listed).toMatchObject({ externalId: read.externalId, listingOnly: true, text: "" });
    expect(listed.hashKey).toBe(read.hashKey);
    expect(workdayListingJob(NVIDIA, us!, "NVIDIA", READ_AT)!.postedAt).toBe(READ_AT - 31 * DAY);
  });

  it("drops a post that no longer takes applications", () => {
    const closed = {
      ...WORKDAY_JOB_UK,
      jobPostingInfo: { ...WORKDAY_JOB_UK.jobPostingInfo, canApply: false },
    };
    expect(parseWorkdayJob(closed, NVIDIA, uk!, "NVIDIA", READ_AT)).toBeNull();
  });
});
