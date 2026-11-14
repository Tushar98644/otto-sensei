import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/lib/auth/types";
import { emptyWorkProfile } from "@/lib/eligibility/profile";
import { createSampleResume } from "@/lib/resume/sample";
import { useStudioStore } from "@/lib/store/resume-store";

vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-query")>()),
  isServer: false,
}));
const api = vi.hoisted(() => ({
  listApplications: vi.fn(async () => ({ ok: true, applications: [], nextCursor: null })),
  savedJobs: vi.fn(async () => ({ ok: true, jobs: [] })),
  writings: vi.fn(async () => ({ ok: true, writings: [], total: 0 })),
  reminderSettings: vi.fn(async () => ({
    ok: true,
    emailAvailable: false,
    chosen: false,
    emailReminders: false,
    followUpDays: 7,
  })),
  shares: vi.fn(async () => ({ ok: true, links: [] })),
  interviewPacks: vi.fn(async () => ({ ok: true, packs: [] })),
  portfolio: vi.fn(async () => ({ ok: true, portfolio: null })),
  workProfile: vi.fn(async () => ({
    ok: true,
    profile: emptyWorkProfile(),
    updatedAt: null,
    lookingFor: null,
  })),
  jobMatches: vi.fn(async () => ({ ok: true, jobs: [], requestId: null, resumeHash: null })),
}));
vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  api,
}));
vi.mock("@/components/account/use-me", () => ({
  signedInUserId: () => "ada",
  subscribeToMe: () => () => {},
}));

const { getQueryClient } = await import("@/lib/queries/client");
const { prefetchPageData } = await import("./prefetch");

const user = (plan: SessionUser["plan"]) =>
  ({ id: "ada", email: "ada@example.com", plan }) as SessionUser;
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  getQueryClient().clear();
  vi.clearAllMocks();
  useStudioStore.getState().clearAll();
});

describe("prefetchPageData", () => {
  it("asks for a page's data once, and not again while it's fresh", async () => {
    prefetchPageData("/dashboard/applications", user("pro"));
    await settle();
    for (const call of [api.listApplications, api.savedJobs, api.writings, api.reminderSettings]) {
      expect(call).toHaveBeenCalledTimes(1);
    }

    prefetchPageData("/dashboard/applications", user("pro"));
    prefetchPageData("/dashboard/letters", user("pro"));
    await settle();
    expect(api.listApplications).toHaveBeenCalledTimes(1);
    expect(api.writings).toHaveBeenCalledTimes(1);
  });

  it("leaves out what the plan doesn't show, and pages with nothing to load", async () => {
    prefetchPageData("/dashboard/applications", user("free"));
    prefetchPageData("/dashboard/formats", user("free"));
    prefetchPageData("/dashboard/trash", user("free"));
    await settle();
    expect(api.reminderSettings).not.toHaveBeenCalled();
    expect(api.listApplications).toHaveBeenCalledTimes(1);
  });

  it("does nothing before the account is known", async () => {
    prefetchPageData("/dashboard/resumes", null);
    await settle();
    expect(api.shares).not.toHaveBeenCalled();
    prefetchPageData("/dashboard/resumes", user("pro"));
    prefetchPageData("/dashboard/interview", user("pro"));
    prefetchPageData("/dashboard/portfolio", user("pro"));
    await settle();
    expect(api.shares).toHaveBeenCalledTimes(1);
    expect(api.interviewPacks).toHaveBeenCalledTimes(1);
    expect(api.portfolio).toHaveBeenCalledTimes(1);
  });

  it("asks for Jobs' matches as a prefetch once the work profile is in, not after applications", async () => {
    api.listApplications.mockImplementationOnce(() => new Promise<never>(() => {}));
    useStudioStore.getState().addResume(createSampleResume(Date.now()));
    prefetchPageData("/dashboard/jobs", user("pro"));
    await vi.waitFor(() => expect(api.jobMatches).toHaveBeenCalledTimes(1));
    expect(api.jobMatches.mock.calls[0]?.at(-1)).toEqual({ prefetch: true });
    expect(api.workProfile).toHaveBeenCalledTimes(1);
    expect(api.listApplications).toHaveBeenCalledTimes(1);
  });
});
