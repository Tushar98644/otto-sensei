import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UsageSnapshot } from "@/config/plans";
import type { TailorResult } from "@/lib/ai/types";
import type { TailorResponse } from "@/lib/api/types";
import { emptyResume } from "@/lib/resume/schema";

const mocks = vi.hoisted(() => ({ tailor: vi.fn(), patchMe: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ api: { tailor: mocks.tailor } }));
vi.mock("@/components/account/use-me", () => ({ patchMe: mocks.patchMe }));

const { loadDraft, loadResult, saveTailorSession } = await import("./session");
const { forgetTailorTask, startTailorTask, tailorTaskFor } = await import("./tailor-task");

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
}

const result: TailorResult = {
  job: { title: "Designer", company: "Canva" },
  requirements: [],
  keywords: [],
  askUser: [],
  bulletOrder: [],
  summary: "",
  notes: [],
};
const usage = {} as UsageSnapshot;
const source = { ...emptyResume(5_000), id: "resume-1" };
const job = { title: "Designer", company: "Canva", text: "The post as it was sent." };

beforeEach(() => {
  vi.stubGlobal("window", { sessionStorage: memoryStorage(), addEventListener: () => {} });
  mocks.tailor.mockReset();
  mocks.patchMe.mockReset();
});

afterEach(() => {
  const task = tailorTaskFor(source.id);
  if (task) forgetTailorTask(source.id, task);
  vi.unstubAllGlobals();
});

describe("a tailor run", () => {
  it("keeps a result that lands after the step was left, and a remount adopts the same run", async () => {
    const reply = Promise.withResolvers<TailorResponse>();
    mocks.tailor.mockReturnValueOnce(reply.promise);
    const task = startTailorTask(source, job);
    expect(tailorTaskFor(source.id)).toBe(task);
    expect(startTailorTask(source, job)).toBe(task);
    expect(mocks.tailor).toHaveBeenCalledTimes(1);

    const typedSince = { ...job, text: "Edited while Otto worked." };
    saveTailorSession(typedSince, null);
    reply.resolve({ ok: true, result, usage, demo: false });
    const saved = await task.promise;

    expect(saved).toMatchObject({ sourceId: source.id, sourceUpdatedAt: 5_000, job, result });
    expect(task.done).toBe(saved);
    const kept = { ...saved, demo: undefined };
    expect(loadResult(source.id)).toEqual(kept);
    expect(loadDraft()).toEqual(typedSince);
    expect(mocks.patchMe).toHaveBeenCalledWith({ usage });

    forgetTailorTask(source.id, task);
    expect(tailorTaskFor(source.id)).toBeNull();
    expect(loadResult(source.id)).toEqual(kept);
  });

  it("forgets a failed run, so trying again sends a new one", async () => {
    mocks.tailor.mockRejectedValueOnce(new Error("offline"));
    const failed = startTailorTask(source, job);
    await expect(failed.promise).rejects.toThrow("offline");
    expect(tailorTaskFor(source.id)).toBeNull();
    expect(loadResult(source.id)).toBeNull();

    mocks.tailor.mockResolvedValueOnce({ ok: true, result, usage, demo: true });
    const retry = startTailorTask(source, job);
    expect(retry).not.toBe(failed);
    expect((await retry.promise).demo).toBe(true);
    expect(mocks.tailor).toHaveBeenCalledTimes(2);
  });
});
