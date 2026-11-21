import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReplaceOffer } from "@/components/account/upgrade-dialog";
import type { MeResponse } from "@/lib/api/types";
import type { SessionUser } from "@/lib/auth/types";
import { emptyResume } from "@/lib/resume/schema";

const mocks = vi.hoisted(() => ({
  me: vi.fn(),
  openUpgradePrompt: vi.fn(),
  openFeaturePrompt: vi.fn(),
}));

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  api: { me: mocks.me },
}));
vi.mock("@/components/account/upgrade-prompt", () => ({
  openUpgradePrompt: mocks.openUpgradePrompt,
  openFeaturePrompt: mocks.openFeaturePrompt,
}));

const FREE_USER: SessionUser = {
  id: "ada",
  email: "ada@example.com",
  plan: "free",
  planInterval: null,
  planRenewsAt: null,
};

// The account answer is kept for the page's life, so each viewer gets fresh modules.
async function studioFor(user: SessionUser | null) {
  vi.resetModules();
  mocks.me.mockResolvedValue({
    ok: true,
    user,
    usage: null,
    period: null,
    billing: { mode: "dodo", offer: { pro: ["month"], max: [] }, trial: true },
    auth: { mode: "supabase" },
  } satisfies MeResponse);
  const [{ openSample }, { roomForResume }, { useStudioStore }] = await Promise.all([
    import("./sample-start"),
    import("@/components/account/pro-tools"),
    import("@/lib/store/resume-store"),
  ]);
  return { openSample, roomForResume, store: useStudioStore };
}

beforeEach(() => {
  mocks.me.mockReset();
  mocks.openUpgradePrompt.mockReset();
});

describe.each([
  ["signed out", null],
  ["on Free", FREE_USER],
] as const)("trying the sample, then uploading a real resume, %s", (_, user) => {
  it("takes the real resume with no paywall, and the sample stays", async () => {
    const { openSample, roomForResume, store } = await studioFor(user);
    const sample = openSample(1_000);
    expect(sample.created).toBe(true);

    expect(await roomForResume()).toBe(true);
    const mine = { ...emptyResume(2_000), source: "import" as const, title: "Ada's resume" };
    store.getState().addResume(mine);
    expect(mocks.openUpgradePrompt).not.toHaveBeenCalled();

    expect(openSample(3_000)).toEqual({ id: sample.id, created: false });
    expect(store.getState().order).toEqual([mine.id, sample.id]);
    expect(mocks.openUpgradePrompt).not.toHaveBeenCalled();
  });

  it("at Free's limit, offers to replace the real resume, never the sample", async () => {
    const { openSample, roomForResume, store } = await studioFor(user);
    const sample = openSample(1_000);
    const mine = { ...emptyResume(2_000), source: "import" as const, title: "Ada's resume" };
    store.getState().addResume(mine);

    const retry = vi.fn();
    expect(await roomForResume(retry)).toBe(false);
    expect(mocks.me).toHaveBeenCalledOnce();
    const offer: ReplaceOffer | undefined = mocks.openUpgradePrompt.mock.calls.at(-1)?.[1];
    expect(mocks.openUpgradePrompt).toHaveBeenCalledWith("resumes", offer);
    expect(offer?.title).toBe("Ada's resume");

    offer?.onReplace();
    expect(retry).toHaveBeenCalledOnce();
    const state = store.getState();
    expect(state.order).toEqual([sample.id]);
    expect(state.trash.map((entry) => entry.resume.id)).toEqual([mine.id]);
    expect(await roomForResume()).toBe(true);
  });
});
