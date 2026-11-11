import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyWorkProfile } from "@/lib/eligibility/profile";
import { NO_CHOICE, type LookingForChoice } from "@/lib/job-feed/types";
import { queryKeys } from "@/lib/queries/keys";
import type { WorkProfileData } from "@/lib/queries/options";

vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-query")>()),
  isServer: false,
}));
const api = vi.hoisted(() => ({ saveLookingFor: vi.fn() }));
vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  api,
}));
vi.mock("@/components/account/use-me", () => ({
  signedInUserId: () => "ada",
  subscribeToMe: () => () => {},
}));

const { ApiClientError } = await import("@/lib/api/client");
const { getQueryClient } = await import("@/lib/queries/client");
const { saveLookingForChoice, storeWorkProfile } = await import("./use-work-profile");

const KEY = queryKeys.workProfile("ada");
const START: WorkProfileData = {
  profile: emptyWorkProfile(),
  updatedAt: null,
  lookingFor: NO_CHOICE,
};
const REMOTE: LookingForChoice = { ...NO_CHOICE, remote: true };
const shown = () => getQueryClient().getQueryData<WorkProfileData>(KEY);

beforeEach(() => {
  getQueryClient().clear();
  getQueryClient().setQueryData(KEY, START);
  vi.clearAllMocks();
});

describe("the work profile cache", () => {
  it("shows a Looking for change at once, with its remote choice as the profile's", async () => {
    api.saveLookingFor.mockResolvedValue({ ok: true, choice: REMOTE });
    const saving = saveLookingForChoice("ada", REMOTE);
    expect(shown()?.lookingFor).toEqual(REMOTE);
    expect(shown()?.profile.remoteOnly).toBe(true);
    await saving;
    expect(shown()?.lookingFor).toEqual(REMOTE);
  });

  it("puts the last choice back when the save fails", async () => {
    api.saveLookingFor.mockRejectedValue(new ApiClientError("server_error", "No", 500));
    await expect(saveLookingForChoice("ada", REMOTE)).rejects.toThrow("No");
    expect(shown()).toEqual({ ...START, profile: { ...START.profile, remoteOnly: false } });
  });

  it("keeps the Looking for choice when a saved profile replaces the old one", () => {
    getQueryClient().setQueryData(KEY, { ...START, lookingFor: REMOTE });
    const profile = { ...emptyWorkProfile(), country: "DE" };
    storeWorkProfile("ada", profile, 5);
    expect(shown()).toEqual({ profile, updatedAt: 5, lookingFor: REMOTE });
  });
});
