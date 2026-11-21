import { beforeEach, describe, expect, it, vi } from "vitest";
import type { JobMatchesResponse, MatchedJob } from "@/lib/api/types";
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
const api = vi.hoisted(() => ({
  jobMatches: vi.fn(),
  jobImpressions: vi.fn(async () => ({ ok: true })),
}));
vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  api,
}));

const { getQueryClient } = await import("@/lib/queries/client");
const { noteShown, openingMatchesRequest, pageFilters, patchJobMatches, prefetchedMatches } =
  await import("./use-job-matches");

const DAY_MS = 24 * 60 * 60 * 1_000;
const NOW = Date.UTC(2026, 10, 11, 15, 30);
const REQUEST_ID = "6f9619ff-8b86-4d01-b42d-00c04fc964ff";

function job(id: string, position: number, saved = false): MatchedJob {
  return {
    id,
    position,
    saved,
    match: { label: "good", found: [], missing: [], reason: "", notes: [], blocked: false },
  } as unknown as MatchedJob;
}

function answer(savedCount: number, jobs: MatchedJob[] = []): JobMatchesResponse {
  return {
    ok: true,
    jobs,
    page: 1,
    pageSize: 20,
    total: jobs.length,
    matching: jobs.length,
    capped: false,
    strong: 0,
    newToday: 0,
    savedCount,
    openJobs: 0,
    checkedAt: null,
    profileReady: false,
    lookingFor: null,
    variant: "v1",
    requestId: null,
    resumeHash: null,
  } as unknown as JobMatchesResponse;
}

beforeEach(() => {
  getQueryClient().clear();
  vi.clearAllMocks();
});

describe("openingMatchesRequest", () => {
  it("asks for the first Matches page the way the Jobs tab opens it", () => {
    const resume = createSampleResume(NOW);
    const profile = { ...emptyWorkProfile(), remoteOnly: true };
    const body = openingMatchesRequest(resume, { profile, lookingFor: NO_CHOICE }, NOW);
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

  it("opens with the filters remembered from the last visit, as the page asks for them", () => {
    const resume = createSampleResume(NOW);
    const memory = { q: "react", postedWithin: 7, eligibleOnly: true, resumeId: null } as const;
    const blank = { profile: emptyWorkProfile(), lookingFor: NO_CHOICE };
    expect(openingMatchesRequest(resume, blank, NOW, memory)?.filters).toEqual({
      ...DEFAULT_FILTERS,
      q: "react",
      postedWithin: 7,
    });
    const started = { ...blank, profile: { ...emptyWorkProfile(), country: "DE" } };
    const body = openingMatchesRequest(resume, started, NOW, memory);
    expect(body?.filters).toEqual(pageFilters(memory, started.profile));
    expect(body?.filters?.eligibleOnly).toBe(true);
  });

  it("asks nothing without a resume", () => {
    expect(
      openingMatchesRequest(null, { profile: emptyWorkProfile(), lookingFor: NO_CHOICE }, NOW),
    ).toBeNull();
  });
});

describe("patchJobMatches", () => {
  const work = { profile: emptyWorkProfile(), lookingFor: NO_CHOICE };
  const keys = () => {
    const matches = openingMatchesRequest(createSampleResume(NOW), work, NOW)!;
    return {
      shown: queryKeys.jobMatches("ada", matches, work.profile),
      page2: queryKeys.jobMatches("ada", { ...matches, page: 2 }, work.profile),
      saved: queryKeys.jobMatches("ada", { ...matches, view: "saved" }, work.profile),
    };
  };

  it("changes the answer on screen, flips the job in other Matches pages, and drops Saved", () => {
    const client = getQueryClient();
    const key = keys();
    client.setQueryData(key.shown, answer(2, [job("a", 1), job("b", 2)]));
    client.setQueryData(key.page2, answer(2, [job("b", 21), job("c", 22)]), { updatedAt: 1_000 });
    client.setQueryData(key.saved, answer(2));

    const mark = { jobId: "b", saved: true, savedCount: 3 };
    patchJobMatches(key.shown, (data) => ({ ...data, savedCount: 3 }), mark);

    expect(client.getQueryData<JobMatchesResponse>(key.shown)?.savedCount).toBe(3);
    const page2 = client.getQueryState<JobMatchesResponse>(key.page2);
    expect(page2?.data?.savedCount).toBe(3);
    expect(page2?.data?.jobs.map((item) => [item.id, item.saved])).toEqual([
      ["b", true],
      ["c", false],
    ]);
    expect(page2?.dataUpdatedAt).toBe(1_000);
    expect(client.getQueryData(key.saved)).toBeUndefined();
  });

  it("puts every list back when the save fails", () => {
    const client = getQueryClient();
    const key = keys();
    const before = answer(2, [job("a", 1)]);
    client.setQueryData(key.shown, before);
    client.setQueryData(key.page2, answer(2, [job("a", 21)]));

    patchJobMatches(key.shown, (data) => ({ ...data, savedCount: 3 }), {
      jobId: "a",
      saved: true,
      savedCount: 3,
    });
    patchJobMatches(key.shown, () => before, { jobId: "a", saved: false, savedCount: 2 });

    expect(client.getQueryData(key.shown)).toEqual(before);
    const page2 = client.getQueryData<JobMatchesResponse>(key.page2);
    expect(page2?.savedCount).toBe(2);
    expect(page2?.jobs[0]?.saved).toBe(false);
  });
});

describe("impressions of a prefetched page", () => {
  const body = () =>
    openingMatchesRequest(
      createSampleResume(NOW),
      { profile: emptyWorkProfile(), lookingFor: NO_CHOICE },
      NOW,
    )!;
  const prefetched = (requestId: string | null) => ({
    ...answer(0, [job("a", 1), job("b", 2)]),
    requestId,
    resumeHash: requestId ? "hash-of-resume" : null,
  });

  it("asks as a prefetch, then logs the page once, when it's shown", async () => {
    api.jobMatches.mockResolvedValueOnce(prefetched(REQUEST_ID));
    const data = await prefetchedMatches(body());
    expect(api.jobMatches).toHaveBeenCalledWith(body(), { prefetch: true });

    noteShown(data);
    noteShown({ ...data, savedCount: 1 });
    expect(api.jobImpressions).toHaveBeenCalledExactlyOnceWith({
      kind: "impressions",
      requestId: REQUEST_ID,
      variant: "v1",
      resumeHash: "hash-of-resume",
      jobs: [
        { jobId: "a", position: 1, label: "good" },
        { jobId: "b", position: 2, label: "good" },
      ],
    });
  });

  it("leaves pages the server already logged, and Saved, alone", () => {
    noteShown(prefetched(REQUEST_ID));
    noteShown(prefetched(null));
    expect(api.jobImpressions).not.toHaveBeenCalled();
  });
});
