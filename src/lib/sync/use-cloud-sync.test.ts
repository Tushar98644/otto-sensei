import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyResume } from "@/lib/resume/schema";

const api = vi.hoisted(() => ({
  listResumes: vi.fn(),
  logout: vi.fn(async () => ({ ok: true })),
  putResume: vi.fn(),
  deleteResume: vi.fn(),
}));

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  api,
}));
vi.mock("@/components/account/use-me", () => ({
  refreshMe: vi.fn(async () => {}),
  signedInUserId: () => null,
  useMe: () => ({ me: null, user: null, loading: false, refresh: vi.fn() }),
}));
vi.mock("@/components/ui/toast", () => ({ toast: vi.fn() }));
vi.mock("@/lib/analytics/client", () => ({ resetUser: vi.fn() }));

function browser() {
  const values = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
  vi.stubGlobal("window", {
    localStorage,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  return { values, localStorage };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("signOutAndRelease", () => {
  it("saves the release at once, so the next person on this computer finds the resumes gone", async () => {
    const { values, localStorage } = browser();
    vi.resetModules();
    const { useStudioStore } = await import("@/lib/store/resume-store");
    const { createLedger } = await import("./ledger");
    const { signOutAndRelease } = await import("./use-cloud-sync");
    await useStudioStore.persist.rehydrate();
    const backedUp = { ...emptyResume(1_000), title: "Backed up" };
    const edited = { ...emptyResume(2_000), title: "Edited since the backup" };
    const trashed = { ...emptyResume(1_000), title: "In the trash" };
    for (const resume of [backedUp, edited, trashed]) useStudioStore.getState().addResume(resume);
    useStudioStore.getState().trashResume(trashed.id);
    createLedger(localStorage).claim([backedUp.id, edited.id], "user-1");
    api.listResumes.mockResolvedValueOnce({
      ok: true,
      resumes: [{ ...edited, updatedAt: 1_500 }],
      unchanged: [backedUp.id],
      deletedIds: [],
    });

    expect(await signOutAndRelease("user-1")).toEqual({ kept: 1 });

    expect(api.listResumes).toHaveBeenCalledWith({ [backedUp.id]: 1_000, [edited.id]: 2_000 });
    const saved = JSON.parse(values.get("otto-studio-v1")!) as {
      state: { resumes: Record<string, unknown>; trash: unknown[] };
    };
    expect(Object.keys(saved.state.resumes)).toEqual([edited.id]);
    expect(saved.state.trash).toEqual([]);
  });
});

describe("listEarly", () => {
  async function studioWith(owners: (string | undefined)[]) {
    const { localStorage } = browser();
    vi.resetModules();
    const { useStudioStore } = await import("@/lib/store/resume-store");
    const { createLedger } = await import("./ledger");
    const { listEarly } = await import("./use-cloud-sync");
    await useStudioStore.persist.rehydrate();
    const ledger = createLedger(localStorage);
    const resumes = owners.map((owner, i) => {
      const resume = { ...emptyResume(1_000 + i), title: `CV ${i}` };
      useStudioStore.getState().addResume(resume);
      if (owner) ledger.claim([resume.id], owner);
      return resume;
    });
    return { resumes, listEarly };
  }

  it("asks for the one account this browser backed up, alongside /api/me", async () => {
    api.listResumes.mockReset().mockResolvedValue({ ok: true, resumes: [], deletedIds: [] });
    const { resumes, listEarly } = await studioWith(["user-1", undefined]);
    listEarly();
    listEarly();
    expect(api.listResumes).toHaveBeenCalledExactlyOnceWith({
      [resumes[0]!.id]: 1_000,
      [resumes[1]!.id]: 1_001,
    });
  });

  it("asks for nothing when no account, or more than one, backed up from here", async () => {
    api.listResumes.mockReset().mockResolvedValue({ ok: true, resumes: [], deletedIds: [] });
    (await studioWith([undefined])).listEarly();
    (await studioWith(["user-1", "user-2"])).listEarly();
    expect(api.listResumes).not.toHaveBeenCalled();
  });
});
