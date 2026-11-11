import { beforeEach, describe, expect, it, vi } from "vitest";
import type { JobMatchesResponse } from "@/lib/api/types";
import { deviceTimeZone } from "@/lib/eligibility/options";
import { emptyWorkProfile } from "@/lib/eligibility/profile";
import { lookingForOf } from "@/lib/job-feed/looking-for";
import { matchProfileOf } from "@/lib/job-feed/profile";
import { DEFAULT_FILTERS, NO_CHOICE } from "@/lib/job-feed/types";
import { queryKeys } from "@/lib/queries/keys";
import { createSampleResume } from "@/lib/resume/sample";

vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-query")>()),
  isServer: false,
}));
vi.mock("@/components/account/use-me", () => ({
  signedInUserId: () => "ada",
  subscribeToMe: () => () => {},
}));

const { getQueryClient } = await import("@/lib/queries/client");
const { openingMatchesRequest, patchJobMatches } = await import("./use-job-matches");

const DAY_MS = 24 * 60 * 60 * 1_000;
const NOW = Date.UTC(2026, 10, 11, 15, 30);

function answer(savedCount: number): JobMatchesResponse {
  return {
    ok: true,
    jobs: [],
    page: 1,
    pageSize: 20,
    total: 0,
    matching: 0,
    capped: false,
    strong: 0,
    newToday: 0,
    savedCount,
    openJobs: 0,
    checkedAt: null,
    profileReady: false,
    lookingFor: null,
    variant: "v1",
  } as unknown as JobMatchesResponse;
}

beforeEach(() => {
  getQueryClient().clear();
});

describe("openingMatchesRequest", () => {
  it("asks for the first Matches page the way the Jobs tab opens it", () => {
    const resume = createSampleResume(NOW);
    const profile = { ...emptyWorkProfile(), remoteOnly: true };
    const body = openingMatchesRequest(resume, { profile, lookingFor: NO_CHOICE }, NOW);
    // The tab counts years to the start of today, so the request is the same all day.
    const match = matchProfileOf(resume, Math.floor(NOW / DAY_MS) * DAY_MS);
    expect(body).toEqual({
      view: "matches",
      profile: match,
      filters: { ...DEFAULT_FILTERS, remote: true },
      page: 1,
      lookingFor: lookingForOf(match, profile, NO_CHOICE),
      deviceTimeZone: deviceTimeZone(),
    });
    expect(openingMatchesRequest(resume, { profile, lookingFor: NO_CHOICE }, NOW + 60_000)).toEqual(
      body,
    );
  });

  it("asks nothing without a resume", () => {
    expect(
      openingMatchesRequest(null, { profile: emptyWorkProfile(), lookingFor: NO_CHOICE }, NOW),
    ).toBeNull();
  });
});

describe("patchJobMatches", () => {
  it("changes the answer on screen and drops the others, whose counts are now wrong", () => {
    const client = getQueryClient();
    const resume = createSampleResume(NOW);
    const work = { profile: emptyWorkProfile(), lookingFor: NO_CHOICE };
    const matches = openingMatchesRequest(resume, work, NOW)!;
    const saved = { ...matches, view: "saved" as const };
    const shownKey = queryKeys.jobMatches("ada", matches, work.profile);
    const otherKey = queryKeys.jobMatches("ada", saved, work.profile);
    client.setQueryData(shownKey, answer(2));
    client.setQueryData(otherKey, answer(2));

    patchJobMatches(shownKey, (data) => ({ ...data, savedCount: 3 }));

    expect(client.getQueryData<JobMatchesResponse>(shownKey)?.savedCount).toBe(3);
    expect(client.getQueryData(otherKey)).toBeUndefined();
  });
});
